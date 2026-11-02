// Boots the image headless, runs every template twice (to check it works and
// to warm build caches), then saves the site's public/sandbox/v86/alpine-state.bin.zst.
// Based on v86's tools/docker/alpine/build-state.js.
//
//   npm run sandbox:state [-- --verbose]

import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { V86 } from "v86";
import { LANGUAGES } from "../../src/sandbox/languages.ts";
import { vmOptions } from "../../src/sandbox/vm-options.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
const assets = `${root}public/sandbox/v86/`;
const out = `${assets}alpine-state.bin`;
const verbose = process.argv.includes("--verbose");

const vm = new V86({
  ...vmOptions(assets),
  wasm_path: `${root}node_modules/v86/build/v86.wasm`,
});

let tail = "";
let output = "";
let waiter: { until: RegExp; resolve: () => void } | undefined;

vm.add_listener("serial0-output-byte", (byte) => {
  const c = String.fromCharCode(byte);
  if (verbose) process.stdout.write(c);
  output += c;
  tail = (tail + c).slice(-256);
  if (waiter?.until.test(tail.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ""))) {
    const { resolve } = waiter;
    waiter = undefined;
    resolve();
  }
});

const PROMPT = /\/\S* [#$] $/;

function waitFor(until: RegExp): Promise<void> {
  return new Promise((resolve) => (waiter = { until, resolve }));
}

let commands = 0;

/**
 * Runs a shell command and waits for it to finish. The shell can print more
 * than one prompt (getty prints a second one after boot), so a bare prompt
 * match could resolve on an earlier one. Wait for a marker the command prints
 * instead: the echoed command line has `$((n+0))`, not the expanded number.
 */
async function run(line: string): Promise<{ ms: number; output: string }> {
  const n = ++commands;
  const done = waitFor(new RegExp(`@@done ${n}@@[\\s\\S]*${PROMPT.source}`));
  output = "";
  const t0 = performance.now();
  vm.serial0_send(`${line}; echo "@@done $((${n}+0))@@"\n`);
  await done;
  return { ms: performance.now() - t0, output };
}

const t0 = performance.now();
console.log("Booting…");
await waitFor(PROMPT);
console.log(`Prompt after ${((performance.now() - t0) / 1000).toFixed(1)}s\n`);

for (const lang of LANGUAGES) {
  for (const attempt of ["first", "second"]) {
    const { ms, output } = await run(`cd /workspace/${lang.dir} && sb run`);
    // The guest-side timing line printed by `sb run`
    const result = output.match(/\[exit (\d+) in ([\d.]+)s/);
    console.log(
      `${lang.id.padEnd(5)} ${attempt.padEnd(6)} exit=${result?.[1] ?? "?"} guest=${result?.[2] ?? "?"}s wall=${(ms / 1000).toFixed(1)}s`
    );
    if (result?.[1] !== "0" && !verbose) console.log(output);
  }
}

// Zig's compiler_rt from the image build is not a cache hit inside the VM, so
// a solution's first build would spend minutes on it. Build it here, with a
// loose file like a solution, so the snapshot keeps it.
{
  const { ms } = await run(
    "cp /workspace/zig/src/main.zig /tmp/warm.zig && sb run '' '' '' /tmp/warm.zig; rm -rf /tmp/warm.zig /tmp/sb-bin"
  );
  console.log(`zig   loose  wall=${(ms / 1000).toFixed(1)}s`);
}

// Free the page cache, then overwrite free memory with zeros so the snapshot
// compresses well (freed pages keep their old contents). Fill a tmpfs to all
// but 64 MB of available memory and delete it. Leave the shell at /workspace
// for the page to pick up.
await run(
  [
    "cd /workspace && sync && echo 3 > /proc/sys/vm/drop_caches",
    "mb=$(( $(awk '/MemAvailable/ {print $2}' /proc/meminfo) / 1024 - 64 ))",
    "mkdir -p /tmp/zero && mount -t tmpfs -o size=${mb}m zero /tmp/zero",
    "dd if=/dev/zero of=/tmp/zero/fill bs=1M count=$mb 2>/dev/null",
    "umount /tmp/zero && rmdir /tmp/zero && clear",
  ].join("; ")
);
await new Promise((r) => setTimeout(r, 2000));

console.log("\nSaving state…");
writeFileSync(out, new Uint8Array(await vm.save_state()));
vm.destroy();
execFileSync("zstd", ["-19", "-T0", "-f", "-q", out, "-o", `${out}.zst`], {
  stdio: "inherit",
});
rmSync(out);
console.log(`Saved ${out}.zst`);
