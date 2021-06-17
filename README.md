<p align='center'>
  <img src='misc/Oracle-profile.png' />
</p>
<h1 align='center'>
  DiscordStat.bot
</h2>
<p align='center'>
Discord Statistics Bot that monitors user statistics on a server, with the end goal of a personalized User and Server Statistics Experience much like Spotify's Wrapped.
</p>
<p align='center'>
  <a href='https://discord.gg/68xT2UwJ2R'>Official Discord Server</a>
</P>
<p align='center'>
  <a href='https://top.gg/bot/804912951144087632'>Official Top.gg Link</a>
</P>


## Configuration ⚙️
DiscordStat.bot listens on `bot-commands` channel only.

- `BOT_TOKEN`: Discord Bot token
- `PSQL_USER`: PSQL Database Connection Username
- `PSQL_PSWD`: PSQL Database Connection Password
- `PSQL_HOST`: PSQL Database Connection URL
- `PSQL_PORT`: PSQL Database Connection Port
- `PSQL_DB`: PSQL Database Connection Database Name

## Build and Run 🚀
❗️**IMPORTANT**❗️: On the first run, make sure the database syncs up by **enabling syncing**. If you leave sync enabled, you would just get an error logged at the beginning, however functionality will continue to work. This is due to a bug in `DenoDB` as of `DenoDB Version v1.0.24`.
```js
// First Run
initConnection(env, { debug: false, sync: true });

// other runs
initConnection(env, { debug: false });
```

Be sure to fill in the .env file before running!
```sh
# Copy .env.sample and create your own
cp .env.sample .env

# Runs under Deno :) Can also use the ./run.sh Script
deno run --allow-read --allow-write --allow-net --unstable ./src/main.ts
```

## Commands 🤖
All commands should be prefixed with `!`.

**User-Specific Commands**
- `help`: Print the Help Menu
- `tracking-status`: Prints status of tracking enable/disable for user
- `tracking-set [true/false]`: Sets tracking state given by user argument [true/false]
- `clear-data`: Clears all stored logs of user. (*No Confirmation is given*)
- `uptime`: Prints User's most recent uptime
- `week-uptime`: Prints User's uptime during the past 7 days
- `donate`: Prints Bot instructions for donating
- `version`: Prints Bot's current version

**Server-Specific Commands**
- `server-interaction`: Prints the current server's user interaction with this bot

## License 📔
Licensed under the [MIT](LICENSE) License.