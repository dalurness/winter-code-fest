#!/bin/sh

set -eu

cd "$(dirname "$0")"

main() {
    if ! command -v magick > /dev/null; then
        echo "ImageMagick required but not found"
        exit 1
    fi

    cd ../public

    for size in 16 32; do
        magick convert \
            -background none \
            -resize "${size}x${size}" \
            logo.svg "favicon-${size}.png"
    done

    magick convert favicon-*.png favicon.ico
    rm favicon-*.png
}

main