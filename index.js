// Leetcode Daily Discord Bot
// This file keeps the project beginner-readable while adding habit tracking features.

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    EmbedBuilder,
    GatewayIntentBits,
    Partials,
    PermissionFlagsBits,
} = require('discord.js');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'botData.json');
const DEFAULT_TIMEZONE = 'America/Chicago';
const DEFAULT_DAILY_ROLE_NAME = 'Daily Puzzle';
const DEFAULT_COMMAND_GUILD_IDS = ['1281840845800345611', '1103836999732969532'];

const OPTION_TYPES = {
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    CHANNEL: 7,
    ROLE: 8,
};

const PUNISHMENTS = [
    'Solve one extra Easy problem.',
    'Solve one random Medium problem.',
    'Explain your solution in the thread.',
    'Help someone debug a solution.',
    'Do 10 pushups.',
    'Post one thing you learned from the problem.',
];

const RANDOM_PROBLEMS = {
    easy: [
        { title: 'Two Sum', titleSlug: 'two-sum', difficulty: 'Easy' },
        { title: 'Valid Parentheses', titleSlug: 'valid-parentheses', difficulty: 'Easy' },
        { title: 'Merge Two Sorted Lists', titleSlug: 'merge-two-sorted-lists', difficulty: 'Easy' },
        { title: 'Best Time to Buy and Sell Stock', titleSlug: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy' },
        { title: 'Contains Duplicate', titleSlug: 'contains-duplicate', difficulty: 'Easy' },
    ],
    medium: [
        { title: 'Add Two Numbers', titleSlug: 'add-two-numbers', difficulty: 'Medium' },
        { title: 'Longest Substring Without Repeating Characters', titleSlug: 'longest-substring-without-repeating-characters', difficulty: 'Medium' },
        { title: 'Group Anagrams', titleSlug: 'group-anagrams', difficulty: 'Medium' },
        { title: 'Top K Frequent Elements', titleSlug: 'top-k-frequent-elements', difficulty: 'Medium' },
        { title: 'Product of Array Except Self', titleSlug: 'product-of-array-except-self', difficulty: 'Medium' },
    ],
    hard: [
        { title: 'Median of Two Sorted Arrays', titleSlug: 'median-of-two-sorted-arrays', difficulty: 'Hard' },
        { title: 'Trapping Rain Water', titleSlug: 'trapping-rain-water', difficulty: 'Hard' },
        { title: 'Merge k Sorted Lists', titleSlug: 'merge-k-sorted-lists', difficulty: 'Hard' },
        { title: 'Minimum Window Substring', titleSlug: 'minimum-window-substring', difficulty: 'Hard' },
        { title: 'Serialize and Deserialize Binary Tree', titleSlug: 'serialize-and-deserialize-binary-tree', difficulty: 'Hard' },
    ],
};

let config = {};
try {
    config = require('./config.json');
} catch (error) {
    console.error('Missing config.json. Copy config.example.json to config.json and fill in your bot token.');
    config = {};
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
    ],
});

client.config = config;
client.cooldowns = new Map();
client.cache = new Map();

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'poke',
        description: 'Poke the bot! Send a message with a button.',
    },
    {
        name: 'clicker',
        description: 'Starts a clicker button thing.',
    },
    {
        name: 'sendreactionroles',
        description: 'Sends a message containing reaction roles.',
    },
    {
        name: 'senddailymanual',
        description: 'Manually send the daily Leetcode challenge with a provided link.',
        options: [
            {
                name: 'link',
                type: OPTION_TYPES.STRING,
                description: 'Link of the daily Leetcode to send.',
                required: true,
            },
        ],
    },
    {
        name: 'senddaily',
        description: 'Send today\'s automatic daily Leetcode challenge now.',
    },
    {
        name: 'today',
        description: 'Show today\'s Leetcode challenge.',
    },
    {
        name: 'testdailyreminder',
        description: 'Send a test daily reminder without marking today as sent.',
    },
    {
        name: 'reminderstatus',
        description: 'Show the current daily reminder settings.',
    },
    {
        name: 'done',
        description: 'Mark yourself done for today\'s Leetcode problem.',
    },
    {
        name: 'undone',
        description: 'Remove your completion for today.',
    },
    {
        name: 'stats',
        description: 'Show your Leetcode completion stats.',
    },
    {
        name: 'streak',
        description: 'Show your current and longest Leetcode streak.',
    },
    {
        name: 'leaderboard',
        description: 'Show the all-time Leetcode leaderboard.',
    },
    {
        name: 'weeklyleaderboard',
        description: 'Show the last 7 days Leetcode leaderboard.',
    },
    {
        name: 'monthlyleaderboard',
        description: 'Show the last 30 days Leetcode leaderboard.',
    },
    {
        name: 'missed',
        description: 'Show Daily Puzzle role members who have not completed today\'s problem.',
    },
    {
        name: 'punishment',
        description: 'Assign or show a funny punishment for someone who missed the daily.',
        options: [
            {
                name: 'user',
                type: OPTION_TYPES.USER,
                description: 'User to check. If omitted, a missed user is picked randomly.',
                required: false,
            },
        ],
    },
    {
        name: 'shamelist',
        description: 'Show a lighthearted list of people who missed today.',
    },
    {
        name: 'randomproblem',
        description: 'Get a random Leetcode problem.',
        options: [
            {
                name: 'difficulty',
                type: OPTION_TYPES.STRING,
                description: 'Problem difficulty.',
                required: true,
                choices: [
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' },
                    { name: 'Any', value: 'any' },
                ],
            },
        ],
    },
    {
        name: 'challenge',
        description: 'Challenge another user to finish the daily problem.',
        options: [
            {
                name: 'user',
                type: OPTION_TYPES.USER,
                description: 'The user you want to challenge.',
                required: true,
            },
        ],
    },
    {
        name: 'acceptchallenge',
        description: 'Accept a pending daily challenge.',
    },
    {
        name: 'declinechallenge',
        description: 'Decline a pending daily challenge.',
    },
    {
        name: 'badges',
        description: 'Show your badges or another user\'s badges.',
        options: [
            {
                name: 'user',
                type: OPTION_TYPES.USER,
                description: 'User to show badges for.',
                required: false,
            },
        ],
    },
    {
        name: 'weeklyrecap',
        description: 'Post a weekly Leetcode recap.',
    },
    {
        name: 'setdailychannel',
        description: 'Set the channel for daily Leetcode reminders.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'channel',
                type: OPTION_TYPES.CHANNEL,
                channel_types: [ChannelType.GuildText],
                description: 'Channel to send daily reminders in.',
                required: true,
            },
        ],
    },
    {
        name: 'setremindertime',
        description: 'Set the daily reminder time.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'hour',
                type: OPTION_TYPES.INTEGER,
                description: 'Hour in 24-hour time.',
                required: true,
                min_value: 0,
                max_value: 23,
            },
            {
                name: 'minute',
                type: OPTION_TYPES.INTEGER,
                description: 'Minute.',
                required: true,
                min_value: 0,
                max_value: 59,
            },
        ],
    },
    {
        name: 'setdailyrole',
        description: 'Set the role that receives daily Leetcode reminders.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'role',
                type: OPTION_TYPES.ROLE,
                description: 'Daily Puzzle role.',
                required: true,
            },
        ],
    },
    {
        name: 'togglereminders',
        description: 'Turn daily reminders on or off.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'enabled',
                type: OPTION_TYPES.BOOLEAN,
                description: 'Whether daily reminders should run automatically.',
                required: true,
            },
        ],
    },
];

function normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    return [String(value)];
}

function getTodayDateKey(timezone = DEFAULT_TIMEZONE) {
    return getDateKeyFromDate(new Date(), timezone);
}

function getDateKeyFromDate(date, timezone = DEFAULT_TIMEZONE) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone || DEFAULT_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(date);

        const values = {};
        for (const part of parts) {
            values[part.type] = part.value;
        }

        return `${values.year}-${values.month}-${values.day}`;
    } catch (error) {
        console.error(`Invalid timezone "${timezone}". Falling back to ${DEFAULT_TIMEZONE}.`);
        return getDateKeyFromDate(date, DEFAULT_TIMEZONE);
    }
}

function getTimeParts(date, timezone = DEFAULT_TIMEZONE) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone || DEFAULT_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(date);

        const values = {};
        for (const part of parts) {
            values[part.type] = part.value;
        }

        return {
            hour: Number(values.hour),
            minute: Number(values.minute),
        };
    } catch (error) {
        console.error(`Invalid timezone "${timezone}". Falling back to ${DEFAULT_TIMEZONE}.`);
        return getTimeParts(date, DEFAULT_TIMEZONE);
    }
}

function addDaysToDateKey(dateKey, amount, timezone = DEFAULT_TIMEZONE) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return getDateKeyFromDate(date, timezone);
}

function getLastDateKeys(days, timezone = DEFAULT_TIMEZONE) {
    const today = getTodayDateKey(timezone);
    const keys = [];

    for (let i = 0; i < days; i++) {
        keys.push(addDaysToDateKey(today, -i, timezone));
    }

    return keys;
}

function loadBotData() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (!fs.existsSync(DATA_FILE)) {
            return { guilds: {} };
        }

        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        if (!rawData.trim()) {
            return { guilds: {} };
        }

        const data = JSON.parse(rawData);
        if (!data.guilds) {
            data.guilds = {};
        }

        return data;
    } catch (error) {
        console.error('Could not load data/botData.json. Using empty data for now.', error);
        return { guilds: {} };
    }
}

function saveBotData(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
    } catch (error) {
        console.error('Could not save data/botData.json.', error);
    }
}

function ensureGuildData(data, guildId) {
    if (!data.guilds) {
        data.guilds = {};
    }

    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {};
    }

    const guildData = data.guilds[guildId];

    if (!guildData.settings) guildData.settings = {};
    if (!guildData.dailyMessages) guildData.dailyMessages = {};
    if (!guildData.completions) guildData.completions = {};
    if (!guildData.punishments) guildData.punishments = {};
    if (!guildData.challenges) guildData.challenges = {};
    if (!guildData.badges) guildData.badges = {};

    return guildData;
}

function getGuildSettings(guildData, baseConfig = client.config) {
    const defaults = {
        reminderChannelId: baseConfig.reminderChannelId || '',
        dailyReminderHour: Number.isInteger(baseConfig.dailyReminderHour) ? baseConfig.dailyReminderHour : 9,
        dailyReminderMinute: Number.isInteger(baseConfig.dailyReminderMinute) ? baseConfig.dailyReminderMinute : 0,
        timezone: baseConfig.timezone || DEFAULT_TIMEZONE,
        dailyPuzzleRoleName: baseConfig.dailyPuzzleRoleName || DEFAULT_DAILY_ROLE_NAME,
        enableDailyReminders: baseConfig.enableDailyReminders === undefined ? false : Boolean(baseConfig.enableDailyReminders),
        reminderGuildIds: normalizeArray(baseConfig.reminderGuildIds),
    };

    return {
        ...defaults,
        ...(guildData?.settings || {}),
    };
}

function shouldSendReminderNow(now, settings) {
    if (!settings.enableDailyReminders) return false;

    const time = getTimeParts(now, settings.timezone);
    return time.hour === Number(settings.dailyReminderHour) && time.minute === Number(settings.dailyReminderMinute);
}

