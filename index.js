// Import the discord.js module
const { Client, GatewayIntentBits, } = require('discord.js');
// const { Client, PermissionsBitField } = require('discord.js'); // Old import statement from original file

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,         // Gives access to server operations (such as bot joins/leaves, guild updates, etc.).
        GatewayIntentBits.GuildMessages,  // Allows access to receive events related to messages sent in text channels in (servers).
        GatewayIntentBits.MessageContent, // Allows the bot to access the content of messages in servers.
        GatewayIntentBits.GuildMessageReactions, // 
        GatewayIntentBits.GuildMembers,
    ]
});

// Configuration stuff, not sure what it all does yet
client.config = require('./config.json'); // Gets config options from config.json (like bot token)
client.cooldowns = new Map();
client.cache = new Map();

// Login to Discord with your app's token
console.log(`Logging in...`);
client.login(client.config.TOKEN);

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Bot is online!');
    console.log(`Logged in as ${client.user.tag}!`);

    // Not sure what this line does: commented out for now
	// require('./utils/CheckIntents.js')(client);
});

// Listen for messages and respond
client.on('messageCreate', (message) => {
    // Here, if you send "!ping", the bot will respond with "Pong!"
    if (message.content === '!ping') {
        message.channel.send('Pong!');
    }
    if (message.content === 'I love!') {
        message.channel.send('Cats!');
    }
});


// Adding slash commands

// API imports needed to register commands with discord
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Tools needed to create buttons with discord API
const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { EmbedBuilder } = require('discord.js');

// To work with web APIs
const axios = require('axios');

// Define the slash commands
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!'
    },
    {
        name: 'poke',
        description: 'Poke the bot! (Send a message with a button)'
    },
    {
        name: 'clicker',
        description: 'Starts a clicker button thing'
    },
    {
        name: 'sendreactionroles',
        description: 'Sends a message containg reaction roles.'
    },
    {
        name: 'senddailymanual',
        description: 'Manually send the daily leetcode challenge with a provided link.',
        options: [
            {
                name: 'link',  // Name of the option
                type: 3,                // STRING type
                description: 'Link of the daily Leetcode to send.',
                required: true          // This makes the input mandatory
            }
        ]
    },
];

// Register the slash commands (I don't know what this does)
const rest = new REST({ version: '10' }).setToken(client.config.TOKEN);

// When the client is ready, register the commands
client.once('ready', async () => {

    console.log(`Logged in as ${client.user.tag}!`);

    // Not entirely sure what this means, but apparently
    // it sends the commands from the const variable above
    // into discord's servers.
    try {
        console.log('Started refreshing application (/) commands.');

        // Register commands globally (for all servers)
        // await rest.put(
        //     Routes.applicationCommands(client.user.id),
        //     { body: commands }
        // );

        // Ignore for now ..
        await rest.put( // LeetCode Daily
            Routes.applicationGuildCommands(client.user.id, '1281840845800345611'),
            { body: commands }
        );
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, '1103836999732969532'),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        // If the above code somehow fails, log the error
        console.error(error);
    }
});

