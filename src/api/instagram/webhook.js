const express = require('express');
const router = express.Router();
const { verifySignature } = require('../shared/verifySignature');
const { plantillaBoton } = require('../../utils/enlaces');
const { responder, yaProcesado, descargarImagen, enviarConBotones, clasificarAdjuntos } = require('../shared/canal');

// Meta verifica el webhook con este GET (se configura en developers.facebook.com)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Dos formas de conectar Instagram en Meta (solo una por app):
//  - "API setup with Instagram Login": token INSTAGRAM_ACCESS_TOKEN, se envía por graph.instagram.com
//  - "API setup with Facebook Login": se usa el token de la página (el mismo de Messenger), por graph.facebook.com
// Si existe INSTAGRAM_ACCESS_TOKEN se usa el primero; si no, el token de la página.
async function enviarMensaje(destinatarioId, message) {
  const conInstagram = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);
  const url = conInstagram
    ? 'https://graph.instagram.com/v23.0/me/messages'
    : `https://graph.facebook.com/v23.0/me/messages?access_token=${encodeURIComponent(process.env.MESSENGER_PAGE_ACCESS_TOKEN || '')}`;
  const headers = { 'Content-Type': 'application/json' };
  if (conInstagram) headers.Authorization = `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`;
  try {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ recipient: { id: destinatarioId }, message }) });
    if (!r.ok) console.error('[INSTAGRAM] Error enviando mensaje:', await r.text());
    return r.ok;
  } catch (err) {
    console.error('[INSTAGRAM] Error enviando mensaje:', err.message);
    return false;
  }
}

// Instagram limita a 1000 caracteres por mensaje; los enlaces salen como botón
const enviarInstagram = (id, texto) => enviarConBotones(texto, {
  max: 1000,
  enviarTexto: (t) => enviarMensaje(id, { text: t }),
  enviarBoton: (e) => enviarMensaje(id, plantillaBoton(e)),
});

async function manejar(body) {
  for (const entry of body?.entry || []) {
    for (const ev of entry.messaging || []) {
      if (!ev.message || ev.message.is_echo) continue; // ignora lo que manda la propia cuenta
      if (yaProcesado(ev.message.mid)) continue;

      const senderId = ev.sender.id;
      const texto = ev.message.text || '';
      const { imagenUrl, audio } = clasificarAdjuntos(ev.message.attachments);

      // Menciones en historias, etiquetas, publicaciones compartidas, tarjetas de contacto, reels...
      // NO se contestan nada: solo se atienden textos, fotos de comprobante y notas de voz.
      if (!texto.trim() && !imagenUrl && !audio) {
        console.log('[INSTAGRAM] Ignorado: mención, etiqueta u otro adjunto que no se contesta.');
        continue;
      }

      // "ig_" separa las sesiones de Instagram de las de otros canales
      const respuesta = await responder({
        userId: `ig_${senderId}`,
        texto,
        imagen: imagenUrl ? () => descargarImagen(imagenUrl) : null,
        otro: audio && !texto.trim() && !imagenUrl,
      });
      if (respuesta) await enviarInstagram(senderId, respuesta);
    }
  }
}

router.post('/', verifySignature, (req, res) => {
  res.sendStatus(200); // responde rápido a Meta; el mensaje se procesa después
  manejar(req.body).catch((err) => console.error('[INSTAGRAM]', err));
});

module.exports = router;
module.exports.manejar = manejar;