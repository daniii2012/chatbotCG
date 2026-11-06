// ═══════════════════════════════════════════════════════════════
// config/datos.js
// ÚNICO lugar que hay que editar cuando algo cambie en Casa Gaviota:
// tarifas, horarios, líneas de emergencia, cursos, link del formulario...
// El prompt de la IA (senders/groq.js) y los flujos leen de aquí.
// ═══════════════════════════════════════════════════════════════

const DATOS = {
  // Formulario de Forms Assembly que se envía al terminar el flujo.
  // `flujos` = en qué flujos se manda (nombres internos de session.flow).
  formulario: {
    url: 'https://casagaviota.tfaforms.net/32',
    mensaje: '📝 Para terminar, por favor llena este formulario:',
    flujos: ['psico', 'legal'],
  },

  // Donativos en especie (ropa): a estos correos se manda la foto para dar seguimiento
  donativosEspecie: {
    correos: ['poamvi2@casagaviota.org.mx', 'pamvi@casagaviota.org.mx'],
  },

  // Catálogo de talleres para empresas (propuesta comercial 2026).
  // Editar aquí si cambia un taller, una línea o los datos de contacto.
  empresas: {
    contacto: {
      correo: 'contacto@casagaviota.org.mx',
      telefonos: '55 3096 5189 y 55 7430 3412',
      web: 'www.casagaviota.org',
    },
    modalidades: [
      { letra: 'A', nombre: 'Sesión focalizada', detalle: 'Una temática concreta para sensibilizar, abrir diálogo y compartir herramientas prácticas.' },
      { letra: 'B', nombre: 'Ruta temática', detalle: 'Un conjunto de talleres relacionados para profundizar en una prioridad organizacional.' },
      { letra: 'C', nombre: 'Programa a la medida', detalle: 'Selección de contenidos según los equipos, públicos y objetivos de la empresa.' },
    ],
    lineas: [
      {
        nombre: 'Igualdad y prevención',
        talleres: [
          { nombre: 'Igualdad de género', objetivo: 'Reconocer las desigualdades de género en situaciones cotidianas y plantear alternativas que promuevan un trato justo, la corresponsabilidad y la igualdad de oportunidades.' },
          { nombre: 'Violencias de género', objetivo: 'Identificar las distintas manifestaciones de las violencias de género y reconocer herramientas de prevención, apoyo y atención para fortalecer relaciones seguras, respetuosas e igualitarias.' },
          { nombre: 'Prevención del acoso', objetivo: 'Distinguir conductas de acoso y practicar herramientas de respeto a los límites, consentimiento e intervención segura para contribuir a espacios de convivencia libres de violencia.' },
          { nombre: 'Diversidad e inclusión', objetivo: 'Reconocer la diversidad de identidades, capacidades y experiencias, y proponer prácticas que favorezcan la participación, el respeto y la igualdad de oportunidades.' },
        ],
      },
      {
        nombre: 'Cuidado y corresponsabilidad',
        talleres: [
          { nombre: 'Corresponsabilidad de los cuidados', objetivo: 'Construir acuerdos para distribuir de manera equitativa las tareas de cuidado y del hogar, reconociendo su valor y el derecho de todas las personas al bienestar, al descanso y al desarrollo personal.' },
          { nombre: 'Cultura del cuidado', objetivo: 'Integrar prácticas de autocuidado y cuidado mutuo en la vida cotidiana, mediante acuerdos que respeten las necesidades y los límites de cada persona y fortalezcan el bienestar colectivo.' },
        ],
      },
      {
        nombre: 'Bienestar emocional',
        talleres: [
          { nombre: 'Inteligencia emocional', objetivo: 'Reconocer las propias emociones y practicar herramientas de regulación, empatía y comunicación asertiva para responder con mayor conciencia y construir relaciones respetuosas.' },
          { nombre: 'Manejo del estrés', objetivo: 'Identificar las principales fuentes de estrés y practicar herramientas para afrontarlo de manera saludable, fortaleciendo el bienestar y el equilibrio entre la vida personal, familiar y laboral.' },
          { nombre: 'Burnout', objetivo: 'Reconocer señales de desgaste laboral y definir estrategias personales y organizacionales para cuidar el bienestar y favorecer condiciones de trabajo saludables.' },
        ],
      },
      {
        nombre: 'Comunicación y conflictos',
        talleres: [
          { nombre: 'Comunicación asertiva', objetivo: 'Practicar herramientas para expresar ideas, necesidades y límites con claridad y respeto, escuchar otras perspectivas y construir acuerdos que fortalezcan las relaciones.' },
          { nombre: 'Resolución pacífica de conflictos', objetivo: 'Aplicar herramientas de diálogo y negociación en ejercicios prácticos para abordar conflictos de manera pacífica y construir acuerdos respetuosos y equitativos.' },
          { nombre: 'Comunicación No Violenta', objetivo: 'Expresar observaciones, emociones y necesidades sin juicios ni descalificaciones, y formular peticiones claras que favorezcan la empatía, el diálogo y los acuerdos respetuosos.' },
        ],
      },
      {
        nombre: 'Liderazgo humano',
        // OJO: el PDF indica "2 temas" en esta línea pero solo describe uno. Agregar aquí el faltante.
        talleres: [
          { nombre: 'Liderazgo con perspectiva de género', objetivo: 'Emplear herramientas de liderazgo con perspectiva de género para distribuir responsabilidades, reconocer el talento y promover la participación del equipo con criterios de igualdad.' },
        ],
      },
      {
        nombre: 'Equipos saludables',
        talleres: [
          { nombre: 'Equipos saludables', objetivo: 'Construir acuerdos de comunicación, respeto y cuidado mutuo que fortalezcan el bienestar y la confianza en los equipos de trabajo.' },
        ],
      },
      {
        nombre: 'Salud de las mujeres',
        talleres: [
          { nombre: 'Menstruación digna', objetivo: 'Cuestionar mitos y estigmas sobre la menstruación y proponer prácticas que favorezcan el acceso a información, productos y espacios adecuados para vivirla con dignidad, autonomía y bienestar.' },
          { nombre: 'Perimenopausia y menopausia', objetivo: 'Reconocer los cambios asociados al cuerpo de las mujeres, cuestionar estigmas y explorar recursos de autocuidado y acompañamiento para transitar estas etapas con información, autonomía y bienestar.' },
          { nombre: 'Salud integral de las mujeres', objetivo: 'Identificar necesidades de salud física, emocional y social, y definir acciones de autocuidado y búsqueda de apoyo que fortalezcan el bienestar y la autonomía de las mujeres en las distintas etapas de su vida.' },
        ],
      },
      {
        nombre: 'Redes y colaboración',
        talleres: [
          { nombre: 'Sororidad', objetivo: 'Reconocer lo que nos une como mujeres y practicar formas de escucharnos, apoyarnos y construir alianzas, respetando nuestras diferencias y celebrando los logros de cada una.' },
          { nombre: 'Redes de cuidados', objetivo: 'Descubrir cómo acompañarnos y organizarnos para compartir los cuidados, creando acuerdos donde pedir ayuda, ofrecer apoyo y cuidar de quienes cuidan sea parte de la vida cotidiana.' },
          { nombre: 'Empatía y colaboración', objetivo: 'Practicar la escucha y el diálogo para comprender otras experiencias, sumar fortalezas y construir acuerdos que permitan trabajar en equipo con respeto y apoyo mutuo.' },
          { nombre: 'Mujeres que impulsan a otras mujeres', objetivo: 'Compartir saberes y experiencias entre mujeres, reconocer fortalezas y crear acuerdos de apoyo para abrirnos oportunidades y crecer juntas.' },
        ],
      },
    ],
  },

  tarifas: {
    psicologiaSesion: '$750 MXN',
    psicologiaPaquete4: '$2,500 MXN',
    asesoriaLegal: '$600 MXN',
    biodescodificacion: '$1,250 MXN',
  },

  // Datos bancarios que se envían para pagos y donativos
  cuentaBancaria: {
    banco: 'BBVA',
    titular: 'Fundación Casa Gaviota A.C.',
    clabe: '012 180 00123456789 0',
  },

  // Círculos de Reflexión (se ofrecen cuando la cuota valorada es muy baja)
  circulosReflexion: {
    costo: '$50',
    frecuencia: '1 vez a la semana',
    duracion: '2 hrs',
    cuotaMinima: '$100',
  },

  // Formulario directo de Recursos Humanos (vacantes, servicio social, voluntariado)
  rrhh: {
    formularioUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSesG1Z-xNk8PR0biI_u4oZ10XXADZSb3hdvLHj70qaL0M-mPg/viewform',
    formularioMensaje: '📝 También puedes llenar directamente nuestro formulario:',
  },

  // Vacantes que ve la persona en Recursos Humanos (vacía = "no hay vacantes")
  vacantes: ['Psicóloga clínica', 'Abogada', 'Coordinadora de comunicación'],

  // Lista que ve la usuaria en "Servicios del centro"
  serviciosCentro: ['Talleres de bienestar', 'Masajes terapéuticos'],

  horarios: {
    psicologia: 'en línea, de lunes a viernes de 8:00 a. m. a 10:00 p. m.',
  },

  standUp: {
    nombreCompleto: 'Taller de Stand Up contra el acoso callejero',
    duracion: '50 minutos',
    herramientas: 'cinco',
    minimoPresencial: 80,
    minimoEnLinea: 50,
  },

  // El orden de esta lista = el número que ve la usuaria (1, 2, ...)
  cursosEmpoderamiento: [
    { nombre: 'Belleza por un Futuro', detalle: 'maquillaje y estilismo', fechas: '', cuota: '', requisitos: '', activo: true },
    {
      nombre: 'Mujeres en Acción',
      detalle: 'masoterapia, especialidades en masoterapia, diseño de corte de cabello, facial y aparatología',
      fechas: '', cuota: '', requisitos: '', activo: true,
    },
  ],

  // Para quitar una línea que desaparezca: bórrala de esta lista.
  // Para agregar una nueva: añade un objeto { nombre, numero }.
  lineasEmergencia: [
    { nombre: 'Emergencias', numero: '911' },
    { nombre: 'SOS Mujeres en Ciudad de México', numero: '*765' },
    { nombre: 'Línea de la Vida', numero: '800 911 2000' },
    { nombre: 'Red Nacional de Refugios', numero: '55 5674 9695 y 55 5243 6432' },
    { nombre: 'Lada nacional gratuita', numero: '800 822 4460' },
  ],

  // Frases que activan el mensaje de emergencia (solo cuando la usuaria NO está
  // dentro de un flujo). En minúsculas y sin acentos.
  palabrasEmergencia: [
    'me esta pegando', 'me va a matar', 'me quiere matar', 'me amenaza',
    'me golpea', 'me esta golpeando', 'me tiene encerrada', 'me persigue',
    'esta afuera de mi casa', 'tengo miedo por mi vida', 'estoy en peligro',
    'me quiero morir', 'quiero morir', 'quitarme la vida', 'suicid',
    'me quiero lastimar', 'hacerme dano', 'me estan violando',
    'ayuda urgente', 'es una emergencia',
  ],
};

