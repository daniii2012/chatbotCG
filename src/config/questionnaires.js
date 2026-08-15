const { esCorreoValido, esTelefonoValido, esOpcionLikertValida } = require('../utils/validators');

// ─── ESTUDIO SOCIOECONÓMICO (solo cuando no puede pagar la cuota) ──────────
const SOCIOECONOMICO_PREGUNTAS = [
  { key: 'estadoCivil', texto: '¿Cuál es tu estado civil? (Soltera, Casada, Viuda, Divorciada, Unión libre, Separada)' },
  { key: 'laborando', texto: '¿Actualmente te encuentras laborando? (Sí/No)' },
  { key: 'puesto', texto: '¿Qué puesto ocupas? (si no laboras, escribe "N/A")' },
  { key: 'ingresoMensual', texto: '¿A cuánto asciende tu ingreso mensual? (Menos de 5,000 / 5,000 a 10,000 / 10,000 a 15,000 / 15,000 a 20,000 / Más de 20,000)' },
  { key: 'dependientesEconomicos', texto: '¿Cuántas personas dependen económicamente de ti? (0 / 1 a 3 / 3 a 5 / 5 o más)' },
  { key: 'tipoVivienda', texto: 'Tu casa es: (Propia escriturada / Propia sin escriturar / Propia, la están pagando / Propia irregular / Rentada / Prestada / Vive con familiar)' },
  { key: 'discapacidad', texto: '¿Sufres de alguna discapacidad? (Visual, Lenguaje, Auditiva, Motriz, Física, Intelectual, Ninguna)' },
  { key: 'cuotaPropuesta', texto: '¿Cuánto podrías pagar como cuota de recuperación?' },
  { key: 'apoyoFamiliar', texto: '¿Cuentas con apoyo de algún familiar o persona cercana? (Sí/No)' },
  { key: 'ingresosCubrenNecesidades', texto: '¿Consideras que tus ingresos cubren tus necesidades básicas? (Sí/No)' },
  { key: 'dependeDeOtraPersona', texto: '¿Dependes económicamente de otra persona? (Sí/No)' },
  { key: 'violenciaFisica', texto: '¿Has vivido o vives violencia física (golpes, empujones, agresiones)? (Sí/No)' },
  { key: 'violenciaPsicologica', texto: '¿Has vivido o vives violencia psicológica o emocional (insultos, amenazas, humillaciones)? (Sí/No)' },
  { key: 'violenciaSexual', texto: '¿Has vivido o vives violencia sexual? (Sí/No)' },
  { key: 'violenciaEconomica', texto: '¿Has vivido o vives violencia económica (control de dinero, prohibición de trabajar)? (Sí/No)' },
  { key: 'violenciaPatrimonial', texto: '¿Has vivido o vives violencia patrimonial (daños o despojo de bienes)? (Sí/No)' },
  { key: 'violenciaDigital', texto: '¿Has vivido o vives violencia digital? (Sí/No)' },
  { key: 'violenciaOtra', texto: '¿Has vivido o vives algún otro tipo de violencia no mencionado? Descríbelo, o escribe "ninguna".' },
  { key: 'situacionDetalle', texto: 'Por último, cuéntanos brevemente la situación por la cual requieres atención y el impacto que ha tenido en tu vida personal o familiar.' },
];

