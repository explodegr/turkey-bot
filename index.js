const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

const ratingsFile = path.join(__dirname, 'ratings.json');

function ensureRatingsFile() {
  if (!fs.existsSync(ratingsFile)) {
    fs.writeFileSync(ratingsFile, JSON.stringify({}, null, 2));
  }
}

function loadRatings() {
  ensureRatingsFile();
  try {
    const data = fs.readFileSync(ratingsFile, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error('Error reading ratings.json:', error);
    return {};
  }
}

function saveRatings(data) {
  try {
    fs.writeFileSync(ratingsFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing ratings.json:', error);
  }
}

function getUserRatingStats(targetId) {
  const ratings = loadRatings();
  const userRatings = ratings[targetId] || {};
  const values = Object.values(userRatings);

  if (values.length === 0) {
    return {
      average: 0,
      total: 0
    };
  }

  const totalScore = values.reduce((sum, value) => sum + value, 0);
  const average = totalScore / values.length;

  return {
    average,
    total: values.length
  };
}

function buildStarsDisplay(average) {
  if (average <= 0) return '☆☆☆☆☆';
  const rounded = Math.round(average);
  return '⭐'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function buildRateEmbed(targetUser) {
  const stats = getUserRatingStats(targetUser.id);

  return new EmbedBuilder()
    .setColor(Math.floor(Math.random() * 0xffffff))
    .setTitle('⭐ Member Rating')
    .setAuthor({
      name: targetUser.tag,
      iconURL: targetUser.displayAvatarURL()
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
    .addFields(
      { name: 'Member', value: `<@${targetUser.id}>`, inline: true },
      { name: 'Average Rating', value: `${stats.average.toFixed(1)} / 5`, inline: true },
      { name: 'Total Ratings', value: `${stats.total}`, inline: true },
      { name: 'Stars', value: buildStarsDisplay(stats.average) }
    )
    .setFooter({ text: 'Click a button below to rate this member' })
    .setTimestamp();
}

function buildRateButtons(targetId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rate_${targetId}_1`)
      .setLabel('1⭐')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`rate_${targetId}_2`)
      .setLabel('2⭐')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`rate_${targetId}_3`)
      .setLabel('3⭐')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`rate_${targetId}_4`)
      .setLabel('4⭐')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`rate_${targetId}_5`)
      .setLabel('5⭐')
      .setStyle(ButtonStyle.Secondary)
  );
}

client.once('ready', () => {
  ensureRatingsFile();
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // BUTTONS
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('rate_')) return;

      const parts = interaction.customId.split('_');
      const targetId = parts[1];
      const ratingValue = parseInt(parts[2], 10);

      if (!targetId || !ratingValue || ratingValue < 1 || ratingValue > 5) {
        return interaction.reply({
          content: 'Invalid rating button.',
          flags: 64
        });
      }

      if (interaction.user.id === targetId) {
        return interaction.reply({
          content: 'You cannot rate yourself.',
          flags: 64
        });
      }

      const targetUser = await client.users.fetch(targetId).catch(() => null);

      if (!targetUser) {
        return interaction.reply({
          content: 'That user could not be found.',
          flags: 64
        });
      }

      if (targetUser.bot) {
        return interaction.reply({
          content: 'You cannot rate bots.',
          flags: 64
        });
      }

      const ratings = loadRatings();

      if (!ratings[targetId]) {
        ratings[targetId] = {};
      }

      ratings[targetId][interaction.user.id] = ratingValue;
      saveRatings(ratings);

      const updatedEmbed = buildRateEmbed(targetUser);
      const row = buildRateButtons(targetId);

      await interaction.update({
        embeds: [updatedEmbed],
        components: [row]
      });

      return interaction.followUp({
        content: `You rated **${targetUser.tag}** ${ratingValue}⭐`,
        flags: 64
      });
    }

    // SLASH COMMANDS
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
/rate → Rate a server member
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

    // RATE
    if (interaction.commandName === 'rate') {
      await interaction.deferReply();

      const target = interaction.options.getUser('user');

      if (!target) {
        return interaction.editReply({ content: 'Please select a user to rate.' });
      }

      if (target.bot) {
        return interaction.editReply({ content: 'You cannot rate bots.' });
      }

      if (target.id === interaction.user.id) {
        return interaction.editReply({ content: 'You cannot rate yourself.' });
      }

      const embed = buildRateEmbed(target);
      const row = buildRateButtons(target.id);

      return interaction.editReply({
        embeds: [embed],
        components: [row]
      });
    }
  } catch (error) {
    console.error('Interaction error:', error);

    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({
        content: 'Something went wrong while processing that interaction.',
        flags: 64
      }).catch(() => {});
    }

    return interaction.reply({
      content: 'Something went wrong while processing that interaction.',
      flags: 64
    }).catch(() => {});
  }
});

client.login(process.env.TOKEN);