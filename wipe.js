const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');

const clientId = '1450426926849069137';
const token = fs.readFileSync('./token.txt', 'utf8').trim();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(token);

client.once('ready', async () => {
    console.log('Bot is online for wiping...');
    try {
        // 1. Clear Global Commands
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Global commands cleared.');

        // 2. Loop through every server and clear Guild commands
        for (const guild of client.guilds.cache.values()) {
            await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] });
            console.log(`Cleared: ${guild.name}`);
        }

        console.log('--- ALL COMMANDS WIPED ---');
        console.log('Wait 2 minutes, then RESTART YOUR DISCORD APP (Ctrl + R).');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
});

client.login(token);