// ─── ÁREA LEGAL FAMILIAR/PENAL (siempre, para quien elige Asesoría legal) ──
const LEGAL_FAMILIAR_PREGUNTAS = [
  { key: 'asuntoLegal', texto: '¿Cuál es tu asunto legal? (Divorcio, Guardia y custodia, Pensión alimenticia, Patria potestad, Violencia familiar, Asunto laboral, Violación o abuso sexual, Otro)' },
  { key: 'domicilio', texto: '¿Cuál es tu domicilio completo?' },
  { key: 'nacionalidad', texto: '¿Cuál es tu nacionalidad?' },
  { key: 'ciudadPais', texto: '¿En qué ciudad y país resides?' },
  { key: 'parejaConsumeSustancias', texto: '¿Tu pareja consume alguna sustancia psicoactiva? (Alcohol, Drogas, Otras, No consume, Otro)' },
  { key: 'ingresosPareja', texto: 'Solo si tu caso es divorcio o pensión alimenticia — ¿cuáles son tus ingresos? (Menores a 5,000 / Menores a 10,000 / Entre 10,000 y 20,000 / Más de 25,000 / No aplica)' },
  { key: 'aniosMatrimonio', texto: '¿Cuántos años de matrimonio o concubinato tienen? (escribe 0 si no aplica)' },
  { key: 'modalidadPosesion', texto: '¿Cuál es la modalidad de posesión de tu vivienda? (Co-propiedad con pareja, Propiedad de la usuaria, Propiedad de la pareja, Arrendamiento, Comodato, Usufructo, Otro)' },
  { key: 'datosDescendientes', texto: 'Si tienes hijos/as, escribe sus nombres y edades. Si no aplica, escribe "N/A".' },
  { key: 'dependeDeParejaEconomicamente', texto: '¿Dependes económicamente de tu pareja? (Sí / No / Su aportación es la más importante / Mi aportación es la más importante / Otro)' },
  { key: 'descendientesCohabitan', texto: '¿Tus hijos/as viven contigo? (Sí/No/N/A)' },
  { key: 'escolaridadDescendientes', texto: 'Si tus hijos/as estudian, indica brevemente su grado escolar y si es escuela pública o privada. Si no aplica, escribe "N/A".' },
  { key: 'ingresosComprobables', texto: 'Solo si requieres pensión alimenticia — ¿tus ingresos son comprobables? (Sí/No/N/A)' },
  { key: 'deudasComunes', texto: '¿Tienen deudas en común con tu pareja? (Sí/No)' },
];

// ─── CUESTIONARIO DE EMPODERAMIENTO / PAMVI (siempre, al asignar terapia) ──
const OPCIONES_LIKERT = '1⃣ Totalmente de acuerdo\n2⃣ De acuerdo\n3⃣ Ni de acuerdo ni en desacuerdo\n4⃣ En desacuerdo\n5⃣ Totalmente en desacuerdo';

const AFIRMACIONES_EMPODERAMIENTO = [
  'Me considero una persona valiosa',
  'Creo que tengo un gran número de cualidades',
  'La mayor parte del tiempo siento que soy un fracaso',
  'Me siento capaz de hacer las cosas tan bien como otros',
  'Siento que no tengo mucho de qué estar orgullosa',
  'Tengo una actitud positiva respecto a mí misma',
  'La mayoría del tiempo, me siento satisfecha conmigo misma',
  'Me gusta que la gente me respete',
  'A veces me siento inútil',
  'A veces me siento que soy buena para nada',
  'Me es difícil tomar decisiones',
  'Me cuesta trabajo decir que no',
  'Usualmente cuando hago algo para consentirme me siento culpable',
  'Me digo a mí que mi vida mejorará cuando las personas que me rodean cambien su manera de comportarse',
  'A veces doy tanto por una persona que llego al punto de descuidarme a mí misma y a mis responsabilidades',
  'Constantemente me veo involucrada en relaciones que son dolorosas para mí',
  'Usualmente no dejo que los demás conozcan mi verdadero "Yo"',
  'Si tengo algún problema, siento que no puedo confiar en alguien para pedir ayuda',
  'Cuando alguien hace algo que me molesta tiendo a no decir nada',
  'Usualmente hago lo que sea para evitar conflictos con otros',
  'Muchas veces tengo una sensación de temor o de muerte inminente',
  'Suelo poner las necesidades de los demás antes de las mías',
  'Cuando algo no me parece no dudo en expresar mi inconformidad',
  'Suelo evitar a personas o situaciones por miedo o pena',
  'Usualmente confío en mi propio juicio',
  'A veces acepto cosas que no me convencen del todo por no quedar mal con los demás',
  'Muchas veces me da pena expresar mi opinión ante los demás',
  'Me cuesta trabajo expresar mis sentimientos',
  'Trato de pasar desapercibida en situaciones sociales',
  'Me es fácil expresar mi opinión ante los demás',
  'Siento que no tengo a nadie en quién confiar',
  'Me siento aislada de los demás',
  'Sé que hay personas que me entienden',
  'Siento que mi vida depende de sucesos sobre los cuales no tengo control',
  'Cuando hago planes, estoy segura de que los haré funcionar',
  'Cuando obtengo lo que quiero suele ser por suerte o casualidad',
  'Siento que tengo poca oportunidad de proteger mis intereses personales cuando entran en conflicto con los de otros',
  'Obtener las cosas que quiero requiere que complazca a quienes se encuentran arriba de mí',
  'Sé que puedo controlar las cosas que pasan en mi vida',
  'Usualmente sé proteger mis intereses personales',
  'Cuando obtengo lo que quiero es usualmente porque trabajé por ello',
  'Mi vida está determinada por mis propias acciones',
  'Cuando no sé decir "no" me enojo conmigo misma',
  'Me gustaría ser invisible',
];

