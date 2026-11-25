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
  { key: 'tarifas', icono: '💲', titulo: 'Cuotas de recuperación', ayuda: 'Cuotas de recuperación que ve la usuaria y que usa la IA. Escribe el monto tal como quieres que se vea (ej. $750 MXN).' },
  { key: 'horarios', icono: '🕐', titulo: 'Horarios', ayuda: 'Horario de atención (en línea y presencial) que se muestra y que usa la IA.' },
  { key: 'cursosEmpoderamiento', icono: '📣', titulo: 'Convocatorias de empoderamiento económico', ayuda: 'El orden de la lista es el número que ve la usuaria. Apaga "Visible" para ocultar una convocatoria sin borrarla. Fechas, cuota y requisitos son opcionales: si los dejas vacíos no se muestran.' },
  { key: 'lineasEmergencia', icono: '🚨', titulo: 'Números de emergencia', ayuda: 'Se envían cuando alguien está en riesgo. Debe quedar al menos uno.' },
  { key: 'cuentaBancaria', icono: '🏦', titulo: 'Datos bancarios: Psicología y Círculos de Reflexión', ayuda: 'Cuenta que se envía para pagos de atención psicológica y Círculos de Reflexión. También se usa en Biodescodificación y Donativos (la asesoría legal tiene su propia cuenta, abajo). La CLABE debe tener 18 dígitos. Cuenta y tarjeta son opcionales: si las dejas vacías no se muestran.' },
  { key: 'cuentaBancariaLegal', icono: '⚖️', titulo: 'Datos bancarios: Asesoría legal', ayuda: 'Cuenta que se envía SOLO para pagos de asesoría legal. La CLABE debe tener 18 dígitos. Cuenta y tarjeta son opcionales: si las dejas vacías no se muestran.' },
  { key: 'redes', icono: '📲', titulo: 'Podcast y redes sociales', ayuda: 'Se envían al final del menú, al terminar cada servicio y cuando alguien escribe \"redes\", \"instagram\", \"podcast\"... Cada enlace se ve con el \"Texto que se ve\" (ej. Instagram: Casa Gaviota AC) y lleva el enlace por debajo; debe empezar con https://. Puedes agregar, quitar, reordenar o cambiar redes. Si dejas las dos listas vacías, no se muestra nada.' },
  { key: 'circulosReflexion', icono: '🌸', titulo: 'Círculos de Reflexión', ayuda: 'Se ofrecen cuando la cuota valorada es muy baja.' },
  { key: 'tallerLectura', icono: '🌷', titulo: 'Taller de lectura para Mujeres (opción 10)', ayuda: 'Nombre, modalidad, descripción, horarios y cuota de recuperación de la opción 10 del menú. Si dejas vacíos los horarios o la cuota, esa línea no se muestra. La inscripción usa la misma cuenta bancaria de psicología (sección Datos bancarios).' },
  { key: 'standUp', icono: '🎤', titulo: 'Taller de Stand Up', ayuda: 'Nombre, duración y mínimo de asistentes.' },
  { key: 'empresas', icono: '🏢', titulo: 'Servicios empresariales', ayuda: 'Contacto, modalidades y catálogo de talleres (máximo 8 líneas).' },
  { key: 'rrhh', icono: '📝', titulo: 'Recursos Humanos: formulario', ayuda: 'Enlace del formulario que se muestra en Recursos Humanos para vacantes, servicio social y voluntariado.' },
  { key: 'vacantes', icono: '👩‍💼', titulo: 'Vacantes (Recursos Humanos)', ayuda: 'Si la dejas vacía, el bot avisa que no hay vacantes abiertas.' },
  { key: 'centroContacto', icono: '🏛️', titulo: 'Servicios del centro (opción 6)', ayuda: 'Es lo que se le muestra a quien elige la opción 6: el mensaje y el número de contacto.' },
  { key: 'donativosEspecie', icono: '👕', titulo: 'Donativos en especie (ropa)', ayuda: 'Correos a los que se envían las fotos y que reciben el aviso.' },
  { key: 'estudioSocioeconomico', icono: '📋', titulo: 'Formulario del estudio socioeconómico', ayuda: 'Enlace que se manda cuando la persona dice que no puede pagar, justo después de las preguntas del estudio (psicología y asesoría legal).' },
  { key: 'formulario', icono: '📝', titulo: 'Formulario final', ayuda: 'Enlace que se manda AL TERMINAR cualquier servicio (psicología, asesoría legal, biodescodificación, Stand Up, empoderamiento, empresas, donativos y Recursos Humanos). En "Servicios donde se envía" puedes quitar los que no lo necesiten.' },
  { key: 'palabrasEmergencia', icono: '⚠️', titulo: 'Frases que activan la alerta de emergencia', ayuda: 'Si la usuaria escribe una de estas frases fuera de un flujo, el bot manda los números de emergencia. Se guardan en minúsculas y sin acentos.' },
];

