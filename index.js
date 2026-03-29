const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // HELP
  if (interaction.commandName === 'help') {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(Math.floor(Math.random() * 0xffffff))
      .setTitle('🦃 Turkey Bot Commands')
      .setDescription('Here are all available commands:')
      .addFields(
        {
          name: '⚙️ Utility',
          value: `
/ping → Check bot status
/userinfo → Get user info
/avatar → Show avatar
/serverinfo → Server stats
/help → This menu
          `
        },
        {
          name: '🛡️ Moderation',
          value: `
/kick → Kick a member
/ban → Ban a member
/timeout → Timeout a member
/untimeout → Remove timeout
          `
        }
      )
      .setFooter({ text: 'Turkey Bot' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // PING
  if (interaction.commandName === 'ping') {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(Math.floor(Math.random() * 0xffffff))
      .setTitle('🏓 Pong!')
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // USERINFO
  if (interaction.commandName === 'userinfo') {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id);

    const roles = member.roles.cache
      .filter(role => role.id !== interaction.guild.id)
      .map(role => role.toString())
      .join(', ') || 'None';

    const boosting = member.premiumSince ? 'Yes ✅' : 'No ❌';

    const perms = [];
    if (member.permissions.has(PermissionFlagsBits.Administrator)) perms.push('Administrator');
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) perms.push('Manage Server');
    if (member.permissions.has(PermissionFlagsBits.ManageChannels)) perms.push('Manage Channels');
    if (member.permissions.has(PermissionFlagsBits.ManageRoles)) perms.push('Manage Roles');
    if (member.permissions.has(PermissionFlagsBits.KickMembers)) perms.push('Kick Members');
    if (member.permissions.has(PermissionFlagsBits.BanMembers)) perms.push('Ban Members');
    if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) perms.push('Moderate Members');
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) perms.push('Manage Messages');

    const embed = new EmbedBuilder()
      .setColor(Math.floor(Math.random() * 0xffffff))
      .setTitle('👤 User Info')
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
      .setThumbnail(target.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: 'Username', value: target.tag, inline: true },
        { name: 'User ID', value: target.id, inline: true },
        { name: 'Boosting', value: boosting, inline: true },
        { name: 'Permissions', value: perms.join(', ') || 'None' },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` },
        { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>` },
        { name: 'Roles', value: roles }
      )
      .setFooter({ text: 'Turkey Bot' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // AVATAR
  if (interaction.commandName === 'avatar') {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setColor(Math.floor(Math.random() * 0xffffff))
      .setTitle(`🖼️ ${target.username}'s Avatar`)
      .setImage(target.displayAvatarURL({ size: 1024 }))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // SERVER INFO
  if (interaction.commandName === 'serverinfo') {
    await interaction.deferReply();

    const guild = interaction.guild;

    await guild.members.fetch();

    const owner = await guild.fetchOwner();
    const boosts = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier;
    const channelCount = guild.channels.cache.size;
    const roleCount = guild.roles.cache.size;

    const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const idle = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
    const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;

    const embed = new EmbedBuilder()
      .setColor(Math.floor(Math.random() * 0xffffff))
      .setTitle('🏠 Server Info')
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .addFields(
        { name: 'Server Name', value: guild.name, inline: true },
        { name: 'Server ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${owner.id}>`, inline: true },

        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Online', value: `${online}`, inline: true },
        { name: 'Idle', value: `${idle}`, inline: true },
        { name: 'DND', value: `${dnd}`, inline: true },

        { name: 'Boosts', value: `${boosts}`, inline: true },
        { name: 'Boost Level', value: `Level ${boostTier}`, inline: true },

        { name: 'Channels', value: `${channelCount}`, inline: true },
        { name: 'Roles', value: `${roleCount}`, inline: true },

        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` }
      )
      .setFooter({ text: 'Turkey Bot' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // KICK
  if (interaction.commandName === 'kick') {
    await interaction.deferReply({ flags: 64 });

    try {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason';

      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return interaction.editReply({ content: 'No permission' });
      }

      if (!target || !target.kickable) {
        return interaction.editReply({ content: 'Cannot kick this user' });
      }

      await target.kick(reason);
      return interaction.editReply({ content: `👢 Kicked ${target.user.tag}` });
    } catch (error) {
      console.error('Kick error:', error);
      return interaction.editReply({
        content: 'I could not kick that user. Check my role position and permissions.'
      });
    }
  }

  // BAN
  if (interaction.commandName === 'ban') {
    await interaction.deferReply({ flags: 64 });

    try {
      const user = interaction.options.getUser('user');
      const targetMember = interaction.guild.members.cache.get(user.id);
      const reason = interaction.options.getString('reason') || 'No reason';

      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.editReply({ content: 'No permission' });
      }

      if (targetMember && !targetMember.bannable) {
        return interaction.editReply({ content: 'Cannot ban this user' });
      }

      await interaction.guild.members.ban(user.id, { reason });
      return interaction.editReply({ content: `🔨 Banned ${user.tag}` });
    } catch (error) {
      console.error('Ban error:', error);
      return interaction.editReply({
        content: 'I could not ban that user. Check my role position and permissions.'
      });
    }
  }

  // TIMEOUT
  if (interaction.commandName === 'timeout') {
    await interaction.deferReply({ flags: 64 });

    try {
      const target = interaction.options.getMember('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason';

      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.editReply({ content: 'No permission' });
      }

      if (!target || !target.moderatable) {
        return interaction.editReply({ content: 'Cannot timeout this user' });
      }

      await target.timeout(minutes * 60 * 1000, reason);
      return interaction.editReply({ content: `⏳ Timed out ${target.user.tag} for ${minutes}m` });
    } catch (error) {
      console.error('Timeout error:', error);
      return interaction.editReply({
        content: 'I could not timeout that user. Check my role position and permissions.'
      });
    }
  }

  // UNTIMEOUT
  if (interaction.commandName === 'untimeout') {
    await interaction.deferReply({ flags: 64 });

    try {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason';

      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.editReply({ content: 'No permission' });
      }

      if (!target || !target.moderatable) {
        return interaction.editReply({ content: 'Cannot remove timeout from this user' });
      }

      await target.timeout(null, reason);
      return interaction.editReply({ content: `✅ Removed timeout from ${target.user.tag}` });
    } catch (error) {
      console.error('Untimeout error:', error);
      return interaction.editReply({
        content: 'I could not remove the timeout from that user. Check my role position and permissions.'
      });
    }
  }
});

client.login(process.env.TOKEN);