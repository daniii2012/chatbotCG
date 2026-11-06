// ═══════════════════════════════════════════════════════════════
// config/configStore.js
// Datos que el equipo de Casa Gaviota puede editar desde el panel admin
// (precios, convocatorias, números de emergencia, catálogo, etc.).
//
// Cómo funciona:
//  1. Lo que se edita se valida y se guarda en Mongo (y copia local en un archivo).
//  2. Se reemplaza en memoria el objeto DATOS y se reconstruyen los textos del bot
//     y el prompt de la IA, así el cambio se ve AL INSTANTE, sin reiniciar.
//  3. Al arrancar, el bot vuelve a cargar lo guardado.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { DATOS, reconstruirTextos } = require('./datos');
const { reconstruirMensajes } = require('./messages');
const mongo = require('../db/mongo');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const ARCHIVO = path.join(DATA_DIR, 'config_editable.json');

const clonar = (x) => JSON.parse(JSON.stringify(x));

// ─── Secciones que se pueden editar (en el orden en que se muestran) ───
const SECCIONES = [
  { key: 'tarifas', icono: '💲', titulo: 'Precios y cuotas', ayuda: 'Costos que ve la usuaria y que usa la IA. Escribe el monto tal como quieres que se vea (ej. $750 MXN).' },
  { key: 'horarios', icono: '🕐', titulo: 'Horarios', ayuda: 'Horario de atención que se muestra y que usa la IA.' },
  { key: 'cursosEmpoderamiento', icono: '📣', titulo: 'Convocatorias de empoderamiento económico', ayuda: 'El orden de la lista es el número que ve la usuaria. Apaga "Visible" para ocultar una convocatoria sin borrarla. Fechas, cuota y requisitos son opcionales: si los dejas vacíos no se muestran.' },
  { key: 'lineasEmergencia', icono: '🚨', titulo: 'Números de emergencia', ayuda: 'Se envían cuando alguien está en riesgo. Debe quedar al menos uno.' },
  { key: 'cuentaBancaria', icono: '🏦', titulo: 'Datos bancarios', ayuda: 'Se envían para pagos de psicología, asesoría legal, biodescodificación y donativos. La CLABE debe tener 18 dígitos.' },
  { key: 'circulosReflexion', icono: '🌸', titulo: 'Círculos de Reflexión', ayuda: 'Se ofrecen cuando la cuota valorada es muy baja.' },
  { key: 'standUp', icono: '🎤', titulo: 'Taller de Stand Up', ayuda: 'Nombre, duración y mínimo de asistentes.' },
  { key: 'empresas', icono: '🏢', titulo: 'Servicios empresariales', ayuda: 'Contacto, modalidades y catálogo de talleres (máximo 8 líneas).' },
  { key: 'rrhh', icono: '📝', titulo: 'Recursos Humanos: formulario', ayuda: 'Enlace del formulario que se muestra en Recursos Humanos para vacantes, servicio social y voluntariado.' },
  { key: 'vacantes', icono: '👩‍💼', titulo: 'Vacantes (Recursos Humanos)', ayuda: 'Si la dejas vacía, el bot avisa que no hay vacantes abiertas.' },
  { key: 'serviciosCentro', icono: '🏛️', titulo: 'Servicios del centro', ayuda: 'Lista que ve la usuaria en "Servicios del centro".' },
  { key: 'donativosEspecie', icono: '👕', titulo: 'Donativos en especie (ropa)', ayuda: 'Correos a los que se envían las fotos y que reciben el aviso.' },
  { key: 'formulario', icono: '📝', titulo: 'Formulario final', ayuda: 'Enlace que se manda al terminar psicología y asesoría legal.' },
  { key: 'palabrasEmergencia', icono: '⚠️', titulo: 'Frases que activan la alerta de emergencia', ayuda: 'Si la usuaria escribe una de estas frases fuera de un flujo, el bot manda los números de emergencia. Se guardan en minúsculas y sin acentos.' },
];

