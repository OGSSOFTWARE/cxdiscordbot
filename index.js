require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { fetch } = require('undici');

const USED_INVOICES_PATH = path.join(__dirname, 'used_invoices.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

function getUsedInvoices() {
  if (!fs.existsSync(USED_INVOICES_PATH)) return [];
  return JSON.parse(fs.readFileSync(USED_INVOICES_PATH));
}

function saveUsedInvoice(id) {
  const used = getUsedInvoices();
  used.push(id);
  fs.writeFileSync(USED_INVOICES_PATH, JSON.stringify(used, null, 2));
}

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId === 'redeem_button') {
    const modal = new ModalBuilder()
      .setCustomId('redeem_modal')
      .setTitle('Enter Your Invoice ID');

    const invoiceInput = new TextInputBuilder()
      .setCustomId('invoice_id')
      .setLabel('SellAuth Invoice ID')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(invoiceInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'redeem_modal') {
    const invoiceId = interaction.fields.getTextInputValue('invoice_id');
    console.log(`🔍 User entered invoice ID: ${invoiceId}`);

    const used = getUsedInvoices();
    if (used.includes(invoiceId)) {
      return await interaction.reply({
        content: '⚠️ This invoice has already been redeemed.',
        ephemeral: true
      });
    }

    try {
      const url = `https://api.sellauth.com/v1/shops/${process.env.SHOP_ID}/invoices`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.SELLAUTH_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const raw = await response.text();
      console.log('📦 Raw SellAuth response:', raw);

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status}`);
      }

      const data = JSON.parse(raw);
      const invoice = data.data.find(inv => inv.unique_id === invoiceId.trim());

      if (!invoice) {
        return await interaction.reply({ content: '❌ Invoice not found.', ephemeral: true });
      }

      if (invoice.status !== 'completed') {
        return await interaction.reply({ content: '⏳ This invoice is not completed yet.', ephemeral: true });
      }

      const role = interaction.guild.roles.cache.get(process.env.CLIENT_ROLE_ID);
      if (!role) {
        return await interaction.reply({ content: '⚠️ "Client" role not found.', ephemeral: true });
      }

      await interaction.member.roles.add(role);
      saveUsedInvoice(invoiceId);

      await interaction.reply({
        content: '✅ Invoice verified. You have been given the Client role!',
        ephemeral: true
      });
    } catch (err) {
      console.error('❌ Error verifying invoice:', err);
      await interaction.reply({
        content: '❌ An error occurred while checking your invoice. Please try again later.',
        ephemeral: true
      });
    }
  }
});

client.on('ready', async () => {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = guild.channels.cache.get(process.env.REDEEM_CHANNEL_ID);
  if (!channel) return console.log('❌ Redeem channel not found.');

  const embed = new EmbedBuilder()
    .setTitle('Reedem Invoice ID')
    .setDescription(`
Unlock a world of exclusive benefits by redeeming your Invoice ID today! As a verified client, you’ll gain immediate access to a range of premium features designed to enhance your experience, including:

- Exclusive Giveaways
- Private Chat Channels
- Priority Support & Features
`)
    .setColor('#FF006A')
    .setImage('https://media.discordapp.net/attachments/1376632471260762112/1386038563212234893/IMG_4172.gif?ex=68584080&is=6856ef00&hm=0bea7264c461cebcea453b096a0516edc9ef1dcf580e55ad3b6f23d7f830a74e&=')
    .setThumbnail('https://media.discordapp.net/attachments/1376632471260762112/1386040972512592083/image.png?ex=685842bf&is=6856f13f&hm=70fdf4e2793b4416551739b34df7f6b9cc68480bd25ff12613de232317f6e9ae&=&format=webp&quality=lossless&width=968&height=968')

  const button = new ButtonBuilder()
    .setCustomId('redeem_button')
    .setLabel('Redeem Invoice ID')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button);
  await channel.send({ embeds: [embed], components: [row] });
  console.log('Redeem message sent.');
});

client.login(process.env.DISCORD_TOKEN);
