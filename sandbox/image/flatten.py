#!/usr/bin/env python
"""Parallel version of v86's tools/copy-to-sha256.py --zstd.

Writes every regular file in a tar as <sha256[:10]>.bin.zst, the names
fs2json.py --zstd expects. Existing files are skipped, and new ones are
written under a temporary name and renamed, so an interrupted run never
leaves a truncated file behind.

  flatten.py ROOTFS.tar OUT_DIR [--level N]
"""

import argparse
import hashlib
import os
import tarfile
from compression import zstd
from concurrent.futures import ProcessPoolExecutor, wait, FIRST_COMPLETED

HASH_LENGTH = 10  # keep in sync with fs2json.py
BIG_FILE = 32 * 1024 * 1024


def compress(data: bytes, path: str, level: int):
    options = {zstd.CompressionParameter.compression_level: level}
    # One huge file (libLLVM, rustc) would otherwise hold up the whole run
    if len(data) > BIG_FILE:
        options[zstd.CompressionParameter.nb_workers] = os.cpu_count() or 1
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(tmp, "wb") as f:
        f.write(zstd.compress(data, options=options))
    os.replace(tmp, path)


def main():
    args = argparse.ArgumentParser()
    args.add_argument("tar")
    args.add_argument("out")
    args.add_argument("--level", type=int, default=19)
    args = args.parse_args()

    os.makedirs(args.out, exist_ok=True)
    workers = os.cpu_count() or 1
    pending = set()
    seen = set()
    skipped = 0

    with tarfile.open(args.tar) as tar, ProcessPoolExecutor(workers) as pool:
        # Largest first, so a huge file (libLLVM, rustc) compresses alongside
        # the small ones instead of running alone at the end
        members = [m for m in tar.getmembers() if m.isfile() or m.islnk()]
        members.sort(key=lambda m: m.size, reverse=True)
        for member in members:
            data = tar.extractfile(member).read()
            name = hashlib.sha256(data).hexdigest()[:HASH_LENGTH] + ".bin.zst"
            path = os.path.join(args.out, name)
            if name in seen or os.path.exists(path):
                skipped += 1
                continue
            seen.add(name)
            # Bound the queue so file contents waiting to compress stay in check
            if len(pending) >= workers * 2:
                done, pending = wait(pending, return_when=FIRST_COMPLETED)
                for future in done:
                    future.result()
            pending.add(pool.submit(compress, data, path, args.level))
        for future in pending:
            future.result()

    print(f"Compressed {len(seen)} files at level {args.level}, {skipped} already present")


if __name__ == "__main__":
    main()
