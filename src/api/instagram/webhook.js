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

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function enviarMensaje(destinatarioId, message) {
  try {
    const r = await fetch('https://graph.instagram.com/v23.0/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ recipient: { id: destinatarioId }, message }),
    });
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
      const adjunto = (ev.message.attachments || [])[0];
      const esImagen = adjunto && adjunto.type === 'image' && adjunto.payload?.url;

      // "ig_" separa las sesiones de Instagram de las de otros canales
      const respuesta = await responder({
        userId: `ig_${senderId}`,
        texto: ev.message.text || '',
        imagen: esImagen ? () => descargarImagen(adjunto.payload.url) : null,
        otro: Boolean(adjunto) && !esImagen,
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