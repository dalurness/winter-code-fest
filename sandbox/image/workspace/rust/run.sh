#!/bin/sh
cargo build -q || exit
exec sb exec target/debug/sandbox "$@"
