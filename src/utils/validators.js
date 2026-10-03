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

function esNoVacio(texto) {
  return texto.trim().length > 0;
}

function esOpcionLikertValida(texto) {
  return ['1', '2', '3', '4', '5'].includes(texto.trim());
}

module.exports = {
  esRiesgoInmediato, esCorreoValido, esTelefonoValido, esEdadValida, esNoVacio, esOpcionLikertValida
};