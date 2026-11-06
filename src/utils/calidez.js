// Frases de acompañamiento para que el bot suene cercano (no mecánico).
// Detectan cuando la persona comparte algo difícil y responden primero con calidez.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const VIOLENCIA = /(violencia|violent|golpe|golpea|maltrat|abus|acoso|acosa|amenaz|agresi|me pega|me grita|me controla)/;
const MALESTAR = /(triste|tristeza|deprim|ansiedad|ansios|angustia|\bsola\b|soledad|miedo|llor|no puedo mas|ya no puedo|agotad|cansad|abrumad|desesper|estres|duelo|me siento mal|sufr)/;

function hayMalestar(texto) {
  const n = norm(texto);
  return VIOLENCIA.test(n) || MALESTAR.test(n);
}

// Frase de acompañamiento según lo que la persona compartió
function frasePrevia(texto) {
  if (VIOLENCIA.test(norm(texto))) {
    return 'Gracias por contármelo, sé que hablar de esto no es fácil. Nadie merece vivir violencia, y buscar apoyo es un paso muy valioso. 💙';
  }
  return 'Gracias por confiar en mí y compartir cómo te sientes. No tienes que enfrentarlo sola: estoy aquí para orientarte en este primer paso. 💙';
}

// Siempre devuelve una frase: cálida si hay malestar, sencilla si no
function agradecerMotivo(texto) {
  return hayMalestar(texto) ? frasePrevia(texto) : 'Gracias por contármelo. 💙';
}

module.exports = { hayMalestar, frasePrevia, agradecerMotivo };