// Nombres amigables de cada campo (la ruta va sin números de posición)
const ETIQUETAS = {
  'tarifas.psicologiaSesion': 'Atención psicológica: 1 sesión',
  'tarifas.psicologiaPaquete4': 'Atención psicológica: paquete de 4 sesiones',
  'tarifas.asesoriaLegal': 'Asesoría legal: cuota por sesión',
  'tarifas.biodescodificacion': 'Biodescodificación: cuota de recuperación por sesión',
  'horarios.psicologia': 'Horario de atención psicológica en línea',
  'horarios.presencial': 'Horario de atención presencial (solo psicología)',
  'horarios.legal': 'Asesoría legal: modalidad y horarios (solo en línea)',
  'tallerLectura.titulo': 'Nombre del taller',
  'tallerLectura.modalidad': 'Modalidad (ej. En línea; puede quedar vacío)',
  'tallerLectura.descripcion': 'Descripción',
  'tallerLectura.horarios': 'Horarios',
  'tallerLectura.cuota': 'Cuota de recuperación (ej. $50 por sesión)',
  'cursosEmpoderamiento': 'Convocatorias',
  'cursosEmpoderamiento.nombre': 'Nombre del curso',
  'cursosEmpoderamiento.detalle': 'Qué se aprende (descripción corta)',
  'cursosEmpoderamiento.fechas': 'Fechas de la convocatoria',
  'cursosEmpoderamiento.cuota': 'Cuota de recuperación',
  'cursosEmpoderamiento.requisitos': 'Requisitos',
  'cursosEmpoderamiento.activo': 'Visible para las usuarias',
  'lineasEmergencia': 'Líneas',
  'lineasEmergencia.nombre': 'Nombre de la línea',
  'lineasEmergencia.numero': 'Número',
  'cuentaBancaria.banco': 'Banco',
  'cuentaBancaria.clabe': 'CLABE interbancaria (18 dígitos)',
  'cuentaBancaria.cuenta': 'Número de cuenta',
  'cuentaBancaria.tarjeta': 'Número de tarjeta (opcional)',
  'cuentaBancaria.beneficiario': 'Beneficiario',
  'cuentaBancariaLegal.banco': 'Banco',
  'cuentaBancariaLegal.clabe': 'CLABE interbancaria (18 dígitos)',
  'cuentaBancariaLegal.cuenta': 'Número de cuenta',
  'cuentaBancariaLegal.tarjeta': 'Número de tarjeta (opcional)',
  'cuentaBancariaLegal.beneficiario': 'Beneficiario',
  'redes.mensajePodcast': 'Mensaje del podcast',
  'redes.podcast': 'Enlaces del podcast',
  'redes.podcast.nombre': 'Texto que se ve (ej. Velo en YouTube)',
  'redes.podcast.url': 'Enlace (https://...)',
  'redes.mensajeRedes': 'Mensaje antes de las redes',
  'redes.sociales': 'Redes sociales',
  'redes.sociales.nombre': 'Texto que se ve (ej. Instagram: Casa Gaviota AC)',
  'redes.sociales.url': 'Enlace (https://...)',
  'circulosReflexion.costo': 'Cuota de recuperación',
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
  'empresas.avisoCorreos': 'Correos que reciben las solicitudes de cotización',
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
  'centroContacto.telefono': 'Número de contacto',
  'centroContacto.mensaje': 'Mensaje que se muestra antes del número',
  'estudioSocioeconomico.url': 'Enlace del formulario del estudio',
  'estudioSocioeconomico.mensaje': 'Mensaje que acompaña al enlace',
  'donativosEspecie.correos': 'Correos de seguimiento',
  'formulario.url': 'Enlace del formulario',
  'formulario.mensaje': 'Mensaje que acompaña al enlace',
  'formulario.flujos': 'Servicios donde se envía (psico, lectura, legal, bio, standup, empeco, servicios, empresarial, donativos, rrhh)',
  'palabrasEmergencia': 'Frases',
};

