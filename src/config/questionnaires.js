const { esCorreoValido, esTelefonoValido, esOpcionLikertValida } = require('../utils/validators');

// ─── ESTUDIO SOCIOECONÓMICO (solo cuando no puede pagar la cuota) ──────────
const SOCIOECONOMICO_PREGUNTAS = [
  { key: 'ingresoMensual', texto: '¿A cuánto asciende tu ingreso mensual? (Menos de 5,000 / 5,000 a 10,000 / 10,000 a 15,000 / 15,000 a 20,000 / Más de 20,000)' },
  { key: 'dependientesEconomicos', texto: '¿Cuántas personas dependen económicamente de ti? (0 / 1 a 3 / 3 a 5 / 5 o más)' },
];

// ─── ÁREA LEGAL FAMILIAR/PENAL (siempre, para quien elige Asesoría legal) ──
const LEGAL_FAMILIAR_PREGUNTAS = [
  { key: 'asuntoLegal', texto: '¿Cuál es tu asunto legal? (Divorcio, Guardia y custodia, Pensión alimenticia, Patria potestad, Violencia familiar, Asunto laboral, Violación o abuso sexual, Otro)' },
  { key: 'domicilio', texto: '¿Cuál es tu domicilio completo?' },
];

// ─── CUESTIONARIO DE EMPODERAMIENTO / PAMVI (siempre, al asignar terapia) ──
const EMPODERAMIENTO_PREGUNTAS = [
  { key: 'estadoCivilEmp', texto: '¿Cuál es tu estado civil? (Soltera, Casada, Divorciada, Separación en proceso, Concubinato, Otro)' },
  { key: 'direccion', texto: '¿Cuál es tu dirección completa?' },
];

// ─── REGISTRO DE LLAMADAS EMPRESARIALES/EDUCATIVAS ─────────────────────────
const EMPRESARIAL_PREGUNTAS = [
  { key: 'nombrePersona', texto: '¿Cuál es tu *nombre completo*?' },
  {
    key: 'celular',
    texto: '¿Cuál es tu número celular? (10 dígitos)',
    validate: esTelefonoValido,
    errorMsg: '⚠️ Ese celular no parece válido, debe tener 10 dígitos.',
  },
];

module.exports = {
  SOCIOECONOMICO_PREGUNTAS,
  LEGAL_FAMILIAR_PREGUNTAS,
  EMPODERAMIENTO_PREGUNTAS,
  EMPRESARIAL_PREGUNTAS,
};