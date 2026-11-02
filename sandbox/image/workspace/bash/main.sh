#!/usr/bin/env bash
set -euo pipefail

name=${1:-Winter Code Fest}
for i in 1 2 3; do
  echo "$i: Hello, $name!"
done
echo "Bash $BASH_VERSION"
