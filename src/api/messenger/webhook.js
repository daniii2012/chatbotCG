const express = require('express');
const router = express.Router();
const { verifySignature } = require('../shared/verifySignature');
const { processMessage } = require('../../flows/menu');
const { sendPageMessage } = require('../shared/pageMessage');

const vistos = new Set();

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post('/', verifySignature, (req, res) => {
  res.sendStatus(200);
  procesar(req.body).catch((err) => console.error('Error Messenger:', err));
});

async function procesar(body) {
  if (body.object !== 'page') return;

  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const msg = ev.message;
      if (!msg || msg.is_echo || vistos.has(msg.mid)) continue;
      vistos.add(msg.mid);
      if (vistos.size > 1000) vistos.clear();

      const sender = ev.sender.id;
      const respuesta = msg.text
        ? await processMessage(`fb:${sender}`, msg.text)
        : 'Por ahora solo puedo leer mensajes de texto. Escribe "hola" para ver el menú. 💙';

      await sendPageMessage(sender, respuesta, process.env.MESSENGER_PAGE_TOKEN);
    }
  }
}

module.exports = router;