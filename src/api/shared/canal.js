// ═══════════════════════════════════════════════════════════════
// api/shared/canal.js
// Lo que comparten WhatsApp, Instagram y Messenger: pasar el mensaje al bot,
// recibir fotos de comprobantes, evitar mensajes repetidos y mandar los enlaces como botones.
// ═══════════════════════════════════════════════════════════════
const { processMessage } = require('../../flows/menu');
const { getSession } = require('../../db/sessions');
const { dividirMensaje, separarEnlaces } = require('../../utils/enlaces');

// Pasos donde el bot espera la foto del comprobante de pago
const PASOS_COMPROBANTE = ['psico_cuenta_enviada', 'lectura_cuenta_enviada', 'legal_cuenta_enviada', 'bio_comprobante', 'donativos_comprobante'];

const MSG_ERROR = 'Perdón, ahorita no puedo responder. Intenta de nuevo en un momento. 💙';
const MSG_OTRO = 'Por este medio puedo leer mensajes de texto y fotos de comprobantes de pago. 💙 Si es un comprobante, envíalo como foto o captura de pantalla. Para ver las opciones, escribe *menú*.';
const MSG_IMAGEN_FUERA = 'Recibí tu imagen 💙, pero por ahora solo la necesito cuando envíes un comprobante de pago. Escribe *menú* para ver las opciones.';
const MSG_IMAGEN_ERROR = 'No pude abrir tu imagen. 💙 ¿Puedes enviarla otra vez como foto o captura de pantalla?';

// Meta a veces reenvía el mismo mensaje: se guarda el id de los últimos para no contestar dos veces
const vistos = new Set();
function yaProcesado(id) {
  if (!id) return false;
  if (vistos.has(id)) return true;
  vistos.add(id);
  if (vistos.size > 2000) vistos.delete(vistos.values().next().value);
  return false;
}

// De los adjuntos de un mensaje de Instagram/Messenger, solo interesan dos cosas:
//  - una foto (posible comprobante de pago) y una nota de voz.
// Todo lo demás (mención en historia, etiqueta, publicación o reel compartido, tarjeta de contacto
// que Instagram arma al escribir un teléfono...) se IGNORA y no se contesta.
function clasificarAdjuntos(adjuntos) {
  const lista = Array.isArray(adjuntos) ? adjuntos : [];
  const foto = lista.find((a) => a && a.type === 'image' && a.payload && a.payload.url);
  return { imagenUrl: foto ? foto.payload.url : null, audio: lista.some((a) => a && a.type === 'audio') };
}

// Baja una imagen y la devuelve como data:image/...;base64 (así el bot la guarda igual que en el simulador)
async function descargarImagen(url, headers = {}) {
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) return null;
    const tipo = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 8 * 1024 * 1024) return null;
    return `data:${tipo};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[CANAL] No se pudo descargar la imagen:', err.message);
    return null;
  }
}

// Devuelve lo que hay que contestar (o null si no hay nada que contestar).
//  - texto: lo que escribió la persona
//  - imagen: función que descarga la foto si mandó una (solo se descarga si el bot espera un comprobante)
//  - otro: true si mandó algo que no se lee (audio, sticker, documento...)
async function responder({ userId, texto = '', imagen = null, otro = false }) {
  try {
    if (imagen) {
      if (!PASOS_COMPROBANTE.includes(getSession(userId).step)) return MSG_IMAGEN_FUERA;
      const dataUrl = await imagen();
      if (!dataUrl) return MSG_IMAGEN_ERROR;
      return await processMessage(userId, texto || '', { url: dataUrl, type: 'image' });
    }
    if (!String(texto).trim()) return otro ? MSG_OTRO : null;
    return await processMessage(userId, texto);
  } catch (err) {
    console.error('[CANAL] Error en el bot:', err);
    return MSG_ERROR;
  }
}

// Manda el texto en trozos y cada enlace como botón. Si el botón falla, manda "texto + URL".
async function enviarConBotones(texto, { max, enviarTexto, enviarBoton }) {
  const { cuerpo, enlaces } = separarEnlaces(texto);
  for (const trozo of dividirMensaje(cuerpo, max)) {
    if (trozo.trim()) await enviarTexto(trozo);
  }
  for (const e of enlaces) {
    const ok = await enviarBoton(e);
    if (!ok) await enviarTexto(`${e.texto}\n${e.url}`);
  }
}

module.exports = { responder, yaProcesado, descargarImagen, enviarConBotones, clasificarAdjuntos, PASOS_COMPROBANTE };