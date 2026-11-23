const express = require('express');
const router = express.Router();
const { verifySignature } = require('../shared/verifySignature');
const { plantillaBoton } = require('../../utils/enlaces');
const { responder, yaProcesado, descargarImagen, enviarConBotones } = require('../shared/canal');

// Meta verifica el webhook con este GET (se configura en developers.facebook.com)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function enviarMensaje(destinatarioId, message) {
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/me/messages?access_token=${encodeURIComponent(process.env.MESSENGER_PAGE_ACCESS_TOKEN || '')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: destinatarioId }, messaging_type: 'RESPONSE', message }),
    });
    if (!r.ok) console.error('[MESSENGER] Error enviando mensaje:', await r.text());
    return r.ok;
  } catch (err) {
    console.error('[MESSENGER] Error enviando mensaje:', err.message);
    return false;
  }
}

// Messenger permite hasta 2000 caracteres por mensaje; los enlaces salen como botón
const enviarMessenger = (id, texto) => enviarConBotones(texto, {
  max: 1800,
  enviarTexto: (t) => enviarMensaje(id, { text: t }),
  enviarBoton: (e) => enviarMensaje(id, plantillaBoton(e)),
});

async function manejar(body) {
  if (body?.object !== 'page') return;
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const senderId = ev.sender?.id;
      if (!senderId) continue;

      // Botón "Comenzar" de la página: se trata como un saludo
      if (ev.postback) {
        const r = await responder({ userId: `fb_${senderId}`, texto: ev.postback.title || 'hola' });
        if (r) await enviarMessenger(senderId, r);
        continue;
      }

      if (!ev.message || ev.message.is_echo) continue; // ignora lo que manda la propia página
      if (yaProcesado(ev.message.mid)) continue;

      const adjunto = (ev.message.attachments || [])[0];
      const esImagen = adjunto && adjunto.type === 'image' && adjunto.payload?.url;

      // "fb_" separa las sesiones de Facebook de las de otros canales
      const respuesta = await responder({
        userId: `fb_${senderId}`,
        texto: ev.message.text || '',
        imagen: esImagen ? () => descargarImagen(adjunto.payload.url) : null,
        otro: Boolean(adjunto) && !esImagen,
      });
      if (respuesta) await enviarMessenger(senderId, respuesta);
    }
  }
}

router.post('/', verifySignature, (req, res) => {
  res.sendStatus(200); // responde rápido a Meta; el mensaje se procesa después
  manejar(req.body).catch((err) => console.error('[MESSENGER]', err));
});

module.exports = router;
module.exports.manejar = manejar;