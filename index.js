const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

// --- CONFIG & API KEYS ---
const clientId = '1450426926849069137'; 
const token = fs.readFileSync('./token.txt', 'utf8').trim();
const OLLAMA_KEY = fs.readFileSync('./OLLAMA_KEY.txt', 'utf8').trim();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// --- DATA STORAGE ---
let warns = {};
if (fs.existsSync('./warnings.json')) try { warns = JSON.parse(fs.readFileSync('./warnings.json')); } catch (e) {}
function saveWarns() { fs.writeFileSync('./warnings.json', JSON.stringify(warns, null, 2)); }

// --- AUTHORIZED USERS FOR ROBO; ---
const authorizedUsers = ['durbot0586', 'durbo._.alt']; 

// --- COMMAND DEFINITIONS ---
const commands = [
    new SlashCommandBuilder().setName('ai').setDescription('Ask Robo a question').addStringOption(o => o.setName('query').setDescription('Your question').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Warn a member').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('purge').setDescription('Delete messages').addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder().setName('hug').setDescription('Hug someone').addUserOption(o => o.setName('target').setDescription('Who to hug').setRequired(true)),
    new SlashCommandBuilder().setName('slap').setDescription('Slap someone').addUserOption(o => o.setName('target').setDescription('Who to slap').setRequired(true)),
    new SlashCommandBuilder().setName('kill').setDescription('End someone (RP)').addUserOption(o => o.setName('target').setDescription('Who to kill').setRequired(true)),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Show server stats'),
    new SlashCommandBuilder().setName('role').setDescription('Add/Remove role').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
].map(c => c.toJSON());

// --- READY & SYNC ---
client.once('client.ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('🚀 Commands Synced!');
    } catch (e) { console.error(e); }
    client.user.setActivity("Ollama Cloud", { type: ActivityType.Listening });
});

// --- ROBO; ROLEPLAY LOGIC ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const prefix = "robo;";
    if (message.content.toLowerCase().startsWith(prefix)) {
        if (!authorizedUsers.includes(message.author.username)) return;
        const say = message.content.slice(prefix.length).trim();
        if (!say) return;
        try {
            await message.delete();
            await message.channel.send(say);
        } catch (e) { console.log("Missing perms."); }
    }
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    try {
        // AI LOGIC (FULLY UPDATED FOR 2026 CLOUD API)
        if (commandName === 'ai') {
            await interaction.deferReply();
            const query = options.getString('query');
            
            try {
                const res = await axios.post('https://ollama.com/api/chat', {
                    model: 'gpt-oss:20b-cloud', 
                    messages: [{ role: 'user', content: query }],
                    stream: false 
                }, { 
                    headers: { 'Authorization': `Bearer ${OLLAMA_KEY}` }, 
                    timeout: 60000 // Give it a full minute

                });
                
                // Fixed data extraction for Ollama's native API
                const aiResponse = res.data.message?.content || "The AI thought of nothing...";
                return await interaction.editReply(aiResponse);
                
            } catch (e) { 
                console.error("Ollama API Error:", e.response?.data || e.message);
                return await interaction.editReply("🐢 The Cloud is extra slow today. Try again in a minute!"); 
            }
        }

        // MODERATION & OTHER COMMANDS
        if (commandName === 'warn') {
            const target = options.getUser('target');
            const reason = options.getString('reason') || "No reason.";
            if (!warns[target.id]) warns[target.id] = [];
            warns[target.id].push({ mod: interaction.user.tag, reason, date: new Date().toLocaleDateString() });
            saveWarns();
            return interaction.reply(`⚠️ Warned **${target.tag}** | ${reason}`);
        }

        if (commandName === 'kick') {
            const target = options.getMember('target');
            if (!target.kickable) return interaction.reply({ content: "❌ I cannot kick this user.", ephemeral: true });
            await target.kick();
            return interaction.reply(`👢 Kicked **${target.user.tag}**`);
        }

        if (commandName === 'ban') {
            const target = options.getMember('target');
            if (!target.bannable) return interaction.reply({ content: "❌ I cannot ban this user.", ephemeral: true });
            await target.ban();
            return interaction.reply(`🔨 Banned **${target.user.tag}**`);
        }

        if (commandName === 'purge') {
            const amt = options.getInteger('amount');
            if (amt < 1 || amt > 100) return interaction.reply({ content: "❌ Choose 1-100.", ephemeral: true });
            await interaction.channel.bulkDelete(amt, true);
            return interaction.reply({ content: `🧹 Cleared ${amt} messages.`, ephemeral: true });
        }

        if (['hug', 'slap', 'kill'].includes(commandName)) {
            const target = options.getUser('target');
            const responses = { 
                hug: `🤗 **${interaction.user.username}** hugged **${target.username}**!`, 
                slap: `🖐️ **${interaction.user.username}** slapped **${target.username}**!`, 
                kill: `☠️ **${interaction.user.username}** eliminated **${target.username}**!` 
            };
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription(responses[commandName]).setColor(0xFF69B4)] });
        }

        if (commandName === 'serverinfo') {
            const embed = new EmbedBuilder().setTitle(guild.name).setThumbnail(guild.iconURL()).addFields({ name: 'Members', value: `${guild.memberCount}`, inline: true }, { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true }).setColor(0x00AE86);
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'role') {
            const target = options.getMember('target');
            const role = options.getRole('role');
            if (target.roles.cache.has(role.id)) { await target.roles.remove(role); return interaction.reply(`❌ Removed **${role.name}**`); }
            else { await target.roles.add(role); return interaction.reply(`✅ Added **${role.name}**`); }
        }

    } catch (err) {
        console.error("Global Interaction Error:", err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ Something went wrong!", ephemeral: true });
        }
    }
});

client.login(token);
