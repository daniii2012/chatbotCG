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
    url: 'https://casagaviota.tfaforms.net/33',
    mensaje: '📝 Para terminar, por favor llena este formulario de atención individual personalizada:',
    // Se envía al terminar CUALQUIER servicio que cierra una solicitud (la opción 6 solo da un número, no cierra solicitud)
    flujos: ['psico', 'lectura', 'legal', 'bio', 'standup', 'empeco', 'empresarial', 'donativos', 'rrhh'],
  },

  // Formulario del estudio socioeconómico: se envía cuando la persona dice que no puede pagar,
  // justo después de las preguntas del estudio (psicología y asesoría legal).
  estudioSocioeconomico: {
    url: 'https://casagaviota.tfaforms.net/32',
    mensaje: '📝 Para completar tu estudio socioeconómico, por favor llena este formulario:',
  },

  // Donativos en especie (ropa): a estos correos se manda la foto para dar seguimiento
  donativosEspecie: {
    correos: ['pamvi2@casagaviota.org.mx', 'pamvi@casagaviota.org.mx'],
  },

  // Catálogo de talleres para empresas (propuesta comercial 2026).
  // Editar aquí si cambia un taller, una línea o los datos de contacto.
  empresas: {
    contacto: {
      correo: 'contacto@casagaviota.org.mx',
      telefonos: '55 3096 5189 y 55 7430 3412',
      web: 'www.casagaviota.org',
    },
    // Correos que reciben el aviso cuando una empresa pide cotización (departamento especializado)
    avisoCorreos: ['contacto@casagaviota.org.mx'],
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

  // Cuenta para pagos de Atención psicológica y Círculos de Reflexión.
  // También es la que se envía en Biodescodificación y Donativos.
  // Campos vacíos (ej. tarjeta) no se muestran.
  cuentaBancaria: {
    banco: 'Banamex',
    clabe: '002180700431023955',
    cuenta: '3102395',
    tarjeta: '',
    beneficiario: 'Casa Gaviota un vuelo sin violencia A.C.',
  },

  // Cuenta EXCLUSIVA para pagos de Asesoría legal (es distinta a la anterior)
  cuentaBancariaLegal: {
    banco: 'Scotiabank',
    clabe: '044180256000411219',
    cuenta: '25600041121',
    tarjeta: '5579209114531731',
    beneficiario: 'Casa Gaviota',
  },

  // Podcast y redes sociales de Casa Gaviota. Se envían como enlaces con texto
  // ([texto](url)): lo que se ve y se toca es el texto, no la URL larga.
  // Se pueden agregar, quitar o cambiar desde el panel admin.
  redes: {
    mensajePodcast: 'Te invitamos a escuchar *Desobedientes Inc.*, el podcast de Casa Gaviota.',
    podcast: [
      { nombre: 'Velo en YouTube', url: 'https://youtube.com/playlist?list=PLPZyuze6psTuqMaDnYxC8wy9lgK2Vv1-M&si=IlPjBRXvBtDH0Z9J' },
      { nombre: 'Escúchalo en Spotify', url: 'https://open.spotify.com/show/4B290kg22YjcDQIy6J6qPe?si=03b0931dbbdf428c' },
    ],
    mensajeRedes: 'No olvides seguirnos en nuestras redes sociales:',
    sociales: [
      { nombre: 'Instagram: Casa Gaviota AC', url: 'https://www.instagram.com/casagaviota/' },
      { nombre: 'Facebook: Casa Gaviota AC', url: 'https://www.facebook.com/CasaGaviotaAC' },
      { nombre: 'TikTok: Casa Gaviota', url: 'https://www.tiktok.com/@casagaviota?_r=1&_t=ZS-9BZEdelQLvI' },
    ],
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

  // Opción 6 "Servicios del centro": estos servicios ya no pertenecen a Casa Gaviota.
  // Se comparte este número para recibir información o agendar una cita.
  centroContacto: {
    telefono: '+52 1 55 1151 0783',
    mensaje: 'Te agradecemos por tu interés en los servicios del centro, para recibir una atención personalizada puedes comunicarte al siguiente número:',
  },

  horarios: {
    psicologia: 'en línea, de lunes a viernes de 8:00 a. m. a 10:00 p. m.',
    // Atención psicológica presencial: hay pocos espacios
    presencial: 'lunes, jueves o viernes de 9:00 a. m. a 5:00 p. m., o sábados de 9:00 a. m. a 2:00 p. m.',
    // Asesoría legal: solo en línea
    legal: 'Las asesorías legales se brindan únicamente en modalidad en línea, con el fin de facilitar el acceso y el acompañamiento oportuno. Los horarios se acuerdan de manera individual, buscando empatar agendas y adaptarnos lo mejor posible a la disponibilidad de la usuaria.',
  },

  // Textos que acompañan algunas opciones del menú principal (puede quedar vacío)
  menuTextos: {
    empoderamiento: 'capacitaciones en maquillaje, masoterapia, diseño de corte, y más',
  },

  // Opción 10 del menú: Taller de lectura para Mujeres. Todo se edita desde el panel admin.
  // Si horarios o cuota quedan vacíos, esa línea no se muestra.
  tallerLectura: {
    titulo: 'Taller de lectura para Mujeres',
    modalidad: 'En línea',
    descripcion: 'Un espacio seguro y confidencial para compartir experiencias, fortalecer la autoestima y recibir apoyo emocional junto a otras mujeres, con escucha empática y sin juicios.',
    horarios: 'Jueves de 04:00pm a 06:00pm y sábados de 12:00pm a 02:00pm',
    cuota: '$50 por sesión',
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

// Datos bancarios listos para enviar. Solo muestra los campos que tengan valor.
function datosBancarios(c) {
  return [
    c?.banco && `Banco: ${c.banco}`,
    c?.clabe && `CLABE interbancaria: ${c.clabe}`,
    c?.cuenta && `Cuenta: ${c.cuenta}`,
    c?.tarjeta && `Tarjeta: ${c.tarjeta}`,
    c?.beneficiario && `Beneficiario: ${c.beneficiario}`,
  ].filter(Boolean).join('\n');
}

// Emoji de cada red según su nombre (si es una red nueva, usa 🔗)
function emojiRed(nombre) {
  const n = String(nombre || '').toLowerCase();
  if (n.includes('youtube')) return '▶️';
  if (n.includes('spotify')) return '🎧';
  if (n.includes('instagram')) return '📸';
  if (n.includes('facebook')) return '📘';
  if (n.includes('tiktok') || n.includes('tik tok')) return '🎵';
  if (n.includes('whatsapp')) return '💬';
  if (n.includes('twitter') || /\bx\b/.test(n)) return '🐦';
  if (n.includes('linkedin')) return '💼';
  return '🔗';
}

// Mensaje con el podcast y las redes. Cada enlace va como [texto](url).
// Si el equipo deja las listas vacías desde el panel, devuelve '' (no se muestra nada).
function textoRedes() {
  const r = DATOS.redes || {};
  const enlaces = (lista) => (lista || [])
    .filter((x) => x && x.nombre && x.url)
    .map((x) => `${emojiRed(x.nombre)} [${x.nombre}](${x.url})`);
  const podcast = enlaces(r.podcast);
  const sociales = enlaces(r.sociales);
  const bloques = [];
  if (podcast.length) bloques.push([r.mensajePodcast && `🎙️ ${r.mensajePodcast}`, podcast.join('\n')].filter(Boolean).join('\n\n'));
  if (sociales.length) bloques.push([r.mensajeRedes && `💙 ${r.mensajeRedes}`, sociales.join('\n')].filter(Boolean).join('\n'));
  return bloques.join('\n\n');
}

function mensajeFormulario() {
  return `${DATOS.formulario.mensaje}\n${DATOS.formulario.url}`;
}

function mensajeEstudio() {
  return `${DATOS.estudioSocioeconomico.mensaje}\n${DATOS.estudioSocioeconomico.url}`;
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
      `Esto es una solicitud, aún no es una fecha confirmada.\n\n` +
      `¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
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

module.exports = { DATOS, TEXTOS, mensajeFormulario, mensajeEstudio, datosBancarios, textoRedes, reconstruirTextos };