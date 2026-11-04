#!/bin/sh
[ main -nt main.cpp ] || g++ -O1 -Wall -o main main.cpp || exit
exec sb exec ./main "$@"
