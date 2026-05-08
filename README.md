# Leetcode-Daily-Bot

A Discord bot that helps a server build a daily Leetcode habit. It can post the daily Leetcode problem, let users mark the problem as done, track streaks, show leaderboards, make lighthearted missed-user lists, assign funny punishments, and run simple daily challenges.

Created by Kenny, Rajiv, Sanjay, and Yash.

## What the bot does

- Posts the daily Leetcode challenge to a configured Discord channel.
- Mentions the configured Daily Puzzle role when the daily reminder is sent.
- Adds a ✅ reaction to the daily reminder.
- Creates a discussion thread under the daily reminder when Discord allows it.
- Lets users mark completion with `/done` or by reacting ✅ to the daily reminder.
- Saves completions, streaks, badges, challenges, punishments, and reminder settings in local JSON.
- Keeps the original commands: `/ping`, `/poke`, `/clicker`, `/sendreactionroles`, and `/senddailymanual`.

## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the example config.

```bash
cp config.example.json config.json
```

3. Fill in `config.json`.

```json
{
  "TOKEN": "YOUR_DISCORD_BOT_TOKEN",
  "reminderChannelId": "YOUR_DAILY_REMINDER_CHANNEL_ID",
  "dailyReminderHour": 9,
  "dailyReminderMinute": 0,
  "timezone": "America/Chicago",
  "dailyPuzzleRoleId": "",
  "dailyPuzzleRoleName": "Daily Puzzle",
  "reminderGuildIds": [
    "YOUR_DISCORD_SERVER_ID"
  ],
  "commandGuildIds": [
    "YOUR_DISCORD_SERVER_ID"
  ],
  "enableDailyReminders": false
}
```

4. Start the bot.

```bash
npm start
```

## Required Discord bot intents

Enable these in the Discord Developer Portal and in the bot code:

- Server Members Intent
- Message Content Intent
- Guilds
- Guild Messages
- Guild Message Reactions
- Guild Members

The bot uses reaction events, member role lookup, and slash commands, so these intents matter.

## Config values

| Value | Purpose |
| --- | --- |
| `TOKEN` | Your Discord bot token. Keep this private. |
| `reminderChannelId` | Default channel where daily reminders are posted. |
| `dailyReminderHour` | Reminder hour in 24-hour time. |
| `dailyReminderMinute` | Reminder minute. |
| `timezone` | Timezone for reminders and date tracking. Default is `America/Chicago`. |
| `dailyPuzzleRoleId` | Optional role ID for the Daily Puzzle role. Admin settings fill this automatically. |
| `dailyPuzzleRoleName` | Role to mention for daily reminders. Default is `Daily Puzzle`. |
| `reminderGuildIds` | Server IDs where automatic reminders should run. |
| `commandGuildIds` | Server IDs where slash commands should be registered. If omitted, the bot keeps the original two guild IDs from the starter code. |
| `enableDailyReminders` | Turns the automatic once-per-day reminder scheduler on or off. |

Guild-specific settings saved in `data/botData.json` override `config.json`. Use the admin commands to set them from Discord.

## Full command list

### Original commands

| Command | What it does |
| --- | --- |
| `/ping` | Replies with `Pong!`. |
| `/poke` | Sends a poke button. |
| `/clicker` | Starts a small click counter button. |
| `/sendreactionroles` | Sends a 🧩 reaction role message for the Daily Puzzle role. |
| `/senddailymanual link:<leetcode-url>` | Sends a custom Leetcode daily embed and reacts with ✅. |

### Daily reminder commands

| Command | What it does |
| --- | --- |
| `/senddaily` | Sends today's automatic daily challenge immediately and counts it as today's sent reminder. |
| `/today` | Shows today's Leetcode challenge. |
| `/testdailyreminder` | Sends a test daily reminder without marking today as already sent. |
| `/reminderstatus` | Shows channel, reminder time, timezone, role, and enabled status. |

### Completion tracking commands

| Command | What it does |
| --- | --- |
| `/done` | Marks you done for today's problem. |
| `/undone` | Removes your completion for today. |
| `/stats` | Shows total completions, current streak, longest streak, missed days, difficulty counts, and badges. |
| `/streak` | Shows your current and longest streak. |