// Nombres amigables de cada campo (la ruta va sin números de posición)
const ETIQUETAS = {
  'tarifas.psicologiaSesion': 'Atención psicológica: 1 sesión',
  'tarifas.psicologiaPaquete4': 'Atención psicológica: paquete de 4 sesiones',
  'tarifas.asesoriaLegal': 'Asesoría legal: cuota por sesión',
  'tarifas.biodescodificacion': 'Biodescodificación: costo por sesión',
  'horarios.psicologia': 'Horario de atención psicológica',
  'cursosEmpoderamiento': 'Convocatorias',
  'cursosEmpoderamiento.nombre': 'Nombre del curso',
  'cursosEmpoderamiento.detalle': 'Qué se aprende (descripción corta)',
  'cursosEmpoderamiento.fechas': 'Fechas de la convocatoria',
  'cursosEmpoderamiento.cuota': 'Cuota o costo',
  'cursosEmpoderamiento.requisitos': 'Requisitos',
  'cursosEmpoderamiento.activo': 'Visible para las usuarias',
  'lineasEmergencia': 'Líneas',
  'lineasEmergencia.nombre': 'Nombre de la línea',
  'lineasEmergencia.numero': 'Número',
  'cuentaBancaria.banco': 'Banco',
  'cuentaBancaria.titular': 'Titular',
  'cuentaBancaria.clabe': 'CLABE (18 dígitos)',
  'circulosReflexion.costo': 'Costo',
  'circulosReflexion.frecuencia': 'Frecuencia',
  'circulosReflexion.duracion': 'Duración',
  'circulosReflexion.cuotaMinima': 'Se ofrecen si la cuota valorada es menor a',
  'standUp.nombreCompleto': 'Nombre del taller',
  'standUp.duracion': 'Duración',
  'standUp.herramientas': 'Número de herramientas (en letra)',
  'standUp.minimoPresencial': 'Mínimo de asistentes (presencial)',
  'standUp.minimoEnLinea': 'Mínimo de asistentes (en línea)',
  'empresas.contacto': 'Datos de contacto',
  'empresas.contacto.correo': 'Correo',
  'empresas.contacto.telefonos': 'Teléfonos',
  'empresas.contacto.web': 'Sitio web',
  'empresas.modalidades': 'Modalidades',
  'empresas.modalidades.letra': 'Letra',
  'empresas.modalidades.nombre': 'Nombre',
  'empresas.modalidades.detalle': 'Descripción',
  'empresas.lineas': 'Líneas temáticas (máximo 8)',
  'empresas.lineas.nombre': 'Nombre de la línea',
  'empresas.lineas.talleres': 'Talleres',
  'empresas.lineas.talleres.nombre': 'Nombre del taller',
  'empresas.lineas.talleres.objetivo': 'Objetivo',
  'rrhh.formularioUrl': 'Enlace del formulario',
  'rrhh.formularioMensaje': 'Mensaje que acompaña al enlace',
  'vacantes': 'Vacantes',
  'serviciosCentro': 'Servicios',
  'donativosEspecie.correos': 'Correos de seguimiento',
  'formulario.url': 'Enlace del formulario',
  'formulario.mensaje': 'Mensaje que acompaña al enlace',
  'formulario.flujos': 'Servicios donde se envía (psico, legal, bio, standup, empeco, servicios, empresarial, donativos, rrhh)',
  'palabrasEmergencia': 'Frases',
};

// Cómo se ve un elemento nuevo al pulsar "Agregar"
const PLANTILLAS = {
  cursosEmpoderamiento: { nombre: '', detalle: '', fechas: '', cuota: '', requisitos: '', activo: true },
  lineasEmergencia: { nombre: '', numero: '' },
  'empresas.modalidades': { letra: '', nombre: '', detalle: '' },
  'empresas.lineas': { nombre: '', talleres: [] },
  'empresas.lineas.talleres': { nombre: '', objetivo: '' },
  vacantes: '',
  serviciosCentro: '',
  'donativosEspecie.correos': '',
  'formulario.flujos': '',
  palabrasEmergencia: '',
};

