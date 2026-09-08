require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { processMessage } = require('./flows/menu');
const { getSession, getAllSessions, resetSession } = require('./db/sessions');
const { FILE_PATH: EXCEL_PATH } = require('./db/excel');
const { getRegisteredEmails } = require('./db/mongo');
const { sendNotificationEmail } = require('./senders/email');
const { sendWhatsAppMessage } = require('./senders/whatsapp');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta estatica public para la interfaz admin.html
app.use(express.static('public'));

// Configurar almacenamiento para imagenes subidas desde el panel
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `flyer-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Middleware de autenticacion para endpoints de API
function requireApiKey(req, res, next) {
  const claveEnviada = req.headers['x-api-key'];
  const claveCorrecta = process.env.ADMIN_API_KEY;

  if (!claveCorrecta) {
    return res.status(500).json({ error: 'El servidor no tiene configurada la clave de administracion.' });
  }

  if (claveEnviada !== claveCorrecta) {
    return res.status(401).json({ error: 'No autorizado. Falta o es incorrecta la clave de acceso.' });
  }

  next();
}

// ─── RUTAS DEL PANEL DE ADMINISTRACION ───────────────────────────────────

// Login del panel web (admin.html)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY;

  if (!adminPass) {
    return res.status(500).json({ success: false, error: 'Contrasena de administrador no configurada' });
  }

  if (password === adminPass) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'Contrasena incorrecta' });
});

// Envio masivo de correos desde la interfaz admin
app.post('/api/admin/send-campaign', upload.single('imagen'), async (req, res) => {
  try {
    const { asunto, mensaje, enlace } = req.body;

    if (!asunto || !mensaje) {
      return res.status(400).json({ success: false, error: 'El asunto y el mensaje son obligatorios.' });
    }

    const destinatarios = await getRegisteredEmails();

    if (!destinatarios || destinatarios.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay correos registrados en la base de datos.' });
    }

    // Construccion del banner/imagen en el HTML si se subio un archivo
    let imageHtml = '';
    if (req.file) {
      const host = req.get('host');
      const protocol = req.protocol;
      const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      imageHtml = `<div style="text-align: center; margin: 20px 0;"><img src="${imageUrl}" alt="Flyer" style="max-width: 100%; height: auto; border-radius: 8px;"></div>`;
    }

    // Construccion de boton si hay un enlace opcional
    let buttonHtml = '';
    if (enlace) {
      buttonHtml = `
        <div style="text-align: center; margin-top: 25px;">
          <a href="${enlace}" target="_blank" style="background-color: #2b5b84; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver mas informacion</a>
        </div>
      `;
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #2b5b84; text-align: center;">Casa Gaviota A.C.</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
        <p style="font-size: 16px; line-height: 1.5; white-space: pre-wrap;">${mensaje}</p>
        ${imageHtml}
        ${buttonHtml}
      </div>
    `;

    // Enviar correo a la lista recuperada de Mongo
    for (const email of destinatarios) {
      await sendNotificationEmail(email, asunto, htmlBody);
    }

    res.json({ success: true, total: destinatarios.length });
  } catch (error) {
    console.error('Error al enviar campana masiva:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/message ────────────────────────────────────────────────────
app.post('/api/message', async (req, res) => {
  const { userId, message, channel = 'simulator' } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId y message son requeridos' });
  }

  try {
    const botResponse = await processMessage(userId, message);
    const session = getSession(userId);

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
app.get('/api/session/:userId', requireApiKey, (req, res) => {
  const session = getSession(req.params.userId);
  res.json(session);
});

// ─── DELETE /api/session/:userId ──────────────────────────────────────────
app.delete('/api/session/:userId', (req, res) => {
  resetSession(req.params.userId);
  res.json({ ok: true, message: 'Sesion reiniciada' });
});

// ─── GET /api/sessions ────────────────────────────────────────────────────
app.get('/api/sessions', requireApiKey, (req, res) => {
  res.json(getAllSessions());
});

// ─── GET /api/registros ────────────────────────────────────────────────────
app.get('/api/registros', requireApiKey, (req, res) => {
  if (!fs.existsSync(EXCEL_PATH)) {
    return res.status(404).json({ error: 'Aun no hay registros guardados.' });
  }
  res.download(EXCEL_PATH, 'registros.xlsx', (err) => {
    if (err) {
      console.error('Error enviando el archivo Excel:', err.message);
    }
  });
});

// ─── GET /api/new-user ────────────────────────────────────────────────────
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
      note: 'Requiere WhatsApp Business API + numero verificado',
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
      note: 'Requiere TikTok Business Account + aprobacion de API',
    },
    timestamp: ts,
  };
}

// ─── WEBHOOK DE WHATSAPP ────────────────────────────────

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook de WhatsApp verificado correctamente');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const userId = message.from;
      const texto = message.text.body;

      const botResponse = await processMessage(userId, texto);
      await sendWhatsAppMessage(userId, botResponse);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error procesando webhook de WhatsApp:', err);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Casa Gaviota Chatbot corriendo en http://localhost:${PORT}`);
});

module.exports = app;