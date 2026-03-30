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

/*
  panelSessions tracks each /rate message:
  - who opened that panel
  - who already clicked on that panel
*/
const panelSessions = new Map();

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

function getExistingRating(targetId, raterId) {
  const ratings = loadRatings();
  return ratings[targetId]?.[raterId] ?? null;
}

/*
  Full star = ⭐
  Half star = ✮
  Empty star = ☆

  Examples:
  2.0 => ⭐⭐☆☆☆
  2.5 => ⭐⭐✮☆☆
  3.0 => ⭐⭐⭐☆☆
  4.5 => ⭐⭐⭐⭐✮
*/
function buildStarsDisplay(average) {
  if (average <= 0) return '☆☆☆☆☆';

  const roundedToHalf = Math.round(average * 2) / 2;
  const fullStars = Math.floor(roundedToHalf);
  const hasHalfStar = roundedToHalf % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return '⭐'.repeat(fullStars) + (hasHalfStar ? '✮' : '') + '☆'.repeat(emptyStars);
}

function buildRateEmbed(targetUser, viewerId = null) {
  const stats = getUserRatingStats(targetUser.id);
  const existingRating = viewerId ? getExistingRating(targetUser.id, viewerId) : null;

  const fields = [
    { name: 'Member', value: `<@${targetUser.id}>`, inline: true },
    { name: 'Average Rating', value: `${stats.average.toFixed(1)} / 5`, inline: true },
    { name: 'Total Ratings', value: `${stats.total}`, inline: true },
    { name: 'Stars', value: buildStarsDisplay(stats.average) }
  ];

  if (existingRating !== null) {
    fields.push({
      name: 'Your Current Rating',
      value: `${existingRating}⭐`,
      inline: true
    });
  }

  return new EmbedBuilder()
    .setColor(Math.floor(Math.random() * 0xffffff))
    .setTitle('⭐ Member Rating')
    .setAuthor({
      name: targetUser.tag,
      iconURL: targetUser.displayAvatarURL()
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
    .addFields(fields)
    .setFooter({ text: 'Each person only counts as one rating total. Run /rate again to update your old rating.' })
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

function cleanupPanelSessions() {
  const now = Date.now();

  for (const [messageId, data] of panelSessions.entries()) {
    if (now - data.createdAt > 1000 * 60 * 60 * 6) {
      panelSessions.delete(messageId);
    }
  }
}

client.once('ready', () => {
  ensureRatingsFile();
  console.log(`Logged in as ${client.user.tag}`);

  setInterval(cleanupPanelSessions, 1000 * 60 * 30);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('rate_')) return;

      const parts = interaction.customId.split('_');
      const targetId = parts[1];
      const ratingValue = parseInt(parts[2], 10);
      const panelMessageId = interaction.message.id;
      const userId = interaction.user.id;

      if (!targetId || !ratingValue || ratingValue < 1 || ratingValue > 5) {
        return interaction.reply({
          content: 'Invalid rating button.',
          flags: 64
        });
      }

      if (userId === targetId) {
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

      const panelData = panelSessions.get(panelMessageId);

      if (!panelData) {
        return interaction.reply({
          content: 'This rating panel expired. Run `/rate` again.',
          flags: 64
        });
      }

      // Only the person who opened this panel can use it
      if (panelData.ownerId !== userId) {
        return interaction.reply({
          content: 'This rating panel belongs to someone else. Run `/rate` yourself to make your own rating panel.',
          flags: 64
        });
      }

      // The panel owner can only use this specific panel once
      if (panelData.used) {
        return interaction.reply({
          content: 'You already used this rating panel. Run `/rate` again if you want to update your rating.',
          flags: 64
        });
      }

      const ratings = loadRatings();

      if (!ratings[targetId]) {
        ratings[targetId] = {};
      }

      const oldRating = ratings[targetId][userId] ?? null;
      ratings[targetId][userId] = ratingValue;
      saveRatings(ratings);

      panelData.used = true;

      const updatedEmbed = buildRateEmbed(targetUser, userId);
      const row = buildRateButtons(targetId);

      await interaction.update({
        embeds: [updatedEmbed],
        components: [row]
      });

      const changeText = oldRating === null
        ? `You rated **${targetUser.tag}** ${ratingValue}⭐.`
        : `You updated your rating for **${targetUser.tag}** from ${oldRating}⭐ to ${ratingValue}⭐.`;

      return interaction.followUp({
        content: `${changeText} Each person only counts as **one** rating total.`,
        flags: 64
      });
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'help') {
      await interaction.deferReply();

      const embed = new EmbedBuilder()
        .setColor(Math.floor(Math.random() * 0xffffff))
        .setTitle('🦃 Turkey Bot Commands')
        .setDescription('Here are all available commands:')
        .addFields({
          name: '⚙️ Utility',
          value: `
/ping → Check bot status
/userinfo → Get user info
/avatar → Show avatar
/serverinfo → Server stats
/help → This menu
/rate → Rate a server member
          `
        })
        .setFooter({ text: 'Turkey Bot' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'ping') {
      await interaction.deferReply();

      const embed = new EmbedBuilder()
        .setColor(Math.floor(Math.random() * 0xffffff))
        .setTitle('🏓 Pong!')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

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

      const embed = buildRateEmbed(target, interaction.user.id);
      const row = buildRateButtons(target.id);

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      panelSessions.set(reply.id, {
        ownerId: interaction.user.id,
        used: false,
        createdAt: Date.now()
      });

      return;
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