// Valores originales del código (para "Restaurar")
const POR_DEFECTO = {};
SECCIONES.forEach((s) => { POR_DEFECTO[s.key] = clonar(DATOS[s.key]); });

// ─── Validación ───────────────────────────────────────────────────────────
const FLUJOS = ['psico', 'legal', 'bio', 'standup', 'empeco', 'servicios', 'empresarial', 'donativos', 'rrhh'];
const limpiar = (v) => String(v ?? '').trim();
const quitaAcentos = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const esEmail = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);

function texto(v, campo, { vacio = false, max = 1500 } = {}) {
  const t = limpiar(v);
  if (!vacio && !t) throw new Error(`"${campo}" no puede quedar vacío.`);
  if (t.length > max) throw new Error(`"${campo}" es demasiado largo (máximo ${max} caracteres).`);
  return t;
}

function lista(v, campo, { min = 0, max = 100 } = {}) {
  if (!Array.isArray(v)) throw new Error(`"${campo}" debe ser una lista.`);
  if (v.length < min) throw new Error(`"${campo}" debe tener al menos ${min} elemento${min === 1 ? '' : 's'}.`);
  if (v.length > max) throw new Error(`"${campo}" admite como máximo ${max} elementos.`);
  return v;
}

function entero(v, campo, min = 1, max = 100000) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`"${campo}" debe ser un número entero entre ${min} y ${max}.`);
  return n;
}

const E = (p) => ETIQUETAS[p] || p;

