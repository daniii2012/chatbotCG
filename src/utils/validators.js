// ─── Validaciones básicas reutilizables en todo el bot ─────────────────────

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

module.exports = { esCorreoValido, esTelefonoValido, esEdadValida, esNoVacio, esOpcionLikertValida };
