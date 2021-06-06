#!/bin/sh
cd $(dirname $0)
deno run --allow-read --allow-write --allow-net --unstable ./src/main.ts