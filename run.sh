#!/bin/sh
cd $(dirname $0)

docker run --rm \
  --net host \
  -v "$(pwd):/app" \
  -w "/app" \
  -l deno_discordBot \
  denoland/deno:alpine-1.11.3 \
  deno run --allow-read --allow-write --allow-net --unstable src/main.ts