async function fetchDailyLeetcodeChallenge() {
    const fallback = {
        title: 'Daily Leetcode Challenge',
        titleSlug: 'problemset',
        difficulty: 'Unknown',
        url: 'https://leetcode.com/problemset/',
    };

    const query = `
        query questionOfToday {
            activeDailyCodingChallengeQuestion {
                link
                question {
                    title
                    titleSlug
                    difficulty
                }
            }
        }
    `;

    try {
        const response = await axios.post(
            'https://leetcode.com/graphql',
            { query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Referer: 'https://leetcode.com/problemset/',
                    'User-Agent': 'Leetcode-Daily-Bot',
                },
                timeout: 10000,
            }
        );

        const daily = response.data?.data?.activeDailyCodingChallengeQuestion;
        const question = daily?.question;

        if (!question?.title || !question?.titleSlug) {
            throw new Error('Leetcode response did not include a daily question.');
        }

        return {
            title: question.title,
            titleSlug: question.titleSlug,
            difficulty: question.difficulty || 'Unknown',
            url: daily.link ? `https://leetcode.com${daily.link}` : `https://leetcode.com/problems/${question.titleSlug}/`,
        };
    } catch (error) {
        console.error('Unable to fetch the daily Leetcode challenge. Sending fallback problemset link.', error.message);
        return fallback;
    }
}

function buildDailyLeetcodeEmbed(problem, botClient = client) {
    return new EmbedBuilder()
        .setColor(0xffa115)
        .setTitle('Daily Leetcode')
        .setDescription(`[${problem.title}](${problem.url})`)
        .addFields(
            { name: 'Difficulty', value: problem.difficulty || 'Unknown', inline: true },
            { name: 'Link', value: `[Open problem](${problem.url})`, inline: true }
        )
        .setFooter({
            text: 'React with ✅ or use /done to confirm completion.',
            iconURL: botClient.user?.displayAvatarURL() || undefined,
        })
        .setTimestamp();
}

function buildProblemEmbed(title, problem, footerText) {
    return new EmbedBuilder()
        .setColor(0xffa115)
        .setTitle(title)
        .setDescription(`[${problem.title}](${problem.url})`)
        .addFields({ name: 'Difficulty', value: problem.difficulty || 'Unknown', inline: true })
        .setFooter({ text: footerText || 'Keep the streak alive.' })
        .setTimestamp();
}

async function resolveReminderChannel(botClient, guild, settings, options = {}) {
    const channelId = options.channelId || settings.reminderChannelId;

    if (!channelId) {
        throw new Error('No reminder channel is configured. Use /setdailychannel or add reminderChannelId to config.json.');
    }

    const channel = await botClient.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        throw new Error(`Configured reminder channel ${channelId} was not found or is not text based.`);
    }

    if (guild && channel.guildId !== guild.id) {
        throw new Error('Configured reminder channel does not belong to this server.');
    }

    return channel;
}

async function findDailyRole(guild, roleName) {
    if (!guild || !roleName) return null;

    try {
        await guild.roles.fetch();
    } catch (error) {
        console.error('Could not refresh guild roles.', error.message);
    }

    return guild.roles.cache.find(role => role.name === roleName) || null;
}

async function sendDailyLeetcodeReminder(botClient, options = {}) {
    const data = loadBotData();
    const guildId = options.guildId || options.guild?.id;
    const guild = options.guild || botClient.guilds.cache.get(guildId);

    if (!guild) {
        throw new Error('Guild not found for daily reminder.');
    }

    const guildData = ensureGuildData(data, guild.id);
    const settings = getGuildSettings(guildData);
    const timezone = settings.timezone || DEFAULT_TIMEZONE;
    const todayKey = getTodayDateKey(timezone);

    if (!options.isTest && !options.force && guildData.dailyMessages[todayKey]?.messageId) {
        return {
            alreadySent: true,
            dateKey: todayKey,
            dailyMessage: guildData.dailyMessages[todayKey],
        };
    }

    const channel = await resolveReminderChannel(botClient, guild, settings, options);
    const problem = options.problem || await fetchDailyLeetcodeChallenge();
    const embed = buildDailyLeetcodeEmbed(problem, botClient);
    const role = options.isTest ? null : await findDailyRole(guild, settings.dailyPuzzleRoleName);

    const content = options.isTest
        ? 'Test daily Leetcode reminder.'
        : role
            ? `<@&${role.id}> Daily Leetcode is here!`
            : 'Daily Leetcode is here!';

    const message = await channel.send({
        content,
        embeds: [embed],
        allowedMentions: role ? { roles: [role.id] } : { parse: [] },
    });

    await message.react('✅').catch(error => {
        console.error('Could not react to daily reminder with ✅.', error.message);
    });

    let thread = null;
    if (!options.isTest && message.startThread) {
        try {
            thread = await message.startThread({
                name: `Daily Leetcode - ${problem.title}`.slice(0, 100),
                autoArchiveDuration: 1440,
                reason: 'Daily Leetcode discussion thread',
            });
        } catch (error) {
            console.error('Could not create a daily discussion thread.', error.message);
        }
    }

    if (!options.isTest && options.markAsSent !== false) {
        guildData.dailyMessages[todayKey] = {
            messageId: message.id,
            channelId: channel.id,
            threadId: thread?.id || '',
            problem: {
                title: problem.title,
                titleSlug: problem.titleSlug,
                difficulty: problem.difficulty,
                url: problem.url,
            },
            sentAt: new Date().toISOString(),
            source: options.source || 'manual',
        };

        saveBotData(data);
    }

    return {
        alreadySent: false,
        dateKey: todayKey,
        message,
        problem,
    };
}

function getReminderGuildIds(botClient, data = loadBotData()) {
    const configGuildIds = normalizeArray(botClient.config.reminderGuildIds);
    if (configGuildIds.length > 0) {
        return configGuildIds;
    }

    const ids = new Set();
    for (const id of Object.keys(data.guilds || {})) {
        ids.add(id);
    }

    for (const id of botClient.guilds.cache.keys()) {
        ids.add(id);
    }

    return Array.from(ids);
}

