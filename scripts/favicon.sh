#!/bin/sh

set -eu

cd "$(dirname "$0")"

cd ../public

for size in 16 32; do
    magick convert \
        -background none \
        -resize "${size}x${size}" \
        logo.svg "favicon-${size}.png"
done

magick convert favicon-*.png favicon.ico

rm favicon-*.png
