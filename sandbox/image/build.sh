#!/usr/bin/env bash
# Builds the Alpine 9p image and puts it in public/v86/, following v86's
# tools/docker/alpine/build.sh. Works with docker or podman.
set -euo pipefail

cd "$(dirname "$0")"

V86_COMMIT=cc37f35c43bf14865d74ad76879ecf9410f69eb1
V86_RAW=https://raw.githubusercontent.com/copy/v86/$V86_COMMIT

CACHE=.cache
OUT=../../public/sandbox/v86
OUT_ROOTFS_TAR="$CACHE"/alpine-rootfs.tar
OUT_ROOTFS_FLAT="$OUT"/alpine-rootfs-flat
OUT_FSJSON="$OUT"/alpine-fs.json
CONTAINER_NAME=wcf-sandbox-v86
IMAGE_NAME=i386/wcf-sandbox-v86

mkdir -p "$CACHE" "$OUT"/bios

for f in tools/fs2json.py; do
  [ -f "$CACHE/$(basename "$f")" ] || curl -fsSL "$V86_RAW/$f" -o "$CACHE/$(basename "$f")"
done
for f in bios/seabios.bin bios/vgabios.bin; do
  [ -f "$OUT/$f" ] || curl -fsSL "$V86_RAW/$f" -o "$OUT/$f"
done

# tools/day07-map is outside this folder, so it is passed as a named context
docker build . --platform linux/386 --rm --tag "$IMAGE_NAME" \
  --build-context day07map=../../tools/day07-map
docker rm "$CONTAINER_NAME" 2>/dev/null || true
docker create --platform linux/386 -t -i --name "$CONTAINER_NAME" "$IMAGE_NAME"
docker export "$CONTAINER_NAME" -o "$OUT_ROOTFS_TAR"
docker rm "$CONTAINER_NAME"

# bundle-mark's lists of which install added which files, for bundle.py
rm -rf "$CACHE"/bundle-marks && mkdir "$CACHE"/bundle-marks
tar -xf "$OUT_ROOTFS_TAR" -C "$CACHE"/bundle-marks --strip-components=1 .bundles
tar -f "$OUT_ROOTFS_TAR" --delete .bundles

# https://github.com/iximiuz/docker-to-linux/issues/19#issuecomment-1242809707
tar -f "$OUT_ROOTFS_TAR" --delete ".dockerenv" || true

# Files are named by content hash and existing ones are skipped, so old files
# stay valid for pages that are still open and rebuilds only compress what
# changed. ZSTD_LEVEL=9 builds much faster for slightly bigger downloads.
python flatten.py --level "${ZSTD_LEVEL:-19}" "$OUT_ROOTFS_TAR" "$OUT_ROOTFS_FLAT"

# The index goes last, once every file it points to exists
python "$CACHE"/fs2json.py --zstd --out "$OUT_FSJSON.tmp" "$OUT_ROOTFS_TAR"
mv "$OUT_FSJSON.tmp" "$OUT_FSJSON"

echo "Created $OUT_FSJSON and $OUT_ROOTFS_FLAT. npm run sandbox:state bundles them."
du -sh "$OUT_FSJSON" "$OUT_ROOTFS_FLAT"