function startDailyReminderScheduler(botClient) {
    setInterval(async () => {
        const data = loadBotData();
        const guildIds = getReminderGuildIds(botClient, data);

        for (const guildId of guildIds) {
            try {
                const guildData = ensureGuildData(data, guildId);
                const settings = getGuildSettings(guildData);
                if (!shouldSendReminderNow(new Date(), settings)) continue;

                await sendDailyLeetcodeReminder(botClient, {
                    guildId,
                    markAsSent: true,
                    source: 'scheduler',
                });
            } catch (error) {
                console.error(`Daily reminder failed for guild ${guildId}:`, error.message);
            }
        }
    }, 60 * 1000);

    console.log('Daily reminder scheduler started.');
}

function findDailyMessageByMessageId(guildData, messageId, channelId) {
    for (const [dateKey, dailyMessage] of Object.entries(guildData.dailyMessages || {})) {
        if (dailyMessage.messageId === messageId && (!channelId || dailyMessage.channelId === channelId)) {
            return { dateKey, dailyMessage };
        }
    }

    return null;
}

async function getProblemForDate(guildData, dateKey) {
    if (guildData.dailyMessages?.[dateKey]?.problem) {
        return guildData.dailyMessages[dateKey].problem;
    }

    return fetchDailyLeetcodeChallenge();
}

function ensureUserCompletionData(guildData, user) {
    if (!guildData.completions[user.id]) {
        guildData.completions[user.id] = {
            username: user.tag || user.username || user.id,
            dates: {},
        };
    }

    if (!guildData.completions[user.id].dates) {
        guildData.completions[user.id].dates = {};
    }

    guildData.completions[user.id].username = user.tag || user.username || user.id;
    return guildData.completions[user.id];
}

async function markUserDone(guildId, user, dateKey, problem = null) {
    const data = loadBotData();
    const guildData = ensureGuildData(data, guildId);
    const timezone = getGuildSettings(guildData).timezone;
    const finalDateKey = dateKey || getTodayDateKey(timezone);
    const userData = ensureUserCompletionData(guildData, user);

    if (userData.dates[finalDateKey]) {
        return {
            alreadyCompleted: true,
            dateKey: finalDateKey,
            entry: userData.dates[finalDateKey],
        };
    }

    const finalProblem = problem || await getProblemForDate(guildData, finalDateKey);
    userData.dates[finalDateKey] = {
        problemTitle: finalProblem.title,
        problemSlug: finalProblem.titleSlug,
        difficulty: finalProblem.difficulty || 'Unknown',
        completedAt: new Date().toISOString(),
    };

    syncBadgesForGuild(guildData, timezone);
    saveBotData(data);

    return {
        alreadyCompleted: false,
        dateKey: finalDateKey,
        entry: userData.dates[finalDateKey],
    };
}

function removeUserDone(guildId, user, dateKey) {
    const data = loadBotData();
    const guildData = ensureGuildData(data, guildId);
    const timezone = getGuildSettings(guildData).timezone;
    const finalDateKey = dateKey || getTodayDateKey(timezone);
    const userData = ensureUserCompletionData(guildData, user);

    if (!userData.dates[finalDateKey]) {
        return false;
    }

    delete userData.dates[finalDateKey];
    syncBadgesForGuild(guildData, timezone);
    saveBotData(data);
    return true;
}

function getUserStats(guildData, userId, timezone = DEFAULT_TIMEZONE) {
    const userData = guildData.completions?.[userId] || { username: userId, dates: {} };
    const dates = userData.dates || {};
    const dateKeys = Object.keys(dates).sort();
    const dateSet = new Set(dateKeys);
    const today = getTodayDateKey(timezone);

    let streakStart = today;
    if (!dateSet.has(streakStart)) {
        streakStart = addDaysToDateKey(today, -1, timezone);
    }

    let currentStreak = 0;
    let cursor = streakStart;
    while (dateSet.has(cursor)) {
        currentStreak++;
        cursor = addDaysToDateKey(cursor, -1, timezone);
    }

    let longestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;
    for (const dateKey of dateKeys) {
        if (previousDate && addDaysToDateKey(previousDate, 1, timezone) === dateKey) {
            runningStreak++;
        } else {
            runningStreak = 1;
        }

        if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
        }

        previousDate = dateKey;
    }

    let missedDays = 0;
    if (dateKeys.length > 0) {
        let checkDate = dateKeys[0];
        while (checkDate <= today) {
            if (!dateSet.has(checkDate)) {
                missedDays++;
            }
            checkDate = addDaysToDateKey(checkDate, 1, timezone);
        }
    }

    const difficultyCounts = {
        Easy: 0,
        Medium: 0,
        Hard: 0,
        Unknown: 0,
    };

    for (const entry of Object.values(dates)) {
        const difficulty = entry.difficulty || 'Unknown';
        if (!difficultyCounts[difficulty]) {
            difficultyCounts[difficulty] = 0;
        }
        difficultyCounts[difficulty]++;
    }

    return {
        username: userData.username || userId,
        totalCompletions: dateKeys.length,
        currentStreak,
        longestStreak,
        missedDays,
        difficultyCounts,
        badges: guildData.badges?.[userId] || [],
    };
}

function getLeaderboardEntries(guildData, days = null, timezone = DEFAULT_TIMEZONE) {
    const allowedDates = days ? new Set(getLastDateKeys(days, timezone)) : null;
    const entries = [];

    for (const [userId, userData] of Object.entries(guildData.completions || {})) {
        const dates = Object.keys(userData.dates || {});
        const count = dates.filter(dateKey => !allowedDates || allowedDates.has(dateKey)).length;

        if (count > 0) {
            entries.push({
                userId,
                username: userData.username || userId,
                count,
            });
        }
    }

    entries.sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
    return entries;
}

