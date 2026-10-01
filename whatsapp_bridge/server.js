import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

const app = express();
app.use(cors());
app.use(express.json());

const logger = pino({ level: 'silent' });

let sock = null;
let connectionState = 'DISCONNECTED'; // 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTED'
let lastQrDataUrl = null;
let connectedUser = null;
let qrResolvers = [];

function notifyQrReady(qrUrl) {
  while (qrResolvers.length > 0) {
    const resolve = qrResolvers.shift();
    resolve(qrUrl);
  }
}

async function connectToWhatsApp() {
  try {
    if (sock) {
      try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.end(undefined);
      } catch {}
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: false,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionState = 'SCAN_QR';
        try {
          lastQrDataUrl = await qrcode.toDataURL(qr, { scale: 7, margin: 2 });
          notifyQrReady(lastQrDataUrl);
          console.log('[WhatsApp Bridge] New QR code generated successfully');
        } catch (err) {
          console.error('[WhatsApp Bridge] Failed to render QR to data URL:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp Bridge] Connection closed. StatusCode: ${statusCode}, Reconnect: ${shouldReconnect}`);

        connectionState = 'DISCONNECTED';
        lastQrDataUrl = null;
        connectedUser = null;

        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 2500);
        } else {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          setTimeout(connectToWhatsApp, 2000);
        }
      } else if (connection === 'open') {
        connectionState = 'CONNECTED';
        lastQrDataUrl = null;
        const user = sock.user;
        connectedUser = {
          id: user?.id ? user.id.split(':')[0] : 'Unknown',
          name: user?.name || user?.notify || 'WhatsApp User'
        };
        console.log(`[WhatsApp Bridge] Connected as +${connectedUser.id} (${connectedUser.name})`);
      }
    });
  } catch (err) {
    console.error('[WhatsApp Bridge] Error initializing connection:', err);
    connectionState = 'DISCONNECTED';
    setTimeout(connectToWhatsApp, 3000);
  }
}

// ---------------- REST API ----------------

// 1. Get connection status & live QR code
app.get('/status', (req, res) => {
  res.json({
    status: connectionState,
    qr: lastQrDataUrl,
    user: connectedUser,
    has_session: fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0
  });
});

// 2. Explicitly request / refresh QR code
app.post(['/refresh-qr', '/reset'], async (req, res) => {
  console.log('[WhatsApp Bridge] Received reset/refresh-qr request');
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch {}
      try {
        sock.end(undefined);
      } catch {}
      sock = null;
    }
  } catch {}

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}

  connectionState = 'DISCONNECTED';
  lastQrDataUrl = null;
  connectedUser = null;

  // Start fresh connection
  connectToWhatsApp();

  // Wait up to 5 seconds for the first QR code to be generated
  const waitForQr = new Promise((resolve) => {
    if (lastQrDataUrl) return resolve(lastQrDataUrl);
    const timeout = setTimeout(() => resolve(null), 5000);
    qrResolvers.push((qr) => {
      clearTimeout(timeout);
      resolve(qr);
    });
  });

  const generatedQr = await waitForQr;

  res.json({
    success: true,
    status: connectionState,
    qr: generatedQr || lastQrDataUrl,
    user: connectedUser
  });
});

// 3. Send message directly through linked WhatsApp account
app.post('/send', async (req, res) => {
  const { number, message } = req.body;

  if (connectionState !== 'CONNECTED' || !sock) {
    return res.status(400).json({
      success: false,
      error: 'WhatsApp is not connected. Please scan the QR code in Integrations first.'
    });
  }

  if (!number || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: number, message'
    });
  }

  try {
    let cleanNumber = String(number).replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('00')) {
      cleanNumber = cleanNumber.substring(2);
    }

    if (cleanNumber.length < 8) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number digits: ${cleanNumber}`
      });
    }

    const jid = `${cleanNumber}@s.whatsapp.net`;
    console.log(`[WhatsApp Bridge] Dispatching message to ${jid}`);

    const sent = await sock.sendMessage(jid, { text: message });
    const messageId = sent?.key?.id || `wamid_baileys_${Date.now()}`;

    res.json({
      success: true,
      provider_message_id: messageId,
      status: 'SENT',
      recipient: cleanNumber
    });
  } catch (err) {
    console.error('[WhatsApp Bridge] Error sending message via Baileys:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch message via WhatsApp'
    });
  }
});

// 4. Logout / Unlink session
app.post('/logout', async (req, res) => {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch {}
      try {
        sock.end(undefined);
      } catch {}
      sock = null;
    }
  } catch {}
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}
  connectionState = 'DISCONNECTED';
  lastQrDataUrl = null;
  connectedUser = null;
  setTimeout(connectToWhatsApp, 1500);
  res.json({ success: true, message: 'Logged out successfully' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`WhatsApp Bridge running on http://127.0.0.1:${PORT}`);
  connectToWhatsApp();
});
