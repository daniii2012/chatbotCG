// Avisa al equipo de Casa Gaviota que una usuaria mandó un comprobante de pago.
const { DATOS } = require('../config/datos');
const { enviarAHoja, ahora } = require('../db/sheetsOnline');
const { sendNotificationEmail } = require('../senders/email');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOJA = 'Pagos por revisar';
const HEADERS = [
  'Fecha', 'Servicio', 'Monto de referencia', 'Nombre', 'Teléfono', 'Correo',
  'UserId', 'Comprobante', 'Estado', 'Revisado por', 'Notas',
];

const montos = () => ({
  psico: `${DATOS.tarifas.psicologiaSesion} (1 sesión) / ${DATOS.tarifas.psicologiaPaquete4} (4 sesiones)`,
  legal: `${DATOS.tarifas.asesoriaLegal} por sesión`,
  bio: `${DATOS.tarifas.biodescodificacion} por sesión`,
  donativos: 'Donativo (cantidad indicada por la usuaria)',
});

// Guarda la imagen del comprobante en public/uploads/comprobantes con un nombre imposible de adivinar
// y devuelve el enlace público para que el equipo la abra desde el Excel o el correo.
// (Gmail no muestra imágenes pegadas en el correo, por eso se usa un enlace.)
const CARPETA_COMPROBANTES = path.join(__dirname, '..', '..', 'public', 'uploads', 'comprobantes');
const BASE_PUBLICA = (process.env.PUBLIC_URL || 'https://chatbot.casagaviota.org.mx').replace(/\/$/, '');
const EXT_PERMITIDAS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

function guardarImagenComprobante(dataUrl, baseUrl) {
  try {
    const m = /^data:(image\/[a-z+.-]+);base64,/i.exec(String(dataUrl).slice(0, 80));
    const ext = m && EXT_PERMITIDAS[m[1].toLowerCase()]; // solo imágenes (nada de SVG ni HTML)
    if (!ext) return null;
    const buffer = Buffer.from(String(dataUrl).slice(m[0].length), 'base64');
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
    fs.mkdirSync(CARPETA_COMPROBANTES, { recursive: true });
    const nombre = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(CARPETA_COMPROBANTES, nombre), buffer);
    return `${(baseUrl || BASE_PUBLICA).replace(/\/$/, '')}/uploads/comprobantes/${nombre}`;
  } catch (err) {
    console.error('[WARN] No se pudo guardar la imagen del comprobante:', err.message);
    return null;
  }
}

async function alertarComprobante(session, flow, media) {
  const d = session.data || {};

  // Manejo inteligente del comprobante para evitar romper Google Sheets con Base64 gigante
  let comprobanteTexto = 'Sin archivo: la usuaria avisó por texto';
  let comprobanteEmailHtml = 'Sin archivo adjunto';

  if (media?.url) {
    const enlace = media.url.startsWith('data:image') ? guardarImagenComprobante(media.url, media.baseUrl) : null;
    if (enlace) {
      // Imagen guardada en el servidor: el equipo la abre con este enlace (Excel y correo)
      comprobanteTexto = enlace;
      comprobanteEmailHtml = `<a href="${enlace}" target="_blank" style="color: #c8a96e; font-weight: bold;">Ver imagen del comprobante</a><br><br><a href="${enlace}" target="_blank"><img src="${enlace}" style="max-width: 250px; border-radius: 8px; border: 1px solid #ccc;" /></a>`;
    } else if (media.url.startsWith('data:image')) {
      // No se pudo guardar el archivo: se conserva el aviso anterior
      comprobanteTexto = '[Imagen de comprobante adjunta en Simulador]';
      comprobanteEmailHtml = `<span style="color: #c8a96e; font-weight: bold;">[Imagen de comprobante adjunta desde el Simulador]</span><br><br><img src="${media.url}" style="max-width: 250px; border-radius: 8px; border: 1px solid #ccc;" />`;
    } else {
      // Es una URL real (ej. de WhatsApp / Meta)
      comprobanteTexto = media.url;
      comprobanteEmailHtml = `<a href="${media.url}" target="_blank" style="color: #c8a96e;">Ver imagen del comprobante</a>`;
    }
  }

  const monto = flow === 'donativos' && d.cantidadEstimada
    ? `Donativo: ${d.cantidadEstimada}`
    : (montos()[flow] || '');

  const fila = [
    new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
    d.servicioSolicita || flow,
    monto,
    d.nombre || '',
    d.telefono || '',
    d.correo || '',
    session.userId,
    comprobanteTexto, // Aquí va seguro sin reventar el límite de la celda
    'PENDIENTE DE REVISIÓN',
    '',
    '',
  ];

  // 1) Fila en el Excel en línea
  await enviarAHoja(HOJA, {
    'Fecha': fila[0], 'Servicio': fila[1], 'Monto de referencia': fila[2], 'Nombre': fila[3],
    'Teléfono': fila[4], 'Correo': fila[5], 'UserId': fila[6], 'Comprobante': fila[7],
    'Estado': fila[8], 'Revisado por': '', 'Notas': '',
  }, HEADERS);

  // 2) Correo de aviso al equipo
  const destinos = (process.env.ALERTA_PAGOS_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (destinos.length === 0) {
    console.warn('[WARN] Falta ALERTA_PAGOS_EMAIL: no se envió el aviso por correo.');
    return;
  }

  const html = `
    <h2>💳 Nuevo comprobante de pago por revisar</h2>
    <p>Una usuaria envió un comprobante. <b>Por favor verifica manualmente que sea real</b> antes de confirmar su cita.</p>
    <ul>
      <li><b>Servicio:</b> ${fila[1]}</li>
      <li><b>Monto de referencia:</b> ${fila[2]}</li>
      <li><b>Nombre:</b> ${fila[3] || '—'}</li>
      <li><b>Teléfono:</b> ${fila[4] || '—'}</li>
      <li><b>Correo:</b> ${fila[5] || '—'}</li>
      <li><b>Comprobante:</b> ${comprobanteEmailHtml}</li>
      <li><b>Fecha:</b> ${fila[0]}</li>
    </ul>
    <p>Revisa tu banco y luego marca el estado en la hoja <b>"${HOJA}"</b> del Excel en línea.</p>`;

  for (const to of destinos) {
    await sendNotificationEmail(to, `[Casa Gaviota] 💳 Comprobante por revisar: ${fila[1]}`, html);
  }
}

// Avisa a los correos de seguimiento que alguien quiere donar ropa
async function avisarDonativoEspecie(session) {
  const d = session.data || {};
  const html = `
    <h2>👕 Nuevo donativo en especie (ropa)</h2>
    <p>Una persona quiere donar ropa y <b>enviará fotografías a este correo</b>. Por favor dale seguimiento.</p>
    <ul>
      <li><b>Nombre:</b> ${d.nombre || '—'}</li>
      <li><b>Teléfono:</b> ${d.telefono || '—'}</li>
      <li><b>Correo:</b> ${d.correo || '—'}</li>
      <li><b>Prendas y cantidad aproximada:</b> ${d.detalleEspecie || '—'}</li>
    </ul>
    <p>Recordatorio: buenas condiciones, lavada, sin ropa interior, trajes de baño ni calcetines.</p>`;
  for (const to of DATOS.donativosEspecie.correos) {
    await sendNotificationEmail(to, '[Casa Gaviota] 👕 Donativo de ropa: ' + (d.nombre || 'nueva solicitud'), html);
  }
}

module.exports = { alertarComprobante, avisarDonativoEspecie };