function formatLeaderboard(entries) {
    if (entries.length === 0) {
        return 'No completions yet.';
    }

    let rank = 0;
    let seen = 0;
    let previousCount = null;

    return entries.slice(0, 10).map(entry => {
        seen++;
        if (entry.count !== previousCount) {
            rank = seen;
            previousCount = entry.count;
        }

        return `**${rank}.** ${entry.username}: ${entry.count}`;
    }).join('\n');
}

function getBadgesForUser(guildData, userId, timezone = DEFAULT_TIMEZONE) {
    const stats = getUserStats(guildData, userId, timezone);
    const badges = [];

    if (stats.totalCompletions >= 1) badges.push('✅ First Completion');
    if (stats.longestStreak >= 7 || stats.currentStreak >= 7) badges.push('🔥 7 Day Streak');
    if (stats.longestStreak >= 30 || stats.totalCompletions >= 30) badges.push('💪 30 Day Grinder');
    if ((stats.difficultyCounts.Hard || 0) >= 1) badges.push('🧠 Hard Problem Survivor');

    const weeklyEntries = getLeaderboardEntries(guildData, 7, timezone);
    const topCount = weeklyEntries[0]?.count || 0;
    const userWeeklyCount = weeklyEntries.find(entry => entry.userId === userId)?.count || 0;
    if (topCount > 0 && userWeeklyCount === topCount) {
        badges.push('👑 Weekly Champion');
    }

    return badges;
}

function syncBadgesForGuild(guildData, timezone = DEFAULT_TIMEZONE) {
    if (!guildData.badges) guildData.badges = {};

    for (const userId of Object.keys(guildData.completions || {})) {
        guildData.badges[userId] = getBadgesForUser(guildData, userId, timezone);
    }
}

function buildStatsEmbed(user, stats) {
    const difficultyText = Object.entries(stats.difficultyCounts)
        .filter(([, count]) => count > 0)
        .map(([difficulty, count]) => `${difficulty}: ${count}`)
        .join('\n') || 'No solved difficulties yet.';

    const badgesText = stats.badges.length ? stats.badges.join('\n') : 'No badges yet.';

    return new EmbedBuilder()
        .setColor(0xffa115)
        .setTitle(`${user.username || user.tag}'s Leetcode Stats`)
        .addFields(
            { name: 'Total completions', value: String(stats.totalCompletions), inline: true },
            { name: 'Current streak', value: String(stats.currentStreak), inline: true },
            { name: 'Longest streak', value: String(stats.longestStreak), inline: true },
            { name: 'Missed days', value: String(stats.missedDays), inline: true },
            { name: 'Difficulty counts', value: difficultyText, inline: true },
            { name: 'Badges', value: badgesText, inline: false }
        )
        .setTimestamp();
}

async function getMissedMembers(guild, guildData, timezone = DEFAULT_TIMEZONE) {
    const settings = getGuildSettings(guildData);
    const role = await findDailyRole(guild, settings.dailyPuzzleRoleName);

    if (!role) {
        return {
            role,
            missedMembers: [],
            error: `Could not find the ${settings.dailyPuzzleRoleName} role.`,
        };
    }

    try {
        await guild.members.fetch();
    } catch (error) {
        console.error('Could not fetch guild members. The member cache may be incomplete.', error.message);
    }

    const today = getTodayDateKey(timezone);
    const missedMembers = role.members.filter(member => {
        if (member.user.bot) return false;
        return !guildData.completions?.[member.id]?.dates?.[today];
    });

    return {
        role,
        missedMembers: Array.from(missedMembers.values()),
        error: null,
    };
}

function getRandomProblem(difficulty) {
    let pool = [];

    if (difficulty === 'any') {
        pool = [...RANDOM_PROBLEMS.easy, ...RANDOM_PROBLEMS.medium, ...RANDOM_PROBLEMS.hard];
    } else {
        pool = RANDOM_PROBLEMS[difficulty] || RANDOM_PROBLEMS.easy;
    }

    const problem = pool[Math.floor(Math.random() * pool.length)];
    return {
        ...problem,
        url: `https://leetcode.com/problems/${problem.titleSlug}/`,
    };
}

