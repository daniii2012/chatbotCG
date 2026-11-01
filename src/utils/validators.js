// ─── Validaciones básicas reutilizables en todo el bot ─────────────────────

const RIESGO_INMEDIATO_REGEX = /me quiero matar|me va a matar|tiene un arma|está aqu[ií] ahora|no puedo salir|estoy en peligro|es una emergencia|estoy en riesgo|necesito (ayuda urgente|una ambulancia|auxilio|que me ayuden ahora)|ay[uú]denme|auxilio|llamen a la (polic[ií]a|ambulancia)|me est[aá]n (golpeando|lastimando|agrediendo)|me va a (matar|lastimar|golpear)|est[aá]n tocando la puerta|no puedo respirar|me desmay[oó]/i;

function esRiesgoInmediato(texto) {
  return RIESGO_INMEDIATO_REGEX.test(texto);
}

function esCorreoValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
}

function esTelefonoValido(texto) {
  const limpio = texto.replace(/[\s\-()]/g, '');
  return /^\d{10}$/.test(limpio); // 10 dígitos, formato México
}

function esEdadValida(texto) {
  const n = Number(texto.trim());
  return Number.isInteger(n) && n >= 12 && n <= 100;
}

// ─── Nombre completo (nombre y apellidos) ──────────────────────────────────
const PARTICULAS_NOMBRE = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'di', 'van', 'von']);
// Mínimo de palabras reales (nombre + al menos un apellido).
// Si algún día quieren aceptar solo el nombre, cámbialo a 1.
const MIN_PALABRAS_NOMBRE = 2;

function validarNombreCompleto(texto) {
  const nombre = String(texto || '').trim().replace(/\s+/g, ' ');

  if (!nombre) {
    return { ok: false, error: '⚠️ No recibí tu nombre. Escribe tu nombre completo (nombre y apellidos).' };
  }

  // Solo letras (con acentos y ñ), espacios, apóstrofo, guion y punto
  if (!/^\p{L}[\p{L}\s'.\-]*$/u.test(nombre)) {
    return { ok: false, error: '⚠️ Tu nombre solo puede llevar letras, sin números ni símbolos.' };
  }

  const palabras = nombre
    .split(' ')
    .map((p) => p.replace(/[.'\-]/g, ''))
    .filter((p) => p.length >= 2 && !PARTICULAS_NOMBRE.has(p.toLowerCase()));

  if (palabras.length < MIN_PALABRAS_NOMBRE) {
    return {
      ok: false,
      error: '⚠️ Falta tu apellido. Escribe tu nombre completo (nombre y apellidos), por ejemplo: María López Hernández.',
    };
  }

  return { ok: true, valor: nombre };
}

// Versión booleana, para usarla en los cuestionarios (validate)
function esNombreCompleto(texto) {
  return validarNombreCompleto(texto).ok;
}

// ─── Fecha de nacimiento (DD/MM/AAAA) ──────────────────────────────────────
const EDAD_MINIMA = 12;
const EDAD_MAXIMA = 100;

// Fecha de hoy en la Ciudad de México (el servidor de Render está en UTC)
function hoyEnMexico() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (tipo) => Number(partes.find((p) => p.type === tipo).value);
  return { anio: get('year'), mes: get('month'), dia: get('day') };
}

function validarFechaNacimiento(texto) {
  const m = String(texto || '').trim().match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);

  if (!m) {
    return { ok: false, error: '⚠️ Escribe tu fecha de nacimiento solo con números, en formato día/mes/año. Ejemplo: 15/03/1998.' };
  }

  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);

  // ¿Existe de verdad? (rechaza 31/02/2000, 15/13/1998, etc.)
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  if (f.getUTCFullYear() !== anio || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== dia) {
    return { ok: false, error: '⚠️ Esa fecha no existe. Revisa el día y el mes (formato día/mes/año). Ejemplo: 15/03/1998.' };
  }

  const hoy = hoyEnMexico();
  const esFutura = anio > hoy.anio
    || (anio === hoy.anio && (mes > hoy.mes || (mes === hoy.mes && dia > hoy.dia)));
  if (esFutura) {
    return { ok: false, error: '⚠️ La fecha de nacimiento no puede ser posterior a hoy. Revisa el año.' };
  }

  let edad = hoy.anio - anio;
  if (hoy.mes < mes || (hoy.mes === mes && hoy.dia < dia)) edad -= 1;

  if (edad < EDAD_MINIMA || edad > EDAD_MAXIMA) {
    return { ok: false, error: `⚠️ Con esa fecha resultan ${edad} años y atendemos de ${EDAD_MINIMA} a ${EDAD_MAXIMA}. Revisa el año.` };
  }

  const dos = (n) => String(n).padStart(2, '0');
  return { ok: true, fecha: `${dos(dia)}/${dos(mes)}/${anio}`, edad };
}

function esNoVacio(texto) {
  return texto.trim().length > 0;
}

function esOpcionLikertValida(texto) {
  return ['1', '2', '3', '4', '5'].includes(texto.trim());
}

module.exports = {
  esRiesgoInmediato, esCorreoValido, esTelefonoValido, esEdadValida, esNoVacio, esOpcionLikertValida,
  validarNombreCompleto, esNombreCompleto, validarFechaNacimiento
};