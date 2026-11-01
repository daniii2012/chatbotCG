// Avisa al equipo de Casa Gaviota que una usuaria mandó un comprobante de pago.
// El bot NO valida el comprobante: solo registra y avisa para que ellas lo revisen a mano.
const { DATOS } = require('../config/datos');
const { enviarAHoja, ahora } = require('../db/sheetsOnline');
const { sendNotificationEmail } = require('../senders/email');

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

async function alertarComprobante(session, flow, media) {
  const d = session.data || {};
  const comprobante = media?.url || (media ? 'Archivo recibido (ver chat)' : 'Sin archivo: la usuaria avisó por texto');
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
    comprobante,
    'PENDIENTE DE REVISIÓN',
    '',
    '',
  ];

  // 1) Fila en el Excel en línea (ahí ellas cambian el Estado a Verificado / No válido)
  await enviarAHoja(HOJA, {
    'Fecha': fila[0], 'Servicio': fila[1], 'Monto de referencia': fila[2], 'Nombre': fila[3],
    'Teléfono': fila[4], 'Correo': fila[5], 'UserId': fila[6], 'Comprobante': fila[7],
    'Estado': fila[8], 'Revisado por': '', 'Notas': '',
  }, HEADERS);

  // 2) Correo de aviso al equipo (varios correos separados por coma en ALERTA_PAGOS_EMAIL)
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
      <li><b>Comprobante:</b> ${fila[7]}</li>
      <li><b>Fecha:</b> ${fila[0]}</li>
    </ul>
    <p>Revisa tu banco y luego marca el estado en la hoja <b>"${HOJA}"</b> del Excel en línea.</p>`;
  for (const to of destinos) {
    await sendNotificationEmail(to, `[Casa Gaviota] 💳 Comprobante por revisar: ${fila[1]}`, html);
  }
}

// Avisa a los correos de seguimiento que alguien quiere donar ropa (ellas esperan la foto por correo)
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
