const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

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
    ),

  new SlashCommandBuilder()
    .setName('tax')
    .setDescription('Estimate after-tax income (US only)')
    .addNumberOption(option =>
      option.setName('income')
        .setDescription('Annual gross income in USD')
        .setRequired(true)
        .setMinValue(0)
    )
    .addStringOption(option =>
      option.setName('state')
        .setDescription('Your U.S. state')
        .setRequired(true)
        .addChoices(
          { name: 'Alaska', value: 'AK' },
          { name: 'Arizona', value: 'AZ' },
          { name: 'Colorado', value: 'CO' },
          { name: 'Florida', value: 'FL' },
          { name: 'Illinois', value: 'IL' },
          { name: 'Indiana', value: 'IN' },
          { name: 'Kentucky', value: 'KY' },
          { name: 'Massachusetts', value: 'MA' },
          { name: 'Michigan', value: 'MI' },
          { name: 'Nevada', value: 'NV' },
          { name: 'New Hampshire', value: 'NH' },
          { name: 'North Carolina', value: 'NC' },
          { name: 'Pennsylvania', value: 'PA' },
          { name: 'South Dakota', value: 'SD' },
          { name: 'Tennessee', value: 'TN' },
          { name: 'Texas', value: 'TX' },
          { name: 'Utah', value: 'UT' },
          { name: 'Washington', value: 'WA' },
          { name: 'Wyoming', value: 'WY' }
        )
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
