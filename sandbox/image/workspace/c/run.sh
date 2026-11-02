#!/bin/sh
[ main -nt main.c ] || cc -O1 -Wall -o main main.c || exit
exec sb exec ./main "$@"
