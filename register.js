const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with pong!'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user info')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show server information'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all commands'),

  new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Rate a server member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a member to rate')
        .setRequired(true)
    )

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands('1487532645280911450'),
      { body: commands }
    );

    console.log('Slash commands registered!');
  } catch (error) {
    console.error('Register error:', error);
  }
})();