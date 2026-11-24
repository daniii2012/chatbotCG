const { armarMensajesWhatsApp, aTextoPlano } = require('../../utils/enlaces');

// Deja el número como lo pide WhatsApp: solo dígitos, con código de país.
//  - 10 dígitos (como se escribe en México: 7295925107) -> se le agrega 52
//  - 521 + 10 dígitos (así llegan los mensajes entrantes de México) -> 52 + 10 dígitos, sin el 1.
//    Si se contesta con el 1, WhatsApp responde "Recipient phone number not in allowed list" (#131030).
function normalizarNumero(to) {
  const n = String(to || '').replace(/\D/g, '');
  if (/^\d{10}$/.test(n)) return '52' + n;
  return /^521\d{10}$/.test(n) ? '52' + n.slice(3) : n;
}

// Manda un mensaje y devuelve { ok, codigo, mensaje } (el error real de WhatsApp si falla)
async function enviar(payload) {
  const url = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Error enviando mensaje de WhatsApp (sin conexión):', err.message);
    return { ok: false, codigo: null, mensaje: err.message };
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Error enviando mensaje de WhatsApp:', errorBody);
    let e = {};
    try { e = JSON.parse(errorBody).error || {}; } catch { /* respuesta que no era JSON */ }
    return { ok: false, codigo: e.code ?? null, mensaje: e.error_data?.details || e.message || errorBody };
  }
  return { ok: true, codigo: null, mensaje: '' };
}

// Envía el texto. Si trae enlaces escritos como [texto](url), cada uno sale como botón de enlace
// (se ve "Instagram", no la URL larga). Si WhatsApp rechaza el botón, se manda el texto con la URL.
// Devuelve { ok, codigo, mensaje }: si algo falla, trae el error de WhatsApp.
async function enviarWhatsAppDetallado(destino, text) {
  const to = normalizarNumero(destino);
  const mensajes = armarMensajesWhatsApp(text, to);
  let resultado = { ok: true, codigo: null, mensaje: '' };
  for (const m of mensajes) {
    let r = await enviar(m);
    if (!r.ok && m.type === 'interactive') {
      r = await enviar({
        messaging_product: 'whatsapp', to, type: 'text',
        text: { body: aTextoPlano(`[${m.interactive.body.text}](${m.interactive.action.parameters.url})`) },
      });
    }
    if (!r.ok) resultado = r;
  }
  return resultado;
}

// Igual que la anterior, pero devuelve solo true/false (lo usa el bot)
async function sendWhatsAppMessage(destino, text) {
  return (await enviarWhatsAppDetallado(destino, text)).ok;
}

// Mensaje claro, en español, para quien usa el panel
function explicarErrorWhatsApp({ codigo, mensaje }) {
  switch (Number(codigo)) {
    case 131047:
    case 131051:
      return 'Pasaron más de 24 horas desde que esa persona escribió al número. WhatsApp solo permite en ese caso mensajes con plantilla aprobada.';
    case 131030:
      return 'Ese número no está en la lista de destinatarios de prueba. Agrégalo en Meta (Paso 1) o usa el número real de producción.';
    case 131009:
    case 100:
      return 'El número no es válido. Escríbelo con 10 dígitos (ej. 7295925107) o con código de país (52...).';
    case 190:
      return 'El token de WhatsApp caducó o es incorrecto. Genera uno nuevo y actualiza WHATSAPP_TOKEN en Render.';
    case 131026:
      return 'Ese número no tiene WhatsApp o no pudo recibir el mensaje.';
    default:
      return `WhatsApp no pudo enviar el mensaje${mensaje ? `: ${mensaje}` : '.'}`;
  }
}

module.exports = { sendWhatsAppMessage, enviarWhatsAppDetallado, explicarErrorWhatsApp, normalizarNumero };