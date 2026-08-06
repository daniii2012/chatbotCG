require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { processMessage } = require('./flows/menu');
const { getSession, getAllSessions, resetSession } = require('./db/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// ─── POST /api/message ────────────────────────────────────────────────────
// Recibe un mensaje del simulador y devuelve la respuesta del bot
app.post('/api/message', async (req, res) => {
  const { userId, message, channel = 'simulator' } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId y message son requeridos' });
  }

  try {
    const botResponse = await processMessage(userId, message);
    const session = getSession(userId);

    // Log de lo que haría cada canal real
    const channelLogs = buildChannelLogs(channel, userId, message, botResponse);

    res.json({
      response: botResponse,
      session: {
        userId: session.userId,
        flow: session.flow,
        step: session.step,
        data: session.data,
        history: session.history,
      },
      channelLogs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/session/:userId ─────────────────────────────────────────────
app.get('/api/session/:userId', (req, res) => {
  const session = getSession(req.params.userId);
  res.json(session);
});

// ─── DELETE /api/session/:userId ──────────────────────────────────────────
app.delete('/api/session/:userId', (req, res) => {
  resetSession(req.params.userId);
  res.json({ ok: true, message: 'Sesión reiniciada' });
});

// ─── GET /api/sessions ────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  res.json(getAllSessions());
});

// ─── GET /api/new-user ────────────────────────────────────────────────────
// Genera un userId aleatorio para simular nueva usuaria
app.get('/api/new-user', (req, res) => {
  res.json({ userId: uuidv4() });
});

// ─── Simulador de logs por canal ──────────────────────────────────────────
function buildChannelLogs(channel, userId, userMsg, botMsg) {
  const ts = new Date().toISOString();
  return {
    whatsapp: {
      endpoint: 'POST https://graph.facebook.com/v19.0/{phone-id}/messages',
      headers: { Authorization: 'Bearer {WHATSAPP_TOKEN}', 'Content-Type': 'application/json' },
      body: {
        messaging_product: 'whatsapp',
        to: userId,
        type: 'text',
        text: { body: botMsg },
      },
      note: 'Requiere WhatsApp Business API + número verificado',
    },
    instagram: {
      endpoint: 'POST https://graph.facebook.com/v19.0/me/messages',
      headers: { Authorization: 'Bearer {INSTAGRAM_PAGE_TOKEN}' },
      body: {
        recipient: { id: userId },
        message: { text: botMsg },
      },
      note: 'Requiere cuenta Instagram Business + Page Access Token',
    },
    facebook: {
      endpoint: 'POST https://graph.facebook.com/v19.0/me/messages',
      headers: { Authorization: 'Bearer {FACEBOOK_PAGE_TOKEN}' },
      body: {
        recipient: { id: userId },
        message: { text: botMsg },
      },
      note: 'Requiere Facebook Page + Page Access Token',
    },
    tiktok: {
      endpoint: 'POST https://business-api.tiktok.com/open_api/v1.3/message/send/',
      headers: { 'Access-Token': '{TIKTOK_ACCESS_TOKEN}' },
      body: {
        conversation_id: userId,
        message_type: 'TEXT',
        content: { text: botMsg },
      },
      note: 'Requiere TikTok Business Account + aprobación de API',
    },
    timestamp: ts,
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Casa Gaviota Chatbot corriendo en http://localhost:${PORT}`);
});

module.exports = app;
