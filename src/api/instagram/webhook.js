const express = require('express');
const router = express.Router();
const { verifySignature } = require('../shared/verifySignature');

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post('/', verifySignature, async (req, res) => {
  res.sendStatus(200); // responde rápido a Meta

  for (const entry of req.body.entry || []) {
    for (const ev of entry.messaging || []) {
      if (!ev.message || ev.message.is_echo || !ev.message.text) continue;
      

      const senderId = ev.sender.id;
      let reply = 'Perdón, ahorita no puedo responder. Intenta de nuevo en un momento.';

      try {
        const r = await fetch(process.env.CHATBOT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: ev.message.text, // ajusta al campo que espera tu chatbot
            userId: senderId,
            channel: 'instagram',
          }),
        });
        const data = await r.json();
        reply = data.reply || reply; // ajusta al campo que devuelve tu chatbot
      } catch (err) {
        console.error('Error llamando al chatbot:', err);
      }

      try {
        await fetch('https://graph.instagram.com/v23.0/me/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: reply.slice(0, 1000) }, // límite de Instagram
          }),
        });
      } catch (err) {
        console.error('Error enviando a Instagram:', err);
      }
    }
  }
});

module.exports = router;