const { armarMensajesWhatsApp, aTextoPlano } = require('../../utils/enlaces');

// En México, WhatsApp avisa los mensajes entrantes con el número como 521 + 10 dígitos, pero para
// contestar (y en la lista de destinatarios de prueba) el número va como 52 + 10 dígitos, sin el 1.
// Si se contesta con el 1, WhatsApp responde "Recipient phone number not in allowed list" (#131030).
function normalizarNumero(to) {
  const n = String(to || '').replace(/\D/g, '');
  return /^521\d{10}$/.test(n) ? '52' + n.slice(3) : n;
}

async function enviar(payload) {
  const url = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Error enviando mensaje de WhatsApp:', errorBody);
  }
  return res.ok;
}

// Envía el texto. Si trae enlaces escritos como [texto](url), cada uno sale como botón de enlace
// (se ve "Instagram", no la URL larga). Si WhatsApp rechaza el botón, se manda el texto con la URL.
async function sendWhatsAppMessage(destino, text) {
  const to = normalizarNumero(destino);
  const mensajes = armarMensajesWhatsApp(text, to);
  let todoOk = true;
  for (const m of mensajes) {
    let ok = await enviar(m);
    if (!ok && m.type === 'interactive') {
      ok = await enviar({
        messaging_product: 'whatsapp', to, type: 'text',
        text: { body: aTextoPlano(`[${m.interactive.body.text}](${m.interactive.action.parameters.url})`) },
      });
    }
    todoOk = todoOk && ok;
  }
  return todoOk;
}

module.exports = { sendWhatsAppMessage, normalizarNumero };