function mensajeFormulario() {
  return `${DATOS.formulario.mensaje}\n${DATOS.formulario.url}`;
}

// ─── Textos nuevos (los que antes estaban en config/messages.js y
//     contradecían los lineamientos) ───
// Se arma con una función para poder RECONSTRUIRSE cuando el equipo edita datos desde el panel admin.
function construirTextos() {
  const activos = DATOS.cursosEmpoderamiento.filter((c) => c.activo !== false);
  const listaCursos = activos
    .map((c, i) => {
      const extra = [c.fechas && `Fechas: ${c.fechas}`, c.cuota && `Cuota: ${c.cuota}`, c.requisitos && `Requisitos: ${c.requisitos}`].filter(Boolean);
      return `${i + 1}. ${c.nombre}${c.detalle ? ': ' + c.detalle : ''}` + (extra.length ? '\n   ' + extra.join(' · ') : '');
    })
    .join('\n');

  return {

  standup: {
    intro:
      `Te cuento sobre el ${DATOS.standUp.nombreCompleto}: es un taller gratuito de ${DATOS.standUp.duracion} ` +
      `que ofrece ${DATOS.standUp.herramientas} herramientas para actuar de forma segura ante una situación de acoso callejero, ` +
      `tanto si lo vives directamente como si lo presencias.\n\n` +
      `Se imparte a grupos: presencial (mínimo ${DATOS.standUp.minimoPresencial} asistentes) o en línea (mínimo ${DATOS.standUp.minimoEnLinea} asistentes).\n\n` +
      `¿Qué modalidad te interesa?\n1. Presencial\n2. En línea`,
    pedirAsistentes: '¿Cuántas personas asistirían aproximadamente? (escribe solo el número)',
    errorAsistentes: '⚠️ Escribe el número aproximado de asistentes, solo con números.',
    noCumpleMinimo: (modalidad, min, n) =>
      `Gracias por el dato. Para la modalidad ${modalidad.toLowerCase()} necesitamos un mínimo de ${min} asistentes y, con ${n}, todavía no se alcanza. ` +
      `Si reúnes más personas o cambias de modalidad, con gusto lo retomamos. ` +
      `Si es para una empresa, en Servicios empresariales te cuentan de otros talleres.`,
    pedirNombre: 'Perfecto, sí se alcanza el mínimo. Para gestionar una fecha necesito algunos datos. ¿Cuál es tu nombre completo?',
    pedirTelefono: '¿Cuál es tu teléfono de contacto? (10 dígitos)',
    pedirCorreo: '¿Cuál es tu correo electrónico?',
    pedirInstitucion: '¿De qué institución o empresa eres?',
    pedirCargo: '¿Cuál es tu cargo?',
    confirmacion: (nombre) =>
      `Gracias, ${nombre}. Recibimos tu solicitud para el ${DATOS.standUp.nombreCompleto}. ` +
      `El equipo de Casa Gaviota te contactará para coordinar la fecha, según el calendario institucional. ` +
      `Esto es una solicitud, aún no es una fecha confirmada.`,
  },

  empEco: {
    inicio: activos.length
      ? `Estos son los cursos de empoderamiento económico:\n${listaCursos}\n\n` +
        `La disponibilidad depende del calendario institucional. ¿Cuál te interesa? (escribe el número)`
      : `Por el momento no tenemos convocatorias abiertas de empoderamiento económico. 💙\n\nEscribe *menú* para regresar al menú principal.`,
    // { '1': 'Belleza por un Futuro', '2': 'Mujeres en Acción' }
    programas: Object.fromEntries(activos.map((c, i) => [String(i + 1), c.nombre])),
  },
  };
}

const TEXTOS = construirTextos();
function reconstruirTextos() {
  Object.assign(TEXTOS, construirTextos());
}

module.exports = { DATOS, TEXTOS, mensajeFormulario, reconstruirTextos };