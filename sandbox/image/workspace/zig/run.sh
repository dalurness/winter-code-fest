#!/bin/sh
# zig build-exe links again even when nothing changed, which takes a minute
# under emulation, so only build when a source is newer than the binary.
# A baseline CPU, since the image is built on a newer one than v86 emulates.
if [ ! -e main ] || [ -n "$(find src -newer main)" ]; then
  zig build-exe -mcpu=baseline src/main.zig -femit-bin=main || exit
fi
exec sb exec ./main "$@"
