#!/bin/sh
cd $(dirname $0)

docker run --rm \
  --net host \
  -v "$(pwd):/app" \
  -v "$HOME/.cache/deno:/deno-dir" \
  -w "/app" \
  -l deno_discordBot \
  "$@" \
  denoland/deno:alpine-1.12.0 \
  deno run --allow-read --allow-write --allow-net --unstable src/main.ts