// Cómo se ve un elemento nuevo al pulsar "Agregar"
const PLANTILLAS = {
  cursosEmpoderamiento: { nombre: '', detalle: '', fechas: '', cuota: '', requisitos: '', activo: true },
  lineasEmergencia: { nombre: '', numero: '' },
  'redes.podcast': { nombre: '', url: '' },
  'redes.sociales': { nombre: '', url: '' },
  'empresas.modalidades': { letra: '', nombre: '', detalle: '' },
  'empresas.avisoCorreos': '',
  'empresas.lineas': { nombre: '', talleres: [] },
  'empresas.lineas.talleres': { nombre: '', objetivo: '' },
  vacantes: '',
  'donativosEspecie.correos': '',
  'formulario.flujos': '',
  palabrasEmergencia: '',
};

// Valores originales del código (para "Restaurar")
const POR_DEFECTO = {};
SECCIONES.forEach((s) => { POR_DEFECTO[s.key] = clonar(DATOS[s.key]); });

// ─── Validación ───────────────────────────────────────────────────────────
const FLUJOS = ['psico', 'lectura', 'legal', 'bio', 'standup', 'empeco', 'servicios', 'empresarial', 'donativos', 'rrhh'];
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

// Cuenta bancaria (psicología / asesoría legal): CLABE de 18 dígitos; cuenta y tarjeta son opcionales
function validarCuenta(v, key, deQue) {
  const clabe = texto(v?.clabe, E(key + '.clabe'), { max: 40 });
  if (clabe.replace(/\D/g, '').length !== 18) throw new Error(`La CLABE de la cuenta ${deQue} debe tener exactamente 18 dígitos.`);
  return {
    banco: texto(v?.banco, E(key + '.banco'), { max: 80 }),
    clabe,
    cuenta: texto(v?.cuenta, E(key + '.cuenta'), { vacio: true, max: 40 }),
    tarjeta: texto(v?.tarjeta, E(key + '.tarjeta'), { vacio: true, max: 40 }),
    beneficiario: texto(v?.beneficiario, E(key + '.beneficiario'), { max: 120 }),
  };
}

