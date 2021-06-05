<p align='center'>
  <img src='misc/Oracle-profile.png' />
</p>
<h1 align='center'>
  DiscordStat.bot
</h2>
<p align='center'>
Discord Statistics Bot that monitors user statistics on a server, with the end goal of a personalized User Statistics Experience much like Spotify's Wrapped.
</p>
<p align='center'>
  <a href='https://discord.gg/68xT2UwJ2R'>Official Discord Channel</a>
</P>


## Configuration ⚙️
- `BOT_TOKEN`: Discord Bot token
- `PSQL_USER`: PSQL Database Connection Username
- `PSQL_PSWD`: PSQL Database Connection Password
- `PSQL_HOST`: PSQL Database Connection URL
- `PSQL_PORT`: PSQL Database Connection Port
- `PSQL_DB`: PSQL Database Connection Database Name

## Build and Run 🚀
Be sure to fill in the .env file before running!
```sh
# Copy .env.sample and create your own
cp .env.sample .env

# Runs under Deno :) Can also use the ./run.sh Script
deno run --allow-read --allow-write --allow-net --unstable ./src/main.ts
```

## License 📔
Licensed under the [MIT](LICENSE) License.