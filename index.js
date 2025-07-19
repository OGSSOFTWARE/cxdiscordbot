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
      .setImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAJCAYAAABT2S4KAAAEvElEQVR4AQCBAH7/ABEsKv8RLCr/ESwq/xEsKv8SLCr/Eiwq/xMsKv8TKyn/FCsp/xQrKf8VKij/Fioo/xcpJ/8YKSf/GSgm/xooJv8bJyX/HCcl/x0mJP8eJiT/HyUj/yAlI/8iJCL/IyQi/yMjIf8kIyH/JSIg/yYiIP8mIiD/JyIg/ychH/8nIR//AIEAfv8AEC4s/xAuLP8QLiz/EC4s/xAuLP8RLiz/ES0r/xItK/8SLSv/Ey0q/xQsKv8VLCr/FSsp/xYrKf8XKij/GCoo/xkpJ/8bKSb/HCgm/x0nJf8eJyX/HyYk/yAmJP8hJSP/IiUj/yMkIv8kJCL/JCQi/yUjIf8lIyH/JSMh/yYjIf8AgQB+/wANMjD/DTIw/w0yL/8OMS//DjEv/w4xL/8PMS//DzAu/xAwLv8RMC7/ES8t/xIvLf8TLiz/FC4s/xUtK/8WLSv/Fywq/xgrKf8ZKyn/Gyoo/xwqKP8dKSf/Higm/x8oJv8gJyX/ICcl/yEnJf8iJiT/IiYk/yMmJP8jJiT/IyYj/wCBAH7/AAs2NP8LNjT/CzY0/ws1M/8MNTP/DDUz/w01M/8NNDL/DjQy/w40Mv8PMzH/EDMx/xEyMP8SMjD/EzEv/xQwLv8VMC7/Fi8t/xcuLP8YLiz/GS0r/xosKv8bLCr/HCsp/x0rKf8eKij/Hyoo/x8pJ/8gKSf/ICkn/yEpJ/8hKSf/AIEAfv8ACTo4/wk6OP8KOjj/Cjo4/wo5N/8LOTf/Czk3/ws4Nv8MODb/DTg2/w03Nf8ONzX/DzY0/xA1M/8RNTP/EjQy/xMzMf8UMzH/FTIw/xYxL/8XMS//GTAu/xovLf8bLy3/Gy4s/xwuK/8dLSv/Hi0r/x4sKv8fLCr/Hywq/x8sKv8AgQB+/wAJPjv/CT07/wk9O/8JPTv/Cj07/wo9O/8KPDr/Czw6/ww7Of8MOzn/DTo4/w46OP8POTf/EDk3/xE4Nv8SNzX/EzY0/xQ2NP8VNTP/FjQy/xczMf8YMzH/GTIw/xoxL/8bMS//HDAu/xwwLv8dLy3/Hi8t/x4vLf8eLy3/Hi4s/wCBAH7/AAlAPv8KQD7/CkA+/wpAPv8KQD7/Cz89/ws/Pf8MPzz/DD48/w0+O/8NPTv/Djw6/w88Ov8QOzn/ETo4/xI5N/8TOTf/FDg2/xU3Nf8WNjT/FzUz/xg1M/8ZNDL/GjMx/xszMf8cMjD/HTIw/x0xL/8eMS//HjEu/x8wLv8fMC7/AIEAfv8ACkJA/wtCQP8LQkD/C0JA/wtBP/8MQT//DEE//wxAPv8NQD7/Dj89/w4+PP8PPjz/ED07/xE8Ov8SPDr/Ezs5/xQ6OP8VOTf/Fjg2/xc4Nf8YNzX/GTY0/xo1M/8bNDL/HDQy/x0zMf8eMzH/HjIw/x8yMP8fMjD/HzEv/x8xL/8BgQB+/wALQ0H/C0NB/wtDQf8MQkD/DEJA/wxCQP8NQT//DUE//w5APv8OQD7/Dz89/xA/Pf8RPjz/Ej07/xM8Ov8UOzn/FTs5/xY6OP8XOTf/GDg2/xk3Nf8aNjT/GzY0/xw1M/8dNDL/HTQy/x4zMf8fMzH/HzIw/yAyMP8gMjD/IDIw/5RTpd9Ri1PFAAAAAElFTkSuQmCC')
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
