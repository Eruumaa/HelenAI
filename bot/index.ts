import { 
  Client, 
  GatewayIntentBits, 
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';
import { getChatResponse } from './ai';
import { checkAutoMod } from './automod';
import { handleMusicCommand, handleMusicInteraction } from './music';

export async function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.warn("No DISCORD_TOKEN found. Bot will not start.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ]
  });

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`🤖 Ready! Logged in as ${readyClient.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(token);
    const commands = [
      new SlashCommandBuilder().setName('help').setDescription('Shows the help menu'),
      new SlashCommandBuilder().setName('play').setDescription('Plays a song').addStringOption(option => 
        option.setName('query').setDescription('The song name or URL').setRequired(true)
      ),
      new SlashCommandBuilder().setName('skip').setDescription('Skips the current song'),
      new SlashCommandBuilder().setName('stop').setDescription('Stops the music and leaves the channel'),
      new SlashCommandBuilder().setName('list').setDescription('Shows the music queue'),
      new SlashCommandBuilder().setName('seek').setDescription('Menampilkan control lagu yang sedang diputar'),
      new SlashCommandBuilder().setName('chat').setDescription('Chat with the AI').addStringOption(option => 
        option.setName('message').setDescription('Your message to the AI').setRequired(true)
      ),
    ];
    
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(readyClient.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error("Error registering slash commands:", error);
    }
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    // Basic welcome (you can integrate the AI welcome from server.ts here!)
    const systemChannel = member.guild.systemChannel;
    if (systemChannel) {
      systemChannel.send(`Welcome to the server, ${member.user.username}!`);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;
      
      if (command === 'help') {
        const embed = new EmbedBuilder()
          .setColor('#2b2d31')
          .setAuthor({ name: `${client.user!.username} ✨ Help Panel`, iconURL: client.user!.displayAvatarURL() })
          .setDescription(`🚀 **How to play music**\n\`/play <name/url>\`\n\n❓ **What is ${client.user!.username}?**\nA Next-Generation Discord Bot With Many Awesome Features, Buttons, Menus, and Support for Many Sources.\n\n📑 **Command Categories:**\nℹ️ : **Information**\n🎵 : **Music**\n🤖 : **AI Chat**`)
          .setFooter({ text: `Thank you for selecting ${client.user!.username} ✨!`, iconURL: client.user!.displayAvatarURL() });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('help_category_select')
          .setPlaceholder('🎧 | Select to view the commands.')
          .addOptions([
              { label: 'Information', value: 'info', emoji: 'ℹ️' },
              { label: 'Music', value: 'music', emoji: '🎵' },
              { label: 'AI Chat', value: 'ai', emoji: '🤖' },
          ]);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (command === 'chat') {
        await interaction.deferReply();
        const message = interaction.options.getString('message', true);
        const responseText = await getChatResponse(
            interaction.channelId, 
            interaction.user.displayName || interaction.user.username, 
            message
        );
        await interaction.editReply(responseText);
        return;
      }

      if (['play', 'skip', 'stop', 'list', 'seek'].includes(command)) {
        try {
          await handleMusicCommand(interaction as any);
        } catch (error) {
          console.error("Music command error:", error);
          if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: "An error occurred while executing the music command.", ephemeral: true }).catch(console.error);
          }
        }
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
      const category = interaction.values[0];
      
      let embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setAuthor({ name: `${client.user!.username} ✨ Click to see command`, iconURL: client.user!.displayAvatarURL() })
        .setThumbnail(client.user!.displayAvatarURL());

      if (category === 'info') {
        embed.setDescription(`**Categories » Information**\n\n\`\`\`\nHere are the information commands:\n\`\`\`\nℹ️ **Commands Total [ 1 ]**\n\`help\``);
      } else if (category === 'music') {
        embed.setDescription(`**Categories » Music**\n\n\`\`\`\nHere are the music commands:\n\`\`\`\n🎵 **Commands Total [ 4 ]**\n\`play\` | \`skip\` | \`stop\` | \`list\``);
      } else if (category === 'ai') {
        embed.setDescription(`**Categories » AI Chat**\n\n\`\`\`\nHere are the AI commands:\n\`\`\`\n🤖 **Commands Total [ 1 ]**\n\`@${client.user!.username} <message>\``);
      }

      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.isButton()) {
      await handleMusicInteraction(interaction);
    }
  });

  await client.login(token);
}
