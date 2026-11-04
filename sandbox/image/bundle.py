#!/usr/bin/env python
"""Packs the image's compressed files into a few bundles the page downloads
whole, instead of one request per file (Go alone reads ~900 files).

  bundle.py FS_JSON FLAT_DIR MARKS_DIR TRACE_JSON OUT_DIR

- MARKS_DIR has one list of paths per install step, from bundle-mark
- TRACE_JSON is the order build-state saw files read after restoring the
  snapshot, and which template read each first: [[name, language], ...]

Bundles:
- base: files outside any language that the trace read (bash, sb, libc),
  and libraries one language installed but another read (Ruby reads libgmp,
  which came with C), so a run never pulls in another language's bundle. The
  page downloads it right after boot.
- one per large language, and "rest" for the small ones together. The page
  streams one the first time the VM reads a file in it, or when a file of
  that language is opened.
- misc: everything else (the kernel, modules, docs). Never downloaded whole;
  the page fetches single files from it with range requests.

Each bundle is the files' .bin.zst contents back to back (still a valid .zst), in the order the
trace read them, then by path. OUT_DIR/bundles.json lists each bundle's files
and sizes, and which bundles each template read.
"""

import hashlib
import json
import os
import sys

# Smaller groups share the "rest" bundle, so a small language is one request
# with the others instead of one of its own
MIN_BUNDLE = 8 * 1024 * 1024

# Files the install lists do not cover, mostly what the warm-up wrote
PATH_GROUPS = [
    ("/root/.cache/go-build/", "go"),
    ("/root/go/", "go"),
    ("/root/.config/go/", "go"),
    ("/root/.cache/zig/", "zig"),
    ("/root/.cache/node/", "node"),
    ("/root/.cargo/", "rust"),
    ("/root/.cache/gleam/", "beam"),
    ("/root/.hex/", "beam"),
    ("/root/.mix/", "beam"),
]
# Template directories under /workspace
WORKSPACE_GROUPS = {
    "asm": "c",
    "c": "c",
    "cpp": "c",
    "elixir": "beam",
    "erlang": "beam",
    "gleam": "beam",
}


def walk(entries, parent=""):
    """(path, size, name) for every regular file in an alpine-fs.json tree"""
    for name, size, _mtime, mode, _uid, _gid, target in entries:
        path = f"{parent}/{name}"
        if isinstance(target, list):
            yield from walk(target, path)
        elif mode & 0o170000 == 0o100000:
            yield path, size, target


def group_of(path, marks):
    if path in marks:
        return marks[path]
    for prefix, group in PATH_GROUPS:
        if path.startswith(prefix):
            return group
    if path.startswith("/workspace/"):
        top = path.split("/")[2]
        if top != "README.md":
            return WORKSPACE_GROUPS.get(top, top)
    return "base"


def main():
    fs_json, flat, marks_dir, trace_json, out = sys.argv[1:]

    marks = {}
    for group in sorted(os.listdir(marks_dir)):
        with open(os.path.join(marks_dir, group)) as f:
            for line in f:
                marks.setdefault(line.rstrip("\n"), group)

    with open(trace_json) as f:
        trace = json.load(f)
    order = {}
    for name, _language in trace:
        order.setdefault(name, len(order))

    with open(fs_json) as f:
        root = json.load(f)["fsroot"]

    # Hard links and identical files share one name; the first path decides
    files = {}
    for path, size, name in walk(root):
        if name not in files:
            files[name] = (path, group_of(path, marks))

    # A language's own group is the one most of its reads came from
    reads = {}
    for name, language in trace:
        if language:
            counts = reads.setdefault(language, {})
            group = files[name][1]
            counts[group] = counts.get(group, 0) + 1
    home = {language: max(counts, key=counts.get) for language, counts in reads.items()}
    shared = {
        name
        for name, language in trace
        if language and files[name][1] not in ("base", home[language])
    }

    groups = {}
    for name, (path, group) in files.items():
        if name in shared:
            group = "base"
        elif group == "base" and name not in order:
            group = "misc"
        groups.setdefault(group, []).append(name)

    sizes = {name: os.path.getsize(os.path.join(flat, name)) for name in files}
    for group in list(groups):
        if group in ("base", "misc"):
            continue
        if sum(sizes[name] for name in groups[group]) < MIN_BUNDLE:
            groups.setdefault("rest", []).extend(groups.pop(group))

    os.makedirs(os.path.join(out, "bundles"), exist_ok=True)
    bundles = []
    bundle_of = {}
    unread = len(order)
    for group, names in sorted(groups.items()):
        names.sort(key=lambda name: (order.get(name, unread), files[name][0]))
        digest = hashlib.sha256()
        for name in names:
            digest.update(name.encode())
        # Back-to-back zstd frames are a valid .zst file, and servers leave
        # .zst alone instead of compressing it again on the fly
        url = f"bundles/{group}-{digest.hexdigest()[:10]}.zst"
        path = os.path.join(out, url)
        # Files are named by content hash, so the same names mean the same pack
        if not os.path.exists(path):
            with open(f"{path}.tmp", "wb") as pack:
                for name in names:
                    with open(os.path.join(flat, name), "rb") as f:
                        pack.write(f.read())
            os.replace(f"{path}.tmp", path)
        bundles.append(
            {
                "name": group,
                "url": url,
                "size": sum(sizes[name] for name in names),
                # Without the .bin.zst every name has
                "files": [[name.removesuffix(".bin.zst"), sizes[name]] for name in names],
            }
        )
        for name in names:
            bundle_of[name] = group
        print(f"{group:6} {len(names):6} files {sizes_mb(names, sizes):8.1f} MB")

    # Packs from earlier builds
    current = {os.path.basename(b["url"]) for b in bundles}
    for name in os.listdir(os.path.join(out, "bundles")):
        if name not in current:
            os.remove(os.path.join(out, "bundles", name))

    languages = {}
    for name, language in trace:
        if language and name in bundle_of:
            touched = languages.setdefault(language, [])
            if bundle_of[name] not in touched and bundle_of[name] not in ("base", "misc"):
                touched.append(bundle_of[name])

    with open(os.path.join(out, "bundles.json.tmp"), "w") as f:
        json.dump({"bundles": bundles, "languages": languages}, f, separators=(",", ":"))
    os.replace(os.path.join(out, "bundles.json.tmp"), os.path.join(out, "bundles.json"))
    print(f"Languages: {json.dumps(languages)}")


def sizes_mb(names, sizes):
    return sum(sizes[name] for name in names) / 1e6


if __name__ == "__main__":
    main()
