require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { getCampaignTemplate } = require('./utils/emailTemplates/campaign');

const { sendWhatsAppMessage } = require('./api/whatsapp/send');

const { processMessage } = require('./flows/menu');
const { getSession, getAllSessions, resetSession } = require('./db/sessions');
const { FILE_PATH: EXCEL_PATH } = require('./db/excel');
const { getRegisteredEmails } = require('./db/mongo');
const { sendNotificationEmail } = require('./senders/email');

const whatsappWebhook = require('./api/whatsapp/webhook');
const instagramWebhook = require('./api/instagram/webhook');
const messengerWebhook = require('./api/messenger/webhook');


const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta estatica public para la interfaz admin.html
app.use(express.static('public'));


app.use('/api/whatsapp/webhook', whatsappWebhook);
app.use('/api/instagram/webhook', instagramWebhook);
app.use('/api/messenger/webhook', messengerWebhook);

// Configurar almacenamiento para archivos subidos desde el panel
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // Nombre único para que varios archivos subidos a la vez no se pisen
    cb(null, `archivo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

// Solo se permiten imágenes y PDF
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB por archivo
  fileFilter: (req, file, cb) => {
    const permitido =
      file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (!permitido) {
      return cb(new Error('Solo se permiten imágenes y archivos PDF.'));
    }
    cb(null, true);
  }
});

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

// Envio de correos desde la interfaz admin
app.post('/api/admin/send-campaign', upload.array('imagen', 10), async (req, res) => {
  try {
    const { asunto, mensaje, enlace } = req.body;

    if (!asunto || !mensaje) {
      return res.status(400).json({ success: false, error: 'El asunto y el mensaje son obligatorios.' });
    }

    const destinatarios = await getRegisteredEmails();

    if (!destinatarios || destinatarios.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay correos registrados en la base de datos.' });
    }

    // Separar imágenes y PDF
    const archivos = req.files || [];
    const imagenes = archivos.filter(f => f.mimetype.startsWith('image/'));
    const pdfs = archivos.filter(f => f.mimetype === 'application/pdf');

    // Límite de peso total de los PDF adjuntos
    const pesoPdfs = pdfs.reduce((total, f) => total + f.size, 0);
    if (pesoPdfs > 20 * 1024 * 1024) {
      pdfs.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ success: false, error: 'Los PDF pesan más de 20 MB en total. Sube archivos más ligeros.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;

    // Los PDF se mandan como adjuntos reales
    const adjuntos = pdfs.map(f => ({
      filename: Buffer.from(f.originalname, 'latin1').toString('utf8'),
      content: fs.readFileSync(f.path),
    }));

    // HTML del correo con el nuevo diseño
    const htmlBody = getCampaignTemplate({
      mensaje,
      imageUrls: imagenes.map(f => `${baseUrl}/${f.filename}`),
      enlace,
    });

    for (const email of destinatarios) {
      await sendNotificationEmail(email, asunto, htmlBody, adjuntos);
    }

    // Los PDF ya se enviaron como adjuntos: se borran del servidor
    pdfs.forEach(f => fs.unlink(f.path, () => {}));

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

// Envío manual de WhatsApp desde el panel admin
// Recibe multipart/form-data, por eso necesita multer
app.post('/api/admin/send-whatsapp', upload.array('archivos', 10), async (req, res) => {
  try {
    const { numero, mensaje } = req.body;

    if (!numero || !mensaje) {
      return res.status(400).json({ success: false, error: 'El número y el mensaje son obligatorios.' });
    }

    // Por ahora solo se envía el texto. Los archivos ya llegan en req.files,
    // falta que sendWhatsAppMessage sepa mandarlos (ver src/api/whatsapp/send.js).
    if (req.files && req.files.length > 0) {
      console.log(`WhatsApp manual: se recibieron ${req.files.length} archivo(s), aún no se envían.`);
    }

    const ok = await sendWhatsAppMessage(numero, mensaje);

    if (!ok) {
      return res.status(500).json({ success: false, error: 'No se pudo enviar el mensaje. Revisa las credenciales de WhatsApp.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al enviar WhatsApp manual:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manejo de errores de multer (archivo no permitido, muy pesado, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Solo se permiten imágenes y archivos PDF.') {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Casa Gaviota Chatbot corriendo en http://localhost:${PORT}`);
});

module.exports = app;