function getMostSolvedDifficulty(guildData, dateKeys) {
    const counts = {};

    for (const userData of Object.values(guildData.completions || {})) {
        for (const [dateKey, entry] of Object.entries(userData.dates || {})) {
            if (!dateKeys.includes(dateKey)) continue;
            const difficulty = entry.difficulty || 'Unknown';
            counts[difficulty] = (counts[difficulty] || 0) + 1;
        }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : 'None yet';
}

function getCommandGuildIds(botClient) {
    const configured = normalizeArray(botClient.config.commandGuildIds || botClient.config.reminderGuildIds);
    if (configured.length > 0) {
        return configured;
    }

    return DEFAULT_COMMAND_GUILD_IDS;
}

async function registerSlashCommands(botClient) {
    if (!botClient.config.TOKEN) {
        console.error('Cannot register slash commands because TOKEN is missing.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(botClient.config.TOKEN);
    const guildIds = getCommandGuildIds(botClient);

    try {
        console.log('Started refreshing application (/) commands.');

        if (guildIds.length > 0) {
            for (const guildId of guildIds) {
                await rest.put(
                    Routes.applicationGuildCommands(botClient.user.id, guildId),
                    { body: commands }
                );
                console.log(`Reloaded slash commands for guild ${guildId}.`);
            }
        } else {
            await rest.put(
                Routes.applicationCommands(botClient.user.id),
                { body: commands }
            );
            console.log('Reloaded global slash commands.');
        }

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Unable to register slash commands.', error);
    }
}

function isAdmin(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function handleSlashCommand(interaction) {
    const { commandName, options } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
        return;
    }

    if (commandName === 'poke') {
        const button = new ButtonBuilder()
            .setCustomId('poke_button')
            .setLabel('Poke me!')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({
            content: 'Poke me!',
            components: [row],
        });
        return;
    }

    if (commandName === 'clicker') {
        const button = new ButtonBuilder()
            .setCustomId('clicker_button')
            .setLabel('Click me!')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);
        let clickCount = 0;

        const message = await interaction.reply({
            content: 'Click the button!',
            components: [row],
            fetchReply: true,
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.customId === 'clicker_button',
            time: 60000,
        });

        collector.on('collect', async i => {
            clickCount++;
            await i.update({
                content: `You clicked the button ${clickCount} times!`,
                components: [row],
            });
        });
        return;
    }

    if (commandName === 'sendreactionroles') {
        const guild = interaction.guild;
        const data = loadBotData();
        const guildData = ensureGuildData(data, guild.id);
        const settings = getGuildSettings(guildData);

        let dailyPuzzleRole = guild.roles.cache.find(role => role.name === settings.dailyPuzzleRoleName);
        if (!dailyPuzzleRole) {
            try {
                dailyPuzzleRole = await guild.roles.create({
                    name: settings.dailyPuzzleRoleName,
                    color: 0,
                    reason: `Role created for reaction role: "${settings.dailyPuzzleRoleName}"`,
                });
                console.log(`Created new role: ${dailyPuzzleRole.name}`);
            } catch (error) {
                console.error(`Error creating role: ${error}`);
                await interaction.reply({
                    content: `Unable to create the ${settings.dailyPuzzleRoleName} role.`,
                    ephemeral: true,
                });
                return;
            }
        }

        const roleMessage = await interaction.channel.send(`React to receive the "${settings.dailyPuzzleRoleName}" role!`);
        await roleMessage.react('🧩');

        await interaction.reply({
            content: 'Reaction roles sent!',
            ephemeral: true,
        });
        return;
    }

    if (commandName === 'senddailymanual') {
        try {
            const link = options.getString('link');
            const titleSlug = (link.match(/(?<=leetcode.com\/problems\/)[\w-]*/) || [])[0];
            if (!titleSlug) throw new Error('Invalid link.');

            const sanitizedLink = `https://leetcode.com/problems/${titleSlug}/`;
            const problem = {
                title: titleSlug,
                titleSlug,
                difficulty: 'Manual',
                url: sanitizedLink,
            };

            const embed = new EmbedBuilder()
                .setColor(0xffa115)
                .setTitle('Daily Leetcode')
                .setDescription(`[${titleSlug}](${sanitizedLink})`)
                .setFooter({
                    text: 'React to confirm submission.',
                    iconURL: client.user.displayAvatarURL(),
                })
                .setTimestamp();

            const dailyMessage = await interaction.channel.send({ embeds: [embed] });
            await dailyMessage.react('✅');

            const data = loadBotData();
            const guildData = ensureGuildData(data, interaction.guild.id);
            const settings = getGuildSettings(guildData);
            const today = getTodayDateKey(settings.timezone);
            guildData.dailyMessages[today] = {
                messageId: dailyMessage.id,
                channelId: interaction.channel.id,
                threadId: '',
                problem,
                sentAt: new Date().toISOString(),
                source: 'senddailymanual',
            };
            saveBotData(data);

            await interaction.reply({
                content: 'Daily Leetcode sent!',
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `Unable to send message: ${error.message}`,
                ephemeral: true,
            });
        }
        return;
    }

    if (commandName === 'senddaily') {
        await interaction.deferReply({ ephemeral: true });

        try {
            const result = await sendDailyLeetcodeReminder(client, {
                guild: interaction.guild,
                markAsSent: true,
                source: 'senddaily',
            });

            if (result.alreadySent) {
                await interaction.editReply('Today\'s daily reminder was already sent.');
            } else {
                await interaction.editReply('Today\'s daily Leetcode reminder was sent and counted as today\'s sent reminder.');
            }
        } catch (error) {
            await interaction.editReply(`Unable to send daily reminder: ${error.message}`);
        }
        return;
    }

    if (commandName === 'today') {
        await interaction.deferReply();

        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const today = getTodayDateKey(settings.timezone);
        const problem = await getProblemForDate(guildData, today);
        const embed = buildProblemEmbed('Today\'s Leetcode Challenge', problem, 'Use /done when you finish it.');

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (commandName === 'testdailyreminder') {
        await interaction.deferReply({ ephemeral: true });

        try {
            await sendDailyLeetcodeReminder(client, {
                guild: interaction.guild,
                channelId: interaction.channelId,
                markAsSent: false,
                isTest: true,
                source: 'testdailyreminder',
            });

            await interaction.editReply('Test daily reminder sent. It did not mark today as already sent.');
        } catch (error) {
            await interaction.editReply(`Unable to send test reminder: ${error.message}`);
        }
        return;
    }

    if (commandName === 'reminderstatus') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const channelText = settings.reminderChannelId ? `<#${settings.reminderChannelId}>` : 'Not set';

        const embed = new EmbedBuilder()
            .setColor(0xffa115)
            .setTitle('Daily Reminder Status')
            .addFields(
                { name: 'Enabled', value: String(settings.enableDailyReminders), inline: true },
                { name: 'Channel', value: channelText, inline: true },
                { name: 'Time', value: `${settings.dailyReminderHour}:${String(settings.dailyReminderMinute).padStart(2, '0')}`, inline: true },
                { name: 'Timezone', value: settings.timezone, inline: true },
                { name: 'Role', value: settings.dailyPuzzleRoleName, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (commandName === 'done') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const today = getTodayDateKey(settings.timezone);
        const problem = await getProblemForDate(guildData, today);
        const result = await markUserDone(interaction.guild.id, interaction.user, today, problem);

        if (result.alreadyCompleted) {
            await interaction.reply({ content: 'You already marked today as done. Nice consistency.', ephemeral: true });
        } else {
            await interaction.reply(`Daily puzzle confirmed <@${interaction.user.id}> ✅`);
        }
        return;
    }

    if (commandName === 'undone') {
        const removed = removeUserDone(interaction.guild.id, interaction.user);

        if (removed) {
            await interaction.reply({ content: 'Removed your completion for today.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'You did not have a completion saved for today.', ephemeral: true });
        }
        return;
    }

    if (commandName === 'stats') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        syncBadgesForGuild(guildData, settings.timezone);
        saveBotData(data);

        const stats = getUserStats(guildData, interaction.user.id, settings.timezone);
        const embed = buildStatsEmbed(interaction.user, stats);

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'streak') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const stats = getUserStats(guildData, interaction.user.id, settings.timezone);

        await interaction.reply(`🔥 Current streak: **${stats.currentStreak}**\n🏆 Longest streak: **${stats.longestStreak}**`);
        return;
    }

    if (['leaderboard', 'weeklyleaderboard', 'monthlyleaderboard'].includes(commandName)) {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const days = commandName === 'weeklyleaderboard' ? 7 : commandName === 'monthlyleaderboard' ? 30 : null;
        const title = days ? `Leetcode Leaderboard: Last ${days} Days` : 'Leetcode Leaderboard: All Time';
        const entries = getLeaderboardEntries(guildData, days, settings.timezone);

        const embed = new EmbedBuilder()
            .setColor(0xffa115)
            .setTitle(title)
            .setDescription(formatLeaderboard(entries))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'missed' || commandName === 'shamelist') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const result = await getMissedMembers(interaction.guild, guildData, settings.timezone);

        if (result.error) {
            await interaction.reply({ content: result.error, ephemeral: true });
            return;
        }

        const names = result.missedMembers.map(member => `<@${member.id}>`);
        const description = names.length
            ? names.join('\n')
            : 'Everyone with the Daily Puzzle role finished today. Huge W.';

        const title = commandName === 'shamelist'
            ? 'The Very Silly Shame List'
            : 'Users Who Missed Today';

        const footer = commandName === 'shamelist'
            ? 'All jokes. Lock in and keep the streak alive.'
            : 'Use /done or react ✅ to finish.';

        const embed = new EmbedBuilder()
            .setColor(0xffa115)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: footer })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'punishment') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const today = getTodayDateKey(settings.timezone);
        const selectedUser = options.getUser('user');
        const missedResult = await getMissedMembers(interaction.guild, guildData, settings.timezone);

        if (missedResult.error) {
            await interaction.reply({ content: missedResult.error, ephemeral: true });
            return;
        }

        let member = selectedUser ? interaction.guild.members.cache.get(selectedUser.id) : null;
        if (!member && !selectedUser && missedResult.missedMembers.length > 0) {
            member = missedResult.missedMembers[Math.floor(Math.random() * missedResult.missedMembers.length)];
        }

        if (!member) {
            await interaction.reply({ content: 'No missed user found for a punishment.', ephemeral: true });
            return;
        }

        const missedIds = new Set(missedResult.missedMembers.map(missedMember => missedMember.id));
        if (!missedIds.has(member.id)) {
            await interaction.reply({ content: `${member.user.username} did not miss today. No punishment needed.`, ephemeral: true });
            return;
        }

        if (!guildData.punishments[today]) guildData.punishments[today] = {};
        if (!guildData.punishments[today][member.id]) {
            const punishment = PUNISHMENTS[Math.floor(Math.random() * PUNISHMENTS.length)];
            guildData.punishments[today][member.id] = punishment;
            saveBotData(data);
        }

        await interaction.reply(`😈 <@${member.id}> punishment: **${guildData.punishments[today][member.id]}**`);
        return;
    }

    if (commandName === 'randomproblem') {
        const difficulty = options.getString('difficulty');
        const problem = getRandomProblem(difficulty);
        const embed = buildProblemEmbed('Random Leetcode Problem', problem, 'Curated fallback list.');

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'challenge') {
        const target = options.getUser('user');

        if (target.bot) {
            await interaction.reply({ content: 'Bots do not need Leetcode. They already suffer enough.', ephemeral: true });
            return;
        }

        if (target.id === interaction.user.id) {
            await interaction.reply({ content: 'You cannot challenge yourself. That is just called discipline.', ephemeral: true });
            return;
        }

        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        const today = getTodayDateKey(settings.timezone);

        guildData.challenges[target.id] = {
            challengerId: interaction.user.id,
            challengerName: interaction.user.tag,
            targetId: target.id,
            targetName: target.tag,
            dateKey: today,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        saveBotData(data);
        await interaction.reply(`<@${interaction.user.id}> challenged <@${target.id}> to finish today's Leetcode problem.`);
        return;
    }

    if (commandName === 'acceptchallenge' || commandName === 'declinechallenge') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const challenge = guildData.challenges[interaction.user.id];

        if (!challenge || challenge.status !== 'pending') {
            await interaction.reply({ content: 'You do not have a pending challenge.', ephemeral: true });
            return;
        }

        if (new Date(challenge.expiresAt).getTime() < Date.now()) {
            challenge.status = 'expired';
            saveBotData(data);
            await interaction.reply({ content: 'Your pending challenge expired.', ephemeral: true });
            return;
        }

        challenge.status = commandName === 'acceptchallenge' ? 'accepted' : 'declined';
        challenge.respondedAt = new Date().toISOString();
        saveBotData(data);

        const action = commandName === 'acceptchallenge' ? 'accepted' : 'declined';
        await interaction.reply(`<@${interaction.user.id}> ${action} the challenge from <@${challenge.challengerId}>.`);
        return;
    }

    if (commandName === 'badges') {
        const target = options.getUser('user') || interaction.user;
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        syncBadgesForGuild(guildData, settings.timezone);
        saveBotData(data);

        const badges = guildData.badges[target.id] || [];
        await interaction.reply(`Badges for <@${target.id}>:\n${badges.length ? badges.join('\n') : 'No badges yet.'}`);
        return;
    }

    if (commandName === 'weeklyrecap') {
        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);
        const settings = getGuildSettings(guildData);
        syncBadgesForGuild(guildData, settings.timezone);
        saveBotData(data);

        const weekKeys = getLastDateKeys(7, settings.timezone);
        const entries = getLeaderboardEntries(guildData, 7, settings.timezone);
        const totalCompletions = entries.reduce((sum, entry) => sum + entry.count, 0);
        const perfectUsers = Object.entries(guildData.completions || {})
            .filter(([, userData]) => weekKeys.every(dateKey => userData.dates?.[dateKey]))
            .map(([, userData]) => userData.username);

        const embed = new EmbedBuilder()
            .setColor(0xffa115)
            .setTitle('Weekly Leetcode Recap')
            .addFields(
                { name: 'Top users this week', value: formatLeaderboard(entries) },
                { name: 'Perfect week users', value: perfectUsers.length ? perfectUsers.join('\n') : 'No perfect weeks yet.' },
                { name: 'Total completions', value: String(totalCompletions), inline: true },
                { name: 'Most solved difficulty', value: getMostSolvedDifficulty(guildData, weekKeys), inline: true }
            )
            .setFooter({ text: 'Another week, another chance to bully arrays into submission.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (['setdailychannel', 'setremindertime', 'setdailyrole', 'togglereminders'].includes(commandName)) {
        if (!isAdmin(interaction)) {
            await interaction.reply({ content: 'You need Administrator permission to use this command.', ephemeral: true });
            return;
        }

        const data = loadBotData();
        const guildData = ensureGuildData(data, interaction.guild.id);

        if (commandName === 'setdailychannel') {
            const channel = options.getChannel('channel');
            guildData.settings.reminderChannelId = channel.id;
            saveBotData(data);
            await interaction.reply({ content: `Daily reminder channel set to <#${channel.id}>.`, ephemeral: true });
            return;
        }

        if (commandName === 'setremindertime') {
            const hour = options.getInteger('hour');
            const minute = options.getInteger('minute');
            guildData.settings.dailyReminderHour = hour;
            guildData.settings.dailyReminderMinute = minute;
            saveBotData(data);
            await interaction.reply({ content: `Daily reminder time set to ${hour}:${String(minute).padStart(2, '0')}.`, ephemeral: true });
            return;
        }

        if (commandName === 'setdailyrole') {
            const role = options.getRole('role');
            guildData.settings.dailyPuzzleRoleName = role.name;
            saveBotData(data);
            await interaction.reply({ content: `Daily Puzzle role set to ${role.name}.`, ephemeral: true });
            return;
        }

        if (commandName === 'togglereminders') {
            const enabled = options.getBoolean('enabled');
            guildData.settings.enableDailyReminders = enabled;
            saveBotData(data);
            await interaction.reply({ content: `Daily reminders are now ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
            return;
        }
    }
}

client.once('ready', async () => {
    console.log('Bot is online!');
    console.log(`Logged in as ${client.user.tag}!`);

    await registerSlashCommands(client);
    startDailyReminderScheduler(client);
});

client.on('messageCreate', message => {
    if (message.author?.bot) return;

    if (message.content === '!ping') {
        message.channel.send('Pong!');
    }

    if (message.content === 'I love!') {
        message.channel.send('Cats!');
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
            return;
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'poke_button') {
                await interaction.reply('Ouch that hurts!');
            }
        }
    } catch (error) {
        console.error('Interaction error:', error);

        const message = `Something went wrong: ${error.message}`;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(message).catch(() => {});
        } else {
            await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;

        const guild = reaction.message.guild;
        if (!guild) return;

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const data = loadBotData();
        const guildData = ensureGuildData(data, guild.id);
        const settings = getGuildSettings(guildData);

        if (reaction.emoji.name === '🧩') {
            const role = guild.roles.cache.find(r => r.name === settings.dailyPuzzleRoleName);
            if (role) {
                await member.roles.add(role);
                console.log(`Assigned ${role.name} to ${user.tag}`);
            }
            return;
        }

        if (reaction.emoji.name === '✅') {
            const match = findDailyMessageByMessageId(guildData, reaction.message.id, reaction.message.channelId);

            if (match) {
                const result = await markUserDone(guild.id, user, match.dateKey, match.dailyMessage.problem);
                if (!result.alreadyCompleted) {
                    await reaction.message.channel.send(`Daily puzzle confirmed <@${user.id}> ✅`);
                }
                return;
            }

            await reaction.message.channel.send(`Daily puzzle confirmed <@${user.id}>`);
        }
    } catch (error) {
        console.error('Reaction add error:', error.message);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    try {
        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;

        const guild = reaction.message.guild;
        if (!guild) return;

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const data = loadBotData();
        const guildData = ensureGuildData(data, guild.id);
        const settings = getGuildSettings(guildData);

        if (reaction.emoji.name === '🧩') {
            const role = guild.roles.cache.find(r => r.name === settings.dailyPuzzleRoleName);
            if (role) {
                await member.roles.remove(role);
                console.log(`Removed ${role.name} from ${user.tag}`);
            }
        }

        if (reaction.emoji.name === '✅') {
            console.log('✅ reaction removed. Completion is left unchanged. Use /undone to remove a completion.');
        }
    } catch (error) {
        console.error('Reaction remove error:', error.message);
    }
});

if (!client.config.TOKEN) {
    console.error('TOKEN is missing in config.json. The bot cannot log in without it.');
    process.exit(1);
}

console.log('Logging in...');
client.login(client.config.TOKEN);
