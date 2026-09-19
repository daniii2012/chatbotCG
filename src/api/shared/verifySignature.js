const crypto = require('crypto');

function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return res.sendStatus(401);

  const expectedHash = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expectedHash) return res.sendStatus(401);
  next();
}

module.exports = { verifySignature };