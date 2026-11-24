const crypto = require('crypto');

// Meta firma cada aviso (webhook) con el "secreto de la app". Se aceptan dos secretos:
//  - META_APP_SECRET: el de la app (Messenger, WhatsApp, Instagram con inicio de sesión de Facebook)
//  - INSTAGRAM_APP_SECRET: el "secreto de la app de Instagram" (Instagram con inicio de sesión de Instagram),
//    que en Meta es distinto al anterior. Es opcional.
function firmaValida(firma, rawBody) {
  const secretos = [process.env.META_APP_SECRET, process.env.INSTAGRAM_APP_SECRET].filter(Boolean);
  return secretos.some((secreto) => {
    const esperada = 'sha256=' + crypto.createHmac('sha256', secreto).update(rawBody).digest('hex');
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function verifySignature(req, res, next) {
  const firma = req.headers['x-hub-signature-256'];
  if (!firma || !req.rawBody) {
    console.warn(`[WEBHOOK] ${req.originalUrl}: llegó sin firma, se rechazó.`);
    return res.sendStatus(401);
  }
  if (!firmaValida(firma, req.rawBody)) {
    console.warn(`[WEBHOOK] ${req.originalUrl}: firma inválida, se rechazó. Revisa META_APP_SECRET (o agrega INSTAGRAM_APP_SECRET).`);
    return res.sendStatus(401);
  }
  console.log(`[WEBHOOK] ${req.originalUrl}: aviso recibido de Meta.`);
  next();
}

module.exports = { verifySignature };