const express = require('express');
const router = express.Router();
const { verifySignature } = require('../shared/verifySignature');
const { responder, yaProcesado, descargarImagen } = require('../shared/canal');
const { sendWhatsAppMessage } = require('./send');

// Meta verifica el webhook con este GET (se configura en developers.facebook.com)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// En WhatsApp la foto se baja en dos pasos: primero se pide su enlace y luego el archivo (con el token)
async function bajarImagenWhatsApp(mediaId) {
  try {
    const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
    const r = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, { headers: auth });
    if (!r.ok) return null;
    const { url } = await r.json();
    return url ? await descargarImagen(url, auth) : null;
  } catch (err) {
    console.error('[WHATSAPP] No se pudo bajar la imagen:', err.message);
    return null;
  }
}

async function manejar(body) {
  for (const entry of body?.entry || []) {
    for (const cambio of entry.changes || []) {
      for (const m of cambio.value?.messages || []) { // "statuses" (entregado/leído) se ignoran
        if (yaProcesado(m.id)) continue;

        let texto = '';
        let imagen = null;
        let otro = false;
        if (m.type === 'text') texto = m.text?.body || '';
        else if (m.type === 'image') { texto = m.image?.caption || ''; imagen = () => bajarImagenWhatsApp(m.image.id); }
        else if (m.type === 'button') texto = m.button?.text || '';
        else if (m.type === 'interactive') texto = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
        else otro = true; // audio, sticker, documento, ubicación...

        // "wa_" separa las sesiones de WhatsApp de las de otros canales
        const respuesta = await responder({ userId: `wa_${m.from}`, texto, imagen, otro });
        if (respuesta) await sendWhatsAppMessage(m.from, respuesta);
      }
    }
  }
}

router.post('/', verifySignature, (req, res) => {
  res.sendStatus(200); // responde rápido a Meta; el mensaje se procesa después
  manejar(req.body).catch((err) => console.error('[WHATSAPP]', err));
});

module.exports = router;
module.exports.manejar = manejar;