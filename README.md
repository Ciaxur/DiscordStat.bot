# DiscordStat.bot
Discord Statistics Bot that monitors user statistics on a server, with the end goal of a personalized User Statistics Experience much like Spotify's Wrapped.

## Build and Run 🚀
Be sure to fill in the .env file before running!
```sh
# Copy .env.sample and create your own
cp .env.sample .env

# Runs under Deno :) Can also use the ./run.sh Script
deno run --allow-read --allow-write --allow-net --unstable ./src/main.ts
```

## License
Licensed under the [MIT](LICENSE) License.