const VALIDADORES = {
  tarifas: (v) => Object.fromEntries(Object.keys(POR_DEFECTO.tarifas).map((k) => [k, texto(v?.[k], E('tarifas.' + k), { max: 80 })])),
  horarios: (v) => Object.fromEntries(Object.keys(POR_DEFECTO.horarios).map((k) => [k, texto(v?.[k], E('horarios.' + k), { max: 200 })])),

  cursosEmpoderamiento: (v) => lista(v, 'Convocatorias', { max: 30 }).map((c) => ({
    nombre: texto(c?.nombre, E('cursosEmpoderamiento.nombre'), { max: 120 }),
    detalle: texto(c?.detalle, E('cursosEmpoderamiento.detalle'), { vacio: true, max: 400 }),
    fechas: texto(c?.fechas, E('cursosEmpoderamiento.fechas'), { vacio: true, max: 300 }),
    cuota: texto(c?.cuota, E('cursosEmpoderamiento.cuota'), { vacio: true, max: 200 }),
    requisitos: texto(c?.requisitos, E('cursosEmpoderamiento.requisitos'), { vacio: true, max: 400 }),
    activo: c?.activo !== false && c?.activo !== 'false',
  })),

  lineasEmergencia: (v) => lista(v, 'Números de emergencia', { min: 1, max: 20 }).map((l) => ({
    nombre: texto(l?.nombre, E('lineasEmergencia.nombre'), { max: 120 }),
    numero: texto(l?.numero, E('lineasEmergencia.numero'), { max: 120 }),
  })),

  cuentaBancaria: (v) => {
    const clabe = texto(v?.clabe, E('cuentaBancaria.clabe'), { max: 40 });
    if (clabe.replace(/\D/g, '').length !== 18) throw new Error('La CLABE debe tener exactamente 18 dígitos.');
    return {
      banco: texto(v?.banco, E('cuentaBancaria.banco'), { max: 80 }),
      titular: texto(v?.titular, E('cuentaBancaria.titular'), { max: 120 }),
      clabe,
    };
  },

  circulosReflexion: (v) => Object.fromEntries(Object.keys(POR_DEFECTO.circulosReflexion).map((k) => [k, texto(v?.[k], E('circulosReflexion.' + k), { max: 80 })])),

  standUp: (v) => ({
    nombreCompleto: texto(v?.nombreCompleto, E('standUp.nombreCompleto'), { max: 150 }),
    duracion: texto(v?.duracion, E('standUp.duracion'), { max: 60 }),
    herramientas: texto(v?.herramientas, E('standUp.herramientas'), { max: 40 }),
    minimoPresencial: entero(v?.minimoPresencial, E('standUp.minimoPresencial')),
    minimoEnLinea: entero(v?.minimoEnLinea, E('standUp.minimoEnLinea')),
  }),

  empresas: (v) => {
    const correo = texto(v?.contacto?.correo, E('empresas.contacto.correo'), { max: 120 });
    if (!esEmail(correo)) throw new Error('El correo de contacto de empresas no parece válido.');
    const letras = new Set();
    const modalidades = lista(v?.modalidades, 'Modalidades', { min: 1, max: 5 }).map((m) => {
      const letra = texto(m?.letra, E('empresas.modalidades.letra'), { max: 1 }).toUpperCase();
      if (!/^[A-Z]$/.test(letra)) throw new Error('La letra de cada modalidad debe ser una sola letra (A, B, C...).');
      if (letras.has(letra)) throw new Error(`La letra ${letra} está repetida en las modalidades.`);
      letras.add(letra);
      return { letra, nombre: texto(m?.nombre, E('empresas.modalidades.nombre'), { max: 100 }), detalle: texto(m?.detalle, E('empresas.modalidades.detalle'), { max: 400 }) };
    });
    const lineas = lista(v?.lineas, 'Líneas temáticas', { min: 1, max: 8 }).map((l) => ({
      nombre: texto(l?.nombre, E('empresas.lineas.nombre'), { max: 100 }),
      talleres: lista(l?.talleres, `Talleres de "${limpiar(l?.nombre)}"`, { min: 1, max: 20 }).map((t) => ({
        nombre: texto(t?.nombre, E('empresas.lineas.talleres.nombre'), { max: 120 }),
        objetivo: texto(t?.objetivo, E('empresas.lineas.talleres.objetivo'), { max: 600 }),
      })),
    }));
    return {
      contacto: {
        correo,
        telefonos: texto(v?.contacto?.telefonos, E('empresas.contacto.telefonos'), { max: 120 }),
        web: texto(v?.contacto?.web, E('empresas.contacto.web'), { vacio: true, max: 120 }),
      },
      modalidades,
      lineas,
    };
  },

  rrhh: (v) => {
    const url = texto(v?.formularioUrl, E('rrhh.formularioUrl'), { max: 400 });
    if (!/^https?:\/\//i.test(url)) throw new Error('El enlace del formulario de Recursos Humanos debe empezar con http:// o https://');
    return { formularioUrl: url, formularioMensaje: texto(v?.formularioMensaje, E('rrhh.formularioMensaje'), { max: 300 }) };
  },

  vacantes: (v) => lista(v, 'Vacantes', { max: 30 }).map((x) => texto(x, 'Vacante', { max: 120 })),
  serviciosCentro: (v) => lista(v, 'Servicios del centro', { min: 1, max: 20 }).map((x) => texto(x, 'Servicio', { max: 120 })),

  donativosEspecie: (v) => ({
    correos: [...new Set(lista(v?.correos, 'Correos de seguimiento', { min: 1, max: 10 }).map((c) => {
      const t = limpiar(c).toLowerCase();
      if (!esEmail(t)) throw new Error(`"${t || '(vacío)'}" no es un correo válido.`);
      return t;
    }))],
  }),

  formulario: (v) => {
    const url = texto(v?.url, E('formulario.url'), { max: 300 });
    if (!/^https?:\/\//i.test(url)) throw new Error('El enlace del formulario debe empezar con http:// o https://');
    const flujos = lista(v?.flujos, 'Servicios donde se envía el formulario', { max: 20 }).map((f) => {
      const t = limpiar(f).toLowerCase();
      if (!FLUJOS.includes(t)) throw new Error(`"${t}" no es un servicio válido. Opciones: ${FLUJOS.join(', ')}.`);
      return t;
    });
    return { url, mensaje: texto(v?.mensaje, E('formulario.mensaje'), { max: 300 }), flujos: [...new Set(flujos)] };
  },

  palabrasEmergencia: (v) => [...new Set(lista(v, 'Frases de emergencia', { min: 1, max: 300 })
    .map((f) => quitaAcentos(limpiar(f))).filter(Boolean))],
};

function validar(key, valor) {
  if (!Object.prototype.hasOwnProperty.call(VALIDADORES, key)) return { ok: false, error: 'Esa sección no se puede editar.' };
  try {
    return { ok: true, valor: VALIDADORES[key](valor) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Aplicar en memoria ───────────────────────────────────────────────────
function reconstruir() {
  reconstruirTextos();
  reconstruirMensajes();
}

// ─── Persistencia (Mongo + copia en archivo) ──────────────────────────────
function leerArchivo() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  } catch {
    return {};
  }
}
function escribirArchivo(obj) {
  try {
    fs.writeFileSync(ARCHIVO, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[CONFIG] No se pudo escribir la copia local:', err.message);
  }
}

function aplicarGuardados(guardados, origen) {
  let n = 0;
  for (const [key, valor] of Object.entries(guardados || {})) {
    const r = validar(key, valor);
    if (r.ok) { DATOS[key] = r.valor; n += 1; }
    else console.warn(`[CONFIG] Se omitió "${key}" guardado en ${origen}: ${r.error}`);
  }
  return n;
}

// Carga al arrancar: primero el archivo local, luego Mongo (que manda)
async function iniciarConfig() {
  let n = aplicarGuardados(leerArchivo(), 'archivo local');
  const remoto = await mongo.leerConfigRemota();
  if (remoto && Object.keys(remoto).length) n = aplicarGuardados(remoto, 'Mongo');
  reconstruir();
  console.log(`⚙️ Configuración editable cargada (${n} sección(es) personalizadas).`);
}

async function guardarSeccion(key, valorNuevo) {
  const r = validar(key, valorNuevo);
  if (!r.ok) return r;

  DATOS[key] = r.valor;
  reconstruir();

  const local = leerArchivo();
  local[key] = r.valor;
  escribirArchivo(local);

  let aviso = null;
  try {
    await mongo.guardarConfigRemota(key, r.valor);
  } catch (err) {
    aviso = 'El cambio ya está activo, pero no se pudo guardar en la base de datos (' + err.message + '). Se conservó una copia en el servidor.';
    console.error('[CONFIG]', aviso);
  }
  console.log(`⚙️ [CONFIG] Sección "${key}" actualizada desde el panel admin.`);
  return { ok: true, valor: r.valor, aviso };
}

async function restaurarSeccion(key) {
  if (!Object.prototype.hasOwnProperty.call(POR_DEFECTO, key)) return { ok: false, error: 'Esa sección no se puede restaurar.' };
  DATOS[key] = clonar(POR_DEFECTO[key]);
  reconstruir();
  const local = leerArchivo();
  delete local[key];
  escribirArchivo(local);
  try { await mongo.borrarConfigRemota(key); } catch (err) { console.error('[CONFIG]', err.message); }
  console.log(`⚙️ [CONFIG] Sección "${key}" restaurada a los valores originales.`);
  return { ok: true, valor: DATOS[key] };
}

function describirConfig() {
  return {
    secciones: SECCIONES.map((s) => ({
      ...s,
      valor: clonar(DATOS[s.key]),
      personalizado: JSON.stringify(DATOS[s.key]) !== JSON.stringify(POR_DEFECTO[s.key]),
    })),
    etiquetas: ETIQUETAS,
    plantillas: PLANTILLAS,
  };
}

module.exports = { iniciarConfig, guardarSeccion, restaurarSeccion, describirConfig, validar };
