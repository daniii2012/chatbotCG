const express = require('express');
const router = express.Router();
const { verifySignature } = require('../shared/verifySignature');

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
});

module.exports = router;