// Envía registros a un Excel en línea (Google Sheets) a través de un Apps Script.
// Si no hay SHEETS_WEBHOOK_URL, simplemente no hace nada.
const URL_HOJA = process.env.SHEETS_WEBHOOK_URL;
const SECRETO = process.env.SHEETS_SECRET;

// Etiquetas bonitas para las columnas (lo que no esté aquí se usa tal cual viene de la base de datos)
const ETIQUETAS = {
  nombre: 'Nombre', telefono: 'Teléfono', correo: 'Correo', residencia: 'Residencia',
  fechaNacimiento: 'Fecha de nacimiento', edad: 'Edad', modalidad: 'Modalidad',
  servicioSolicita: 'Servicio', userId: 'UserId', flow: 'Flujo',
  empresa: 'Empresa / organización', cargo: 'Cargo', ubicacion: 'Ubicación',
  horarioAtencion: 'Horario de atención',
  temasInteres: 'Temas de interés', modalidadFormacion: 'Modalidad de formación',
  lineasConsultadas: 'Líneas que consultó', tipoDonativo: 'Tipo de donativo', detalleEspecie: 'Prendas y cantidad',
};

// Datos internos del bot que NO son parte del registro de la usuaria
const esInterno = (k) => k === 'menuMostrado' || k === 'saludoEnviado' || /Index$/.test(k);

const aTexto = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return Array.isArray(v) ? v.join(', ') : JSON.stringify(v);
  return String(v);
};

const ahora = () => new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

/**
 * Manda un registro al Excel en línea.
 * @param {string} hoja    nombre de la pestaña
 * @param {object} registro  { 'Columna': valor, ... }  (las columnas nuevas se crean solas)
 * @param {string[]} fijas columnas que van primero y en este orden (solo se usan al crear la pestaña)
 */
async function enviarAHoja(hoja, registro, fijas) {
  if (!URL_HOJA) {
    console.warn('[WARN] Falta SHEETS_WEBHOOK_URL: no se guardó en el Excel en línea.');
    return false;
  }
  try {
    const res = await fetch(URL_HOJA, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain evita problemas de CORS en Apps Script
      body: JSON.stringify({ secreto: SECRETO, hoja, fijas, registro }),
      redirect: 'follow',
    });
    const txt = await res.text();
    if (!res.ok || !txt.includes('ok')) {
      console.error('[ERROR] Excel en línea respondió:', res.status, txt.slice(0, 200));
      return false;
    }
    console.log(`☁️ Registro guardado en Excel en línea (hoja: ${hoja})`);
    return true;
  } catch (err) {
    console.error('[ERROR] No se pudo guardar en Excel en línea:', err.message);
    return false;
  }
}

// Columnas fijas de la pestaña de registros (la 2ª es el menú Sí/No de "ya se contactó")
const FIJAS_REGISTROS = [
  'Fecha', '¿Ya se contactó?', 'Contactada por', 'Notas internas',
  'Nombre', 'Teléfono', 'Correo', 'Servicio', 'UserId',
];

// Nombre de la pestaña por flujo
const PESTANAS = {
  psico: 'Atención psicológica', legal: 'Asesoría legal', bio: 'Biodescodificación',
  standup: 'Taller Stand Up', empeco: 'Empoderamiento económico', servicios: 'Servicios del centro',
  empresarial: 'Servicios empresariales', donativos: 'Donativos', rrhh: 'Recursos Humanos',
};

/**
 * Guarda en el Excel en línea LO MISMO que se guarda en la base de datos (Mongo):
 * userId, flujo, nombre, teléfono, correo, servicio y todos los datos de la sesión.
 */
function enviarRegistroOnline(flow, sessionData, userId) {
  const data = sessionData || {};
  const registro = {
    'Fecha': ahora(),
    '¿Ya se contactó?': 'No',
    'Nombre': aTexto(data.nombre),
    'Teléfono': aTexto(data.telefono),
    'Correo': aTexto(data.correo),
    'Servicio': aTexto(data.servicioSolicita || flow),
    'UserId': aTexto(userId),
  };
  // nombrePersona y celular (servicios empresariales) repiten Nombre y Teléfono: no se duplican
  const yaUsadas = ['nombre', 'telefono', 'correo', 'servicioSolicita', 'nombrePersona', 'celular'];
  for (const [k, v] of Object.entries(data)) {
    if (yaUsadas.includes(k) || esInterno(k)) continue;
    registro[ETIQUETAS[k] || k] = aTexto(v);
  }
  return enviarAHoja(PESTANAS[flow] || 'Otros', registro, FIJAS_REGISTROS);
}

module.exports = { enviarAHoja, enviarRegistroOnline, ahora, aTexto };
