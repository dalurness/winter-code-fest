#!/bin/sh
[ main -nt main.s ] || cc -no-pie -o main main.s || exit
exec sb exec ./main "$@"
