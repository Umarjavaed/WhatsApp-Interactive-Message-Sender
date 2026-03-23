// bot-manager.js - Manages multiple WhatsApp bot instances
const makeWASocket = require('@itsukichan/baileys').default;
const {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@itsukichan/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const botInstances = new Map();

async function startBot(account) {
  try {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📱 STARTING BOT: ${account.name} (${account.phoneNumber})`);
    console.log(`📂 Auth Folder: ${account.folder}`);
    console.log(`${'═'.repeat(60)}\n`);
    
    const { state, saveCreds } = await useMultiFileAuthState(account.folder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu(account.name),
      printQRInTerminal: true,
      mobile: false,
      syncFullHistory: false,
    });

    let isAuthenticated = false;

    // ── Auth ────────────────────────────────────────────────
    sock.ev.on('creds.update', () => {
      console.log(`💾 [${account.name}] Saving credentials...`);
      saveCreds();
      if (!isAuthenticated) {
        isAuthenticated = true;
        updateAccountStatus(account.id, 'connected');
      }
    });

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr, isNewLogin }) => {
      console.log(`\n📊 [${account.name}] Connection Update:`);
      console.log(`   Status: ${connection}`);
      if (qr) console.log(`   QR Available: YES ✅`);
      if (isNewLogin) console.log(`   New Login: YES`);
      
      if (qr) {
        console.log(`\n${'✨'.repeat(30)}`);
        console.log(`📲 [${account.name}] NEW QR CODE - SCAN NOW!`);
        console.log(`${'✨'.repeat(30)}\n`);
        qrcode.generate(qr, { small: true });
        
        // Generate QR code as data URL for web display
        try {
          console.log(`⏳ Generating QR image for web...`);
          const qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            width: 400,
          });
          
          const qrFile = path.join(account.folder, 'qr.json');
          fs.writeFileSync(qrFile, JSON.stringify({ 
            qr: qrDataUrl,
            timestamp: new Date().toISOString(),
            phoneNumber: account.phoneNumber
          }, null, 2));
          
          console.log(`✅ [${account.name}] QR code saved for web display`);
        } catch (err) {
          console.error(`❌ [${account.name}] Error generating QR image:`, err.message);
        }
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log(`\n❌ [${account.name}] Connection closed. Code: ${code}`);
        console.log(`Disconnect error:`, lastDisconnect?.error?.message);
        
        if (code !== DisconnectReason.loggedOut) {
          console.log(`🔄 [${account.name}] Reconnecting in 5 seconds...`);
          updateAccountStatus(account.id, 'disconnected');
          setTimeout(() => startBot(account), 5000);
        } else {
          console.log(`🚪 [${account.name}] User logged out`);
          updateAccountStatus(account.id, 'logged_out');
          // Delete credentials on logout
          try {
            const credsFile = path.join(account.folder, 'creds.json');
            if (fs.existsSync(credsFile)) {
              fs.unlinkSync(credsFile);
              console.log(`🗑️  [${account.name}] Cleared credentials`);
            }
          } catch (err) {
            console.error(`Error clearing creds: ${err.message}`);
          }
        }
      }

      if (connection === 'open') {
        console.log(`\n✅ [${account.name}] ✅ CONNECTED TO WHATSAPP! ✅\n`);
        isAuthenticated = true;
        updateAccountStatus(account.id, 'connected');
        botInstances.set(account.id, sock);
      }
    });

    // ── Handle Button Replies ───────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const jid = msg.key.remoteJid;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
        '';

      console.log(`\n📩 [${account.name}] Reply from ${jid}: ${text}`);

      try {
        const params = JSON.parse(text);

        if (params.id === 'btn_yes_connect') {
          await sock.sendMessage(jid, {
            text: '✅ Great! You have chosen to *Connect*.\nWe will get in touch with you shortly. 🚀'
          }, { quoted: msg });

        } else if (params.id === 'btn_no_connect') {
          await sock.sendMessage(jid, {
            text: '❌ No problem! You chose *Not to Connect*.\nFeel free to reach out anytime if you change your mind. 😊'
          }, { quoted: msg });
        }

      } catch {
        // Not a button reply, ignore
      }
    });

  } catch (error) {
    console.error(`\n💥 ERROR starting bot for ${account.name}:`);
    console.error(error);
  }
}

// Send message from an account
async function sendMessage(accountId, phoneNumber, message) {
  try {
    const sock = botInstances.get(accountId);
    if (!sock) {
      throw new Error('Account not connected. Please check if the account is logged in.');
    }

    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
    
    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`\n📤 Message sent from account ${accountId} to ${phoneNumber}`);
      return true;
    } catch (whatsappError) {
      // Handle specific WhatsApp errors
      if (whatsappError.message && whatsappError.message.includes('Timed Out')) {
        console.warn(`\n⚠️  Message timed out for ${phoneNumber}. This might be due to network issues or rate limiting.`);
        throw new Error('Message send timed out - WhatsApp server not responding. Try again in a moment.');
      }
      throw whatsappError;
    }
  } catch (error) {
    console.error(`\n❌ Error sending message to ${phoneNumber}:`, error.message);
    throw error;
  }
}

// Send interactive button message
async function sendButtonMessage(accountId, phoneNumber, messageBody, buttons) {
  try {
    const sock = botInstances.get(accountId);
    if (!sock) {
      throw new Error('Account not connected');
    }

    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

    // Validate buttons
    if (!Array.isArray(buttons) || buttons.length === 0 || buttons.length > 3) {
      throw new Error('Buttons must be between 1 and 3');
    }

    // Build interactive buttons in the correct format for both mobile and web
    const interactiveButtons = buttons.map((btn, index) => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: btn.displayText,
        id: btn.id || `btn_${index}_${Date.now()}`,
      }),
    }));

    // Create the message payload with proper structure
    const messagePayload = {
      text: messageBody,
      footer: '',
      interactiveButtons,
    };

    await sock.sendMessage(jid, messagePayload);
    console.log(`\n📤 Interactive button message sent from account ${accountId} to ${phoneNumber}`);
    console.log(`   Buttons: ${buttons.map(b => b.displayText).join(', ')}`);
  } catch (error) {
    console.error(`Error sending button message:`, error.message);
    throw error;
  }
}

// Update account status
function updateAccountStatus(accountId, status) {
  try {
    const accountsFile = path.join(__dirname, 'stored_login', 'accounts.json');
    if (fs.existsSync(accountsFile)) {
      const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        account.status = status;
        fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));
      }
    }
  } catch (error) {
    console.error('Error updating account status:', error);
  }
}

// Load and start all accounts on startup
function loadAndStartAllAccounts() {
  try {
    const accountsFile = path.join(__dirname, 'stored_login', 'accounts.json');
    if (fs.existsSync(accountsFile)) {
      const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
      accounts.forEach(account => {
        // Only start if credentials exist
        const credsFile = path.join(account.folder, 'creds.json');
        if (fs.existsSync(credsFile)) {
          startBot(account);
        }
      });
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

module.exports = {
  startBot,
  sendMessage,
  sendButtonMessage,
  loadAndStartAllAccounts,
  getBotInstance: (accountId) => botInstances.get(accountId)
};