const VALIDADORES = {
  tarifas: (v) => Object.fromEntries(Object.keys(POR_DEFECTO.tarifas).map((k) => [k, texto(v?.[k], E('tarifas.' + k), { max: 80 })])),
  horarios: (v) => Object.fromEntries(Object.keys(POR_DEFECTO.horarios).map((k) => [k, texto(v?.[k] ?? POR_DEFECTO.horarios[k], E('horarios.' + k), { max: 500 })])),

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

  cuentaBancaria: (v) => validarCuenta(v, 'cuentaBancaria', 'de psicología y Círculos de Reflexión'),
  cuentaBancariaLegal: (v) => validarCuenta(v, 'cuentaBancariaLegal', 'de asesoría legal'),

  redes: (v) => {
    const enlace = (x, seccion) => {
      const nombre = texto(x?.nombre, E(`redes.${seccion}.nombre`), { max: 80 });
      if (/[\[\]()]/.test(nombre)) throw new Error(`El texto "${nombre}" no puede llevar corchetes ni paréntesis.`);
      const url = texto(x?.url, E(`redes.${seccion}.url`), { max: 500 });
      if (!/^https?:\/\/[^\s)]+$/i.test(url)) throw new Error(`El enlace de "${nombre}" debe empezar con http:// o https:// y no llevar espacios.`);
      return { nombre, url };
    };
    return {
      mensajePodcast: texto(v?.mensajePodcast, E('redes.mensajePodcast'), { vacio: true, max: 300 }),
      podcast: lista(v?.podcast, 'Enlaces del podcast', { max: 10 }).map((x) => enlace(x, 'podcast')),
      mensajeRedes: texto(v?.mensajeRedes, E('redes.mensajeRedes'), { vacio: true, max: 300 }),
      sociales: lista(v?.sociales, 'Redes sociales', { max: 15 }).map((x) => enlace(x, 'sociales')),
    };
  },

  circulosReflexion: (v) => Object.fromEntries(Object.keys(POR_DEFECTO.circulosReflexion).map((k) => [k, texto(v?.[k], E('circulosReflexion.' + k), { max: 80 })])),

  tallerLectura: (v) => ({
    titulo: texto(v?.titulo, E('tallerLectura.titulo'), { max: 120 }),
    modalidad: texto(v?.modalidad, E('tallerLectura.modalidad'), { vacio: true, max: 60 }),
    descripcion: texto(v?.descripcion, E('tallerLectura.descripcion'), { max: 600 }),
    horarios: texto(v?.horarios, E('tallerLectura.horarios'), { vacio: true, max: 300 }),
    cuota: texto(v?.cuota, E('tallerLectura.cuota'), { vacio: true, max: 120 }),
  }),

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
    // Si una configuración guardada antes no trae este dato, se usa el original
    const avisoCorreos = v?.avisoCorreos === undefined
      ? clonar(POR_DEFECTO.empresas.avisoCorreos)
      : [...new Set(lista(v.avisoCorreos, 'Correos que reciben las solicitudes de cotización', { min: 1, max: 10 }).map((c) => {
        const t = limpiar(c).toLowerCase();
        if (!esEmail(t)) throw new Error(`"${t || '(vacío)'}" no es un correo válido.`);
        return t;
      }))];
    return {
      contacto: {
        correo,
        telefonos: texto(v?.contacto?.telefonos, E('empresas.contacto.telefonos'), { max: 120 }),
        web: texto(v?.contacto?.web, E('empresas.contacto.web'), { vacio: true, max: 120 }),
      },
      avisoCorreos,
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
  centroContacto: (v) => ({
    telefono: texto(v?.telefono, E('centroContacto.telefono'), { max: 40 }),
    mensaje: texto(v?.mensaje, E('centroContacto.mensaje'), { max: 400 }),
  }),

  estudioSocioeconomico: (v) => {
    const url = texto(v?.url, E('estudioSocioeconomico.url'), { max: 300 });
    if (!/^https?:\/\//i.test(url)) throw new Error('El enlace del estudio socioeconómico debe empezar con http:// o https://');
    return { url, mensaje: texto(v?.mensaje, E('estudioSocioeconomico.mensaje'), { max: 300 }) };
  },

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

  const antes = clonar(DATOS[key]);
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
  return { ok: true, valor: r.valor, antes, aviso };
}

async function restaurarSeccion(key) {
  if (!Object.prototype.hasOwnProperty.call(POR_DEFECTO, key)) return { ok: false, error: 'Esa sección no se puede restaurar.' };
  const antes = clonar(DATOS[key]);
  DATOS[key] = clonar(POR_DEFECTO[key]);
  reconstruir();
  const local = leerArchivo();
  delete local[key];
  escribirArchivo(local);
  try { await mongo.borrarConfigRemota(key); } catch (err) { console.error('[CONFIG]', err.message); }
  console.log(`⚙️ [CONFIG] Sección "${key}" restaurada a los valores originales.`);
  return { ok: true, valor: DATOS[key], antes };
}

// ─── Para el historial: qué cambió exactamente ───────────────────────────
function aplanar(v, ruta, out) {
  if (Array.isArray(v)) {
    if (v.length === 0) out.set(JSON.stringify(ruta), '(lista vacía)');
    v.forEach((x, i) => aplanar(x, ruta.concat(i), out));
  } else if (v && typeof v === 'object') {
    Object.keys(v).forEach((k) => aplanar(v[k], ruta.concat(k), out));
  } else {
    out.set(JSON.stringify(ruta), v);
  }
}

function etiquetaDeRuta(key, ruta) {
  const sinNumeros = ruta.filter((r) => typeof r !== 'number');
  const completa = [key, ...sinNumeros].join('.');
  const nombre = ETIQUETAS[completa] || ETIQUETAS[key] || String(sinNumeros[sinNumeros.length - 1] || key);
  const posiciones = ruta.filter((r) => typeof r === 'number').map((n) => n + 1);
  return posiciones.length ? `${nombre} (#${posiciones.join('.')})` : nombre;
}

function describirCambios(key, antes, despues) {
  const a = new Map(); const d = new Map();
  aplanar(antes, [], a); aplanar(despues, [], d);
  const corto = (v) => {
    const t = String(v === undefined ? '' : v);
    return t.length > 80 ? t.slice(0, 77) + '…' : t;
  };
  const lineas = [];
  for (const [k, nuevo] of d) {
    const viejo = a.get(k);
    if (viejo === nuevo) continue;
    const ruta = JSON.parse(k);
    lineas.push(`${etiquetaDeRuta(key, ruta)}: ${a.has(k) ? '“' + corto(viejo) + '”' : '(nuevo)'} → “${corto(nuevo)}”`);
  }
  for (const [k, viejo] of a) {
    if (d.has(k)) continue;
    lineas.push(`${etiquetaDeRuta(key, JSON.parse(k))}: “${corto(viejo)}” → (eliminado)`);
  }
  if (lineas.length > 25) { const extra = lineas.length - 25; lineas.length = 25; lineas.push(`… y ${extra} cambio(s) más`); }
  return lineas;
}

const tituloSeccion = (key) => (SECCIONES.find((s) => s.key === key) || {}).titulo || key;
const valorActual = (key) => clonar(DATOS[key]);

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

module.exports = { iniciarConfig, guardarSeccion, restaurarSeccion, describirConfig, validar, describirCambios, tituloSeccion, valorActual };
