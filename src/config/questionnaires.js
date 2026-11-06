const { DATOS } = require('./datos');
const { esCorreoValido, esTelefonoValido, esOpcionLikertValida, esNombreCompleto } = require('../utils/validators');

// ─── ESTUDIO SOCIOECONÓMICO (solo cuando no puede pagar la cuota) ──────────
const SOCIOECONOMICO_PREGUNTAS = [
  { key: 'ingresoMensual', texto: '¿A cuánto asciende tu ingreso mensual? (Menos de 5,000 / 5,000 a 10,000 / 10,000 a 15,000 / 15,000 a 20,000 / Más de 20,000)' },
  { key: 'dependientesEconomicos', texto: '¿Cuántas personas dependen económicamente de ti? (0 / 1 a 3 / 3 a 5 / 5 o más)' },
];

// ─── ÁREA LEGAL (siempre, para quien elige Asesoría legal) ──────────────────
// Motivos contemplados según los lineamientos: guardia y custodia, divorcio,
// violencia familiar, violencia sexual y violencia digital.
const LEGAL_FAMILIAR_PREGUNTAS = [
  { key: 'asuntoLegal', texto: '¿Cuál es tu asunto legal? (Guardia y custodia, Divorcio, Violencia familiar, Violencia sexual, Violencia digital, Otro)' },
  { key: 'domicilio', texto: '¿Cuál es tu domicilio completo?' },
];

// ─── CUESTIONARIO DE EMPODERAMIENTO / PAMVI (siempre, al asignar terapia) ──
const EMPODERAMIENTO_PREGUNTAS = [
  { key: 'estadoCivilEmp', texto: '¿Cuál es tu estado civil? (Soltera, Casada, Divorciada, Separación en proceso, Concubinato, Otro)' },
];

// ─── REGISTRO DE SERVICIOS EMPRESARIALES/EDUCATIVOS ─────────────────────────
// Datos que piden los lineamientos: nombre completo, teléfono, cargo, correo,
// nombre de la empresa (se pide antes), horario de atención y ubicación si es una actividad presencial.
const EMPRESARIAL_PREGUNTAS = [
    {
    key: 'nombrePersona',
    texto: '¿Cuál es tu *nombre completo*?',
    validate: esNombreCompleto,
    errorMsg: '⚠️ Falta tu apellido o hay caracteres no válidos. Escribe tu nombre completo (nombre y apellidos), solo con letras.',
  },
  { key: 'cargo', texto: '¿Cuál es tu *cargo*?' },
  {
    key: 'celular',
    texto: '¿Cuál es tu número de teléfono? (10 dígitos)',
    validate: esTelefonoValido,
    errorMsg: '⚠️ Ese teléfono no parece válido, debe tener 10 dígitos.',
  },
  {
    key: 'correo',
    texto: '¿Cuál es tu *correo electrónico*?',
    validate: esCorreoValido,
    errorMsg: '⚠️ Ese correo no parece válido, revisa el formato (ejemplo@dominio.com).',
  },
  {
    key: 'horarioAtencion',
    texto: '¿En qué *horario de atención* podemos comunicarnos contigo? (ejemplo: lunes a viernes de 9:00 a 14:00)',
    validate: (t) => String(t || '').trim().length >= 4,
    errorMsg: '⚠️ Cuéntanos en qué días y horarios podemos contactarte (ejemplo: lunes a viernes de 9:00 a 14:00).',
  },
  {
    key: 'temasInteres',
    texto: '¿Qué *temas o líneas* de talleres te interesan? Puedes escribir varios (o "aún no lo sé").',
    validate: (t) => String(t || '').trim().length >= 2,
    errorMsg: '⚠️ Cuéntanos qué temas te interesan, o escribe "aún no lo sé".',
  },
  {
    key: 'modalidadFormacion',
    get texto() {
      const lista = DATOS.empresas.modalidades.map((m) => `${m.letra}) ${m.nombre}`).join('\n');
      return `¿Qué *modalidad* te interesa?\n\n${lista}\n\nSi aún no lo sabes, escribe "No lo sé" y lo definimos juntas.`;
    },
    validate: (t) => String(t || '').trim().length >= 1,
    get errorMsg() { return `⚠️ Escribe ${DATOS.empresas.modalidades.map((m) => m.letra).join(', ')} o "No lo sé".`; },
  },
  { key: 'ubicacion', texto: 'Si necesitas una actividad presencial, ¿en qué *ubicación* sería? (si no aplica, escribe "No aplica")' },
];

module.exports = {
  SOCIOECONOMICO_PREGUNTAS,
  LEGAL_FAMILIAR_PREGUNTAS,
  EMPODERAMIENTO_PREGUNTAS,
  EMPRESARIAL_PREGUNTAS,
};