// Now that we have the commands in the bot, we can
// start listening to them. This event listener does that:
client.on('interactionCreate', async interaction => {
    // Command handler
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    // It's bad practice to leave all these commands in a single file like this
    // Consider moving them to a folder

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    }
    if (commandName == 'poke') {
        // Create a button
        const button = new ButtonBuilder()
            .setCustomId('poke_button')
            .setLabel('Poke me!')
            .setStyle(ButtonStyle.Primary); // Blue button

        // Create an action row to hold the button
        const row = new ActionRowBuilder().addComponents(button);

        // Reply with the button
        await interaction.reply({
            content: 'Poke me!', // Text row
            components: [row]    // Action Row
        });
    }
    if (commandName == 'clicker') {
        const button = new ButtonBuilder()
            .setCustomId('clicker_button')
            .setLabel('Click me!')
            .setStyle(ButtonStyle.Primary); // Blue button
        
        // Create an action row to hold the button
        const row = new ActionRowBuilder().addComponents(button);

        let clickCount = 0;

        // Initial user response
		const message = await interaction.reply({
			content: 'Click the button!', // Text Row
			components: [row],            // Action Row
		});

        // We use a "collector" to listen to button clicks
        // Not really sure what a collector is, or why it is used here
        const collector = message.createMessageComponentCollector({

            // This filter means that we only listen to clicks
            // from buttons with the 'clicker_button' id
            filter: i => i.customId === 'clicker_button',

            // Collector will stop after 60 seconds
            time: 60000

        });

        // Event Listener for our clicker collector
        collector.on('collect', async i => {
			clickCount++;
			await i.update({
				content: `You clicked the button ${clickCount} times!`
			});
		});
    }
    if (commandName == 'sendreactionroles') {

        const guild = interaction.guild
        // If the reaction role doesn't exist, create it
        let dailyPuzzleRole = guild.roles.cache.find(r => r.name === 'Daily Puzzle');
        if (!dailyPuzzleRole) {
            try {
                dailyPuzzleRole = await guild.roles.create({
                    name: 'Daily Puzzle',
                    color: 0,  // You can set a specific color if you like
                    reason: 'Role created for reaction role: "Daily Puzzle"'
                });
                console.log(`Created new role: ${dailyPuzzleRole.name}`);
            } catch (error) {
                console.error(`Error creating role: ${error}`);
                return;
            }
        }

        // Send roles message
        const roleMessage = await interaction.channel.send('React to receive the "Daily Puzzle" role!');

        // React with the emojis
        await roleMessage.react('🧩');

        await interaction.reply({
            content: 'Reaction roles sent!',
            ephemeral: true
        });
    }
    if (commandName == 'senddailymanual') {

        try {
            // Get the input provided by the user
            const link = options.getString('link');
            
            // Regex to get the title slug from the link to use in API
            // ex. https://leetcode.com/problems/two-sum ---> 'two-sum'
            const titleSlug = (link.match(/(?<=leetcode.com\/problems\/)[\w-]*/) || [])[0]
            if (!titleSlug) throw new Error('Invalid link!')
            
            
            let problemTitle, problemDifficulty
            // I will deal with this later
            /*

            axios.get(`https://alfa-leetcode-api.onrender.com/select?titleSlug=${titleSlug}`)
            .then(response => {
                
                console.log(response.data);

                console.log(response.data.questionId)

                // If invalid title slug was given
                if (!response.data?.questionId)
                    throw new Error('Error finding problem!')

                console.log("DID THIS RUN?")
                problemTitle = response.data.questionTitle
                problemDifficulty = response.data.difficulty

            })
            .catch(error => {
                console.error('Error fetching data:', error)
                throw error
            });
            console.log("DID THIS RUN?")

            */
            
            const sanitizedLink = 'https://leetcode.com/problems/' + titleSlug
            // Create an embed
            const embed = new EmbedBuilder()
                .setColor(0xffa115)  // Set the color of the embed
                .setTitle('Daily Leetcode')
                // .setDescription(`[${sanitizedLink}](${sanitizedLink})`)
                .setDescription(`[${titleSlug}](${sanitizedLink})`)
                // .setThumbnail(client.user.displayAvatarURL())  // Thumbnail (bot avatar)
                // .addFields(
                //     { name: 'Difficulty', value: problemDifficulty, inline: true },
                // )
                .setFooter({ text: 'React to confirm submission.', iconURL: client.user.displayAvatarURL() })  // Footer
                .setTimestamp();  // Add a timestamp to the embed

            // Send the embed to the channel where the command was issued
            const dailyMessage = await interaction.channel.send({ embeds: [embed] });
            
            // React with the emoji
            await dailyMessage.react('✅');
    
            // Reply with the provided message
            await interaction.reply({
                content: 'Daily Leetcode sent!',
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            // Send error message to the user
            await interaction.reply({ 
                content: `Unable to send message: ${error.message}`, 
                ephemeral: true // Makes the message visible only to the user
            });
        }
    }
});

// Button Interactions
client.on('interactionCreate', async interaction => {
    // Button Handler
    if (!interaction.isButton()) return;

    if (interaction.customId === 'poke_button') {
        await interaction.reply('Ouch that hurts!');
    }
})

// Reaction Roles
const roleMap = {
    '🧩': 'Daily Puzzle',  // Replace with actual role names
};

// Reaction event handler
client.on('messageReactionAdd', async (reaction, user) => {
    // Check if the reaction is in a guild (not in DMs) and it's not from a bot
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const guild = reaction.message.guild;
    const member = guild.members.cache.get(user.id);
    const roleName = roleMap[reaction.emoji.name];

    if (roleName) {
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (role) {
            await member.roles.add(role);
            console.log(`Assigned ${role.name} to ${user.tag}`);
        }
    }

    // Spaghetti way to do this, fix later
    if (reaction.emoji.name == '✅') {
        reaction.message.channel.send(`Daily puzzle confirmed <@${user.id}>`)
    }
});

// Handle reaction removal (removing the role)
client.on('messageReactionRemove', async (reaction, user) => {
    // Check if the reaction is in a guild (not in DMs) and it's not from a bot
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const guild = reaction.message.guild;
    const member = guild.members.cache.get(user.id);
    const roleName = roleMap[reaction.emoji.name];

    if (roleName) {
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (role) {
            await member.roles.remove(role);
            console.log(`Removed ${role.name} from ${user.tag}`);
        }
    }
});

// Blah blah blah

/*

// Each of these exports a function, it's the same as doing
// const ComponentLoader = require('./utils/ComponentLoader.js');
// ComponentLoader(client);
require('./utils/ComponentLoader.js')(client);
require('./utils/EventLoader.js')(client);
require('./utils/RegisterCommands.js')(client);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Here we connect to the database
// It has been moved outside of the ready event so we don't have to wait on discord
// [Application startup] -> [client.login()] -> [Discord responds] -> [Ready event] -> [Database connection]
//
// This way we can connect to the database while waiting for discord to respond
// [Application startup] -> [Database connection] -> [client.login()] -> [Discord responds] -> [Ready event]
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
const mongoose = require('mongoose');
( async function() {
	if (!client.config.mongoURL) return console.warn('MongoDB URL is not provided in the config.json file, skipping database connection...');
	await mongoose.connect(client.config.mongoURL);
})();

client.on('messageCreate', () => {} )

*/

// async function InteractionHandler(interaction, type) {

//     const component = client[type].get( interaction.customId ?? interaction.commandName );
//     if (!component) {
//         // console.error(`${type} not found: ${interaction.customId ?? interaction.commandName}`);
//         return;
//     }

//     try {
//         //command properties
//         if (component.admin) {
//             if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `⚠️ Only administrators can use this command!`, ephemeral: true });
//         }

//         if (component.owner) {
//             if (interaction.user.id !== 'YOURUSERID') return await interaction.reply({ content: `⚠️ Only bot owners can use this command!`, ephemeral: true });
//         }

//         //the mod command property requires additional setup, watch the video here to set it up: https://youtu.be/2Tqy6Cp_10I?si=bharHI_Vw7qjaG2Q

//         /*
//             COMMAND PROPERTIES:

//             module.exports = {
//                 admin: true,
//                 data: new SlashCommandBuilder()
//                 .setName('test')
//                 .setDescription('test'),
//                 async execute(interaction) { 
                
//                 }
//             }

//             You can use command properties in the module.exports statement by adding a valid property to : true,

//             VALID PROPERTIES:

//             admin : true/false
//             owner : true/false
// 			dev: true/false

//             You can add more command properties by following the prompt below and pasting it above in location with all the other statements:
            
//             if (component.propertyname) {
//                 if (logic statement logic) return await interaction.reply({ content: `⚠️ response to flag`, ephemeral: true });
//             }
//         */

//         await component.execute(interaction, client);
//     } catch (error) {
//         console.error(error);
// 		// If there is already a response, say after a deferReply(), we override the response with an error message.
//         await interaction.deferReply({ ephemeral: true }).catch( () => {} );
//         await interaction.editReply({
//             content: `There was an error while executing this command!\n\`\`\`${error}\`\`\``,
//             embeds: [],
//             components: [],
//             files: []
//         }).catch( () => {} );
//     }
// }

/*

////////////////////////////////////////////////////////////////
// These are all the entry points for the interactionCreate event.
// This will run before any command processing, perfect for logs!
////////////////////////////////////////////////////////////////
client.on('interactionCreate', async function(interaction) {
    if (!interaction.isCommand()) return;
    await InteractionHandler(interaction, 'commands');
});


client.on('interactionCreate', async function(interaction) {
    if (!interaction.isButton()) return;
    await InteractionHandler(interaction, 'buttons');
});


client.on('interactionCreate', async function(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    await InteractionHandler(interaction, 'dropdowns');
});


client.on('interactionCreate', async function(interaction) {
    if (!interaction.isModalSubmit()) return;
    await InteractionHandler(interaction, 'modals');
});

*/