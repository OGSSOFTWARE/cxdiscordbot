require('dotenv').config();
const { Pool } = require('pg');
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

// PostgreSQL Pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Discord Bot Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// Bot is ready
client.once('ready', async () => {
  try {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Set bot status
    client.user.setPresence({
      activities: [{ name: '⭐ discord.gg/corex', type: 3 }], // Watching ogsware.com
      status: 'online'
    });

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channel = await guild.channels.fetch(process.env.REDEEM_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return console.log('❌ Redeem channel not found or not text-based.');
    }

 const embed = new EmbedBuilder()
      .setTitle('Claim Your Customer Role')
      .setDescription(`
If you have purchased through **CoreX**, please use our bot to claim the Customer role.

__**How to Claim Your Customer Role:**__
• Click the **Claim Role** button below
• Enter your **Invoice ID** when prompted
• The bot will automatically grant you the role if your invoice is **completed.**
`)
      .setColor('#05FAFA')
      .setImage('https://media.discordapp.net/attachments/1391172550934921350/1394857139759091813/profile-banner.gif?ex=687cf2b1&is=687ba131&hm=6c6433b10eea13dbe7068bfebe6bf8522d1d804be9b8277146c345cbc33879cf&=')
      .setThumbnail('https://media.discordapp.net/attachments/1391172550934921350/1394857139364823050/LOGO.png?ex=687cf2b1&is=687ba131&hm=9f01743e35ee315a589727110f94855235d7483d2f9122eddeb4a869bfff4573&=&format=webp&quality=lossless&width=864&height=864');

    const button = new ButtonBuilder()
      .setCustomId('redeem_button')
      .setLabel('📮 Redeem Invoice ID')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });
    console.log('✅ Redeem embed sent.');
  } catch (err) {
    console.error('❌ Error in ready event:', err);
  }
});

// Database helpers
async function isInvoiceUsed(invoiceId) {
  const res = await pool.query('SELECT 1 FROM used_invoices WHERE invoice_id = $1', [invoiceId]);
  return res.rowCount > 0;
}

async function saveUsedInvoice(invoiceId) {
  await pool.query('INSERT INTO used_invoices (invoice_id) VALUES ($1)', [invoiceId]);
}

// Handle interaction
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
    const invoiceId = interaction.fields.getTextInputValue('invoice_id').trim();
    console.log(`🔍 User entered invoice ID: ${invoiceId}`);

    if (await isInvoiceUsed(invoiceId)) {
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
      const invoice = data.data.find(inv => inv.unique_id === invoiceId);

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
      await saveUsedInvoice(invoiceId);

      await interaction.reply({
        content: '✅ Invoice ID successfully reedemed. You have been given the Client role!',
        ephemeral: true
      });

      const logChannel = await client.channels.fetch(process.env.REDEEM_LOG_CHANNEL_ID).catch(console.error);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle('Invoice ID Redeemed')
          .addFields(
            { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: 'Invoice ID', value: invoiceId, inline: true },
            { name: 'Status', value: invoice.status, inline: true }
          )
          .setColor('#FFFF00')
          .setTimestamp()
          .setFooter({
        text: 'OGSWare | © 2025 Copyright. All Rights Reserved.',
        iconURL: 'https://media.discordapp.net/attachments/1376632471260762112/1376632582590173315/IMG_3328.gif'
      });

        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
      }

    } catch (err) {
      console.error('❌ Error verifying invoice:', err);
      await interaction.reply({
        content: '❌ An error occurred while checking your invoice. Please try again later.',
        ephemeral: true
      });
    }
  }
});

// Log in bot
client.login(process.env.DISCORD_TOKEN);
