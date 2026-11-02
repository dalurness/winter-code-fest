#!/bin/sh
# Runs the module with erl directly: gleam run would check the build again
gleam build || exit
exec sb exec erl -pa build/dev/erlang/*/ebin -noshell -eval "sandbox:main(), halt()" -extra "$@"
