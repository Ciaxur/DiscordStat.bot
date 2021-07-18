<p align='center'>
  <img src='misc/Oracle-profile.png' />
</p>
<h1 align='center'>
  DiscordStat.bot
</h2>

![oracle-status](https://top-gg-badges.herokuapp.com/badge/804912951144087632)

<p align='center'>
Discord Statistics Bot that monitors user statistics on a server, with the end goal of a personalized User and Server Statistics Experience much like Spotify's Wrapped.
</p>
<p align='center'>
  <a href='https://discord.gg/68xT2UwJ2R'>Official Discord Server</a>
</P>
<p align='center'>
  <a href='https://top.gg/bot/804912951144087632'>Official Top.gg Link</a>
</p>
<p align='center'>
  <a href='https://discord.com/oauth2/authorize?client_id=804912951144087632&permissions=543808&scope=bot'>Bot Invite Link</a>
</p>



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

# Runs under Deno :)
deno run --allow-read --allow-write --allow-net --unstable ./src/main.ts

# Can run in a Container using run.sh
./run.sh
```

## Commands 🤖
All commands should be prefixed with `!`.

**General Commands**
- `help`: Print the Help Menu
- `donate`: Prints Bot instructions for donating
- `version`: Prints Bot's current version
- `info`: Prints bot information

**User-Specific Commands**
- `tracking-status`: Prints status of tracking enable/disable for user
- `tracking-set [true/false]`: Sets tracking state given by user argument [true/false]
- `toggle-bot-tracking`: Toggles user being notified of bot's status change. !toggle-bot-tracking [bot-id]
- `list-bot-tracking`: DMs a list for all Bots being tracked to user
- `clear-data`: Clears all stored logs of user. (*No Confirmation is given*)
- `uptime`: Prints User's most recent uptime
- `week-uptime`: Prints User's uptime during the past 7 days

**Server-Specific Commands**
- `set-bot-channel`: Sets the Server Channel that the bot should respond to [owner only]
- `show-bot-channel`: Sets the Server Channel that the bot should respond to
- `clear-bot-channel`: Clears the Server Channel that the bot should respond to [owner only]
- `server-interaction`: Prints the current server's user interaction with this bot


## License 📔
Licensed under the [MIT](LICENSE) License.