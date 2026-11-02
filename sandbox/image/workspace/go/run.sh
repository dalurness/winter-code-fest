#!/bin/sh
go build -o main . || exit
exec sb exec ./main "$@"
