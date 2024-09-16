const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready', 
    once: true,
    async execute(client) { 
        client.user.setActivity({
            name: '🌍 Turning on using dev toolkit',
            type: ActivityType.Custom,
         //   url: 'https://www.twitch.tv/discord'
        });
    },
};