const EMPODERAMIENTO_PREGUNTAS = [
  { key: 'estadoCivilEmp', texto: '¿Cuál es tu estado civil? (Soltera, Casada, Divorciada, Separación en proceso, Concubinato, Otro)' },
  { key: 'direccion', texto: '¿Cuál es tu dirección completa?' },
  { key: 'mesIngresoPrograma', texto: '¿En qué mes ingresaste al programa?' },
  ...AFIRMACIONES_EMPODERAMIENTO.map((texto, i) => ({
    key: `emp_${String(i + 1).padStart(2, '0')}`,
    texto: `(${i + 1}/${AFIRMACIONES_EMPODERAMIENTO.length}) ${texto}\n\n${OPCIONES_LIKERT}`,
    validate: esOpcionLikertValida,
    errorMsg: '⚠️ Por favor responde solo con un número del 1 al 5.',
  })),
].flat();

// ─── REGISTRO DE LLAMADAS EMPRESARIALES/EDUCATIVAS ─────────────────────────
const EMPRESARIAL_PREGUNTAS = [
  { key: 'nombrePersona', texto: '¿Cuál es tu *nombre completo*?' },
  { key: 'cargo', texto: '¿Cuál es tu cargo o puesto?' },
  {
    key: 'telefonoOficina',
    texto: '¿Cuál es el teléfono de tu oficina? (10 dígitos)',
    validate: esTelefonoValido,
    errorMsg: '⚠️ Ese teléfono no parece válido, debe tener 10 dígitos.',
  },
  {
    key: 'celular',
    texto: '¿Cuál es tu número celular? (10 dígitos)',
    validate: esTelefonoValido,
    errorMsg: '⚠️ Ese celular no parece válido, debe tener 10 dígitos.',
  },
  {
    key: 'correo',
    texto: '¿Cuál es tu correo electrónico?',
    validate: esCorreoValido,
    errorMsg: '⚠️ Ese correo no parece válido, revisa que tenga formato correcto (ejemplo@dominio.com).',
  },
  { key: 'comoSeEntero', texto: '¿Cómo te enteraste de Casa Gaviota? (Evento, Tarjeta, Página web, LinkedIn, Programa de radio o TV, Redes sociales)' },
  { key: 'asuntoInteres', texto: '¿Cuál es el asunto que te interesa? (Donativo económico, Donativo en especie, Voluntariado empresarial, Conferencias, Protocolos de atención, Norma de igualdad 025, Talleres de sensibilización, Alianza, Entrevista, Medios de comunicación, Invitación a evento externo, Bazar, Becas, Stand Up contra el acoso callejero, Servicios de atención psicológica, NOM-035, Contratación de servicios, Otro)' },
  { key: 'temasCapacitacion', texto: 'Si tu interés es capacitación, ¿qué temas te interesan? (Igualdad, Inclusión, Discriminación, Acoso y hostigamiento, Educación para la paz, Empoderamiento femenino, Protocolos de atención, Diplomado INDL, Diplomado de Metodologías de Intervención a las violencias — si no aplica, escribe "N/A")' },
  { key: 'horarioLlamada', texto: '¿En qué horarios te podemos llamar?' },
  { key: 'comentarios', texto: '¿Algún comentario adicional? Si no, escribe "ninguno".' },
];

module.exports = {
  SOCIOECONOMICO_PREGUNTAS,
  LEGAL_FAMILIAR_PREGUNTAS,
  EMPODERAMIENTO_PREGUNTAS,
  EMPRESARIAL_PREGUNTAS,
};