### Leaderboard commands

| Command | What it does |
| --- | --- |
| `/leaderboard` | Shows all-time top 10 users. |
| `/weeklyleaderboard` | Shows top 10 users from the last 7 days. |
| `/monthlyleaderboard` | Shows top 10 users from the last 30 days. |

### Missed users and punishments

| Command | What it does |
| --- | --- |
| `/missed` | Shows Daily Puzzle role members who have not completed today's problem. |
| `/shamelist` | Shows the same list with a lighthearted message. |
| `/punishment user:@user` | Assigns or displays a funny punishment for a missed user. If no user is provided, the bot picks a missed user. |

### Problems, challenges, badges, and recap

| Command | What it does |
| --- | --- |
| `/randomproblem difficulty:easy|medium|hard|any` | Sends a random curated Leetcode problem. |
| `/challenge user:@user` | Challenges another user to finish today's problem. |
| `/acceptchallenge` | Accepts a pending challenge. |
| `/declinechallenge` | Declines a pending challenge. |
| `/badges` | Shows your badges. |
| `/badges user:@user` | Shows another user's badges. |
| `/weeklyrecap` | Posts a weekly recap with top users, perfect-week users, total completions, and most solved difficulty. |

### Admin settings commands

These require Administrator permission.

| Command | What it does |
| --- | --- |
| `/setdailychannel channel:#channel` | Sets the reminder channel for the server. |
| `/setremindertime hour:number minute:number` | Sets the reminder time for the server. |
| `/setdailyrole role:@role` | Sets the Daily Puzzle role for mentions, reaction roles, and missed-user checks. |
| `/togglereminders enabled:true|false` | Enables or disables automatic reminders for the server. |

## How daily reminders work

The bot checks once per minute with `setInterval`. If reminders are enabled and the current time matches the configured reminder hour and minute in the configured timezone, the bot tries to send the daily reminder.

The bot sends only one automatic reminder per day per server. It stores sent daily reminder messages by date in:

```text
data/botData.json
```

The daily challenge is fetched from Leetcode's public GraphQL endpoint. If that request fails, the bot still sends a fallback reminder that links to:

```text
https://leetcode.com/problemset/
```

## How completion tracking works

Users can complete the daily in two ways:

1. Run `/done`.
2. React ✅ to the daily reminder message.

Completions are saved under each server and user in `data/botData.json`.

Removing a ✅ reaction does not remove a completion. This avoids accidental streak loss and reaction spam. Use `/undone` to remove today's completion.

## Badges

Badges are calculated from saved stats:

- ✅ First Completion
- 🔥 7 Day Streak
- 💪 30 Day Grinder
- 🧠 Hard Problem Survivor
- 👑 Weekly Champion

Badges show in `/stats` and `/badges`.

## How to test locally

1. Confirm dependencies install.

```bash
npm install
```

2. Confirm the file parses.

```bash
npm run check
```

This is the same syntax check directly:

```bash
node --check index.js
```

3. Fill in `config.json`.

4. Start the bot.

```bash
npm start
```

5. In Discord, test these commands first:

```text
/ping
/testdailyreminder
/done
/streak
/leaderboard
/missed
/randomproblem
/reminderstatus
```

Live Discord behavior requires a real bot token, the correct server ID, slash command permissions, and the required intents.

## Data and secrets

Ignored files:

- `node_modules`
- `config.json`
- `data/botData.json`
- `.env`

The repo includes `data/.gitkeep` so the `data` folder exists, but the real saved bot data stays local.

## Known limitations

- This version uses local JSON storage only. It does not use MongoDB or mongoose.
- Local JSON is simple and beginner-friendly, but it is not ideal for multiple bot instances running at the same time.
- `/randomproblem` uses a curated fallback list instead of a true random Leetcode API.
- The Leetcode daily GraphQL endpoint can change or rate limit requests. The fallback problemset link keeps reminders working.
- Thread creation can fail if the bot lacks permissions or the channel does not support threads.
- Missed-user lists need the Server Members Intent to be complete. If member fetching fails, the bot warns that the list may be incomplete.
- Slash command changes can take time to appear if commands are registered globally. This bot registers guild commands by default for faster updates.
