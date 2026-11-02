// Shared by the page and scripts/build-state.ts. A saved state only restores
// into a VM with the same memory size and devices, so both must build their
// options here.
import type { V86Options } from "v86";

/** Enough for rustc. Unused memory compresses to almost nothing in the snapshot. */
export const MEMORY_MB = 1024;

// Same as v86's Alpine example, plus console=ttyS0 so a cold boot shows the
// kernel log in the terminal, and ignoreqv: v86 reports every file's qid
// version as 0, which makes Linux bypass the page cache and re-read files
// over 9p on every open (Go re-fetched its 30 MB toolchain each run).
const CMDLINE =
  "rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose,ignoreqv " +
  "modules=virtio_pci tsc=reliable console=ttyS0";

/** `assets` is the directory (or URL) holding bios/, alpine-fs.json and alpine-rootfs-flat/ */
export function vmOptions(assets: string): V86Options {
  return {
    bios: { url: `${assets}bios/seabios.bin` },
    vga_bios: { url: `${assets}bios/vgabios.bin` },
    memory_size: MEMORY_MB * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
    uart1: true,
    bzimage_initrd_from_filesystem: true,
    cmdline: CMDLINE,
    filesystem: {
      baseurl: `${assets}alpine-rootfs-flat/`,
      basefs: `${assets}alpine-fs.json`,
    },
  };
}
