// ─────────────────────────────────────────────────────────────────────
// MENSAJES DEL CHATBOT — Casa Gaviota
// ─────────────────────────────────────────────────────────────────────

const MESSAGES = {
  bienvenida: `¡Hola! 👋 Te estamos comunicando al chat bot de *Casa Gaviota — Un vuelo sin violencia A.C.*

Gracias por escribirnos. Te recuerdo que si tu asunto es urgente o sientes que tu vida está en riesgo, por favor *llama al 911*.

Serás atendida por profesionistas con perspectiva de género. 💙

*Menú de opciones:*

1️⃣ Terapia psicológica
2️⃣ Asesoría legal
3️⃣ Biodecodificación biológica
4️⃣ Stand Up
5️⃣ Empoderamiento económico
6️⃣ Servicios del centro de empoderamiento
7️⃣ Servicios empresariales
8️⃣ Donativos
9️⃣ Recursos Humanos

Escribe el número de tu opción.`,

  menuRepeat: `Por favor escribe el número de la opción que deseas (1-9).`,

  // ─── Mensajes compartidos entre flujos (cuestionarios largos) ─────────
  socioeconomicoIntro: `Entendemos tu situación, no te preocupes. 💙\n\nVamos a hacerte algunas preguntas para valorar tu cuota.`,
  legalFamiliarIntro: `¡Recibido! Antes de continuar, necesito algunos datos sobre tu caso legal.`,
  empoderamientoIntro: `Para conocerte mejor y darte un mejor acompañamiento, te compartimos un breve cuestionario. No hay respuestas correctas o incorrectas, solo responde con lo que más se acerque a cómo te sientes. 💪`,

  psico: {
    pedirNombre: `Para brindarte un mejor servicio, proporcióname tus datos:\n\n📝 Por favor escribe tu *nombre completo*:`,
    pedirTelefono: `Escribe tu *número de teléfono*:`,
    pedirCorreo: `Escribe tu *correo electrónico*:`,
    pedirResidencia: `Escribe tu *lugar de residencia* (ciudad o municipio):`,
    pedirEdad: `Escribe tu *edad*:`,
    preguntarCuota: (nombre) => `Gracias, ${nombre}. 😊\n\n*Costos del servicio:*\n• 1 sesión: $600 MXN\n• 4 sesiones: $2,000 MXN\n\n¿Puedes cubrir la cuota?\n\n1️⃣ Sí, puedo cubrir el costo\n2️⃣ No cuento con recursos en este momento`,
    enviarCuenta: `✅ Perfecto. Te enviamos los datos para el pago:\n\n🏦 *Datos bancarios:*\nBanco: BBVA\nTitular: Fundación Casa Gaviota A.C.\nCLABE: 012 180 00123456789 0\n\nUna vez realizado el pago, envíanos tu *comprobante* por este medio.`,
    confirmarPago: `¿Ya realizaste el pago?\n\n1️⃣ Sí, ya pagué\n2️⃣ Aún no he pagado`,
    pedirModalidad: `¡Recibido! 🎉 ¿En qué modalidad prefieres tu terapia?\n\n1️⃣ Presencial\n2️⃣ En línea (videollamada)`,
    asignacion: `Perfecto. En breve una terapeuta con horario disponible se pondrá en contacto contigo para confirmar tu cita. 💙\n\nTambién recibirás:\n📄 Reglamento\n📄 Carta compromiso\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    valoracionCuota: `¡Gracias! Hemos recibido tu información.\n\nNuestro equipo la revisará para asignarte una cuota personalizada. Si resultara menor a $100, te ofrecemos los *Círculos de Reflexión*:\n\n🌸 Espacios seguros donde podrás expresarte y descubrir que más mujeres están pasando por lo mismo.\n• Costo: $50 · 1 vez a la semana · 2 hrs\n\n¿Te interesa?\n1️⃣ Sí, quiero inscribirme\n2️⃣ Solo espero la valoración`,
    circulosInfo: (nombre) => `🌸 *Círculos de Reflexión*\n\n¡Listo, ${nombre}! Registramos tu inscripción con los datos que ya nos diste. En breve te contactamos con horarios disponibles. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    soloValoracion: `Entendido. En cuanto tengamos tu valoración nos ponemos en contacto. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  legal: {
    pedirNombre: `Para brindarte un mejor servicio, proporcióname tus datos:\n\n📝 Por favor escribe tu *nombre completo*:`,
    pedirTelefono: `Escribe tu *número de teléfono*:`,
    pedirCorreo: `Escribe tu *correo electrónico*:`,
    pedirResidencia: `Escribe tu *lugar de residencia*:`,
    pedirEdad: `Escribe tu *edad*:`,
    preguntarCuota: (nombre) => `Gracias, ${nombre}. 😊\n\n*Costo del servicio:*\n• 1 sesión: $600 MXN\n• 4 sesiones: $2,000 MXN\n\n¿Puedes cubrir la cuota?\n\n1️⃣ Sí, puedo cubrir el costo\n2️⃣ No cuento con recursos en este momento`,
    enviarCuenta: `✅ Perfecto. Te enviamos los datos para el pago:\n\n🏦 *Datos bancarios:*\nBanco: BBVA\nTitular: Fundación Casa Gaviota A.C.\nCLABE: 012 180 00123456789 0\n\nUna vez realizado el pago, envíanos tu *comprobante* por este medio.`,
    confirmarPago: `¿Ya realizaste el pago?\n\n1️⃣ Sí, ya pagué\n2️⃣ Aún no he pagado`,
    pedirModalidad: `¡Recibido! 🎉 ¿En qué modalidad prefieres la asesoría?\n\n1️⃣ Presencial\n2️⃣ En línea (videollamada)`,
    asignacion: `Perfecto. En breve una abogada se pondrá en contacto contigo para confirmar tu cita. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    valoracionCuota: `¡Gracias! Nuestro equipo revisará tu información. Si la cuota resultara muy baja, emitiremos una *carta de canalización* con opciones de apoyo gratuito.\n\nNos pondremos en contacto pronto.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  bio: {
    pedirNombre: `Para brindarte un mejor servicio, proporcióname tus datos:\n\n📝 Escribe tu *nombre completo*:`,
    pedirTelefono: `Escribe tu *número de teléfono*:`,
    pedirCorreo: `Escribe tu *correo electrónico*:`,
    pedirResidencia: `Escribe tu *lugar de residencia*:`,
    pedirEdad: `Escribe tu *edad*:`,
    preguntarAgendar: (nombre) => `Gracias, ${nombre}. 😊\n\n*Costo:* 1 sesión $1,250 MXN\n\n¿Deseas agendar ahora?\n\n1️⃣ Sí\n2️⃣ No`,
    agendarSi: `¡Genial! Te enviamos los datos para el pago:\n\n🏦 Banco: BBVA\nTitular: Fundación Casa Gaviota A.C.\nCLABE: 012 180 00123456789 0\n\nEnvía tu comprobante aquí para asignarte horario con la terapeuta. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    agendarNo: `Gracias por comunicarte con *Casa Gaviota*. Cuando estés lista, con gusto te ayudamos. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  standup: {
    intro: `💄 *Stand Up — Patrocinado por L'Oréal*\n\nHerramientas para intervenir, visibilizar y detener situaciones de acoso.\n\n*Sin costo.*\n\n¿Cuántas personas se beneficiarán del taller?\n\n1️⃣ Menos de 50 personas\n2️⃣ 50 personas o más`,
    menosCincuenta: `Para inscribirte regístrate aquí:\n\n🔗 https://casagaviota.org/setting/register/ncli\n\nTodos los *jueves a las 4:00 PM*.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    masCincuenta: `Para un grupo de 50 o más necesitamos los siguientes datos:\n\n📝 Escribe:\n• Nombre completo del responsable\n• Número total de personas\n• Día y hora de preferencia\n• Modalidad (online o presencial)\n• Ubicación (si es presencial)`,
    masCincuentaConfirm: `¡Gracias! En breve nos comunicaremos contigo para confirmar la capacitación. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  empEco: {
    inicio: `💼 *Empoderamiento Económico*\n\n1️⃣ Capacitación para el trabajo\n2️⃣ Belleza por un futuro\n3️⃣ Microemprendimiento\n4️⃣ Vinculación laboral\n\n¿Cuál te interesa?`,
    pedirNombre: `Escribe tu *nombre completo*:`,
    pedirTelefono: `Escribe tu *número de teléfono*:`,
    confirmacion: (nombre, programa) => `✅ ¡Gracias, ${nombre}!\n\nTu interés en *${programa}* fue registrado. Una asesora se pondrá en contacto en las próximas 48 horas.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  servicios: {
    inicio: `🏛️ *Servicios del Centro*\n\n• Talleres de bienestar\n• Masajes terapéuticos\n\nEscribe tu *nombre completo* para recibir información:`,
    pedirTelefono: `Escribe tu *número de teléfono*:`,
    pedirInteres: `¿Qué servicio te interesa?`,
    confirmacion: (nombre) => `✅ ¡Gracias, ${nombre}!\n\nEn breve te contactaremos con fechas y costos.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  empresarial: {
    inicio: `🏢 *Servicios Empresariales*\n\nTalleres y diplomados con perspectiva de género.\n\nEscribe el *nombre de tu empresa u organización*:`,
    confirmacion: (empresa, nombrePersona) => `✅ ¡Gracias, ${nombrePersona}!\n\nHemos registrado el interés de *${empresa}*. Una representante se pondrá en contacto pronto.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  donativos: {
    inicio: `💛 *Donativos*\n\n1️⃣ Donativo económico\n2️⃣ Donativo en especie\n3️⃣ Voluntariado`,
    economico: `🏦 *Datos bancarios:*\nBanco: BBVA\nTitular: Fundación Casa Gaviota A.C.\nCLABE: 012 180 00123456789 0\n\nEnvía tu comprobante aquí. ¡Gracias! 💛\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    especie: `📦 Lunes a viernes 9:00–17:00 hrs.\n📍 [Dirección Casa Gaviota]\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    voluntariado: `🙋 Escribe tu *nombre completo y teléfono*:`,
    confirmVoluntariado: (nombre) => `✅ ¡Gracias, ${nombre}! Nos pondremos en contacto pronto. 💛\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  rrhh: {
    inicio: `👩‍💼 *Recursos Humanos*\n\n1️⃣ Postulación para vacante\n2️⃣ Servicio social o prácticas profesionales\n3️⃣ Voluntariado\n4️⃣ Consultar vacantes disponibles`,
    vacante: `📝 Escribe tu *nombre completo y el puesto de interés*:`,
    servicio: `🎓 Escribe tu *nombre, institución educativa y carrera*:`,
    voluntariado: `🙋 Escribe tu *nombre completo y teléfono*:`,
    vacantes: `📋 *Vacantes actuales:*\n• Psicóloga clínica\n• Abogada\n• Coordinadora de comunicación\n\nEscribe tu nombre y puesto de interés para postularte.`,
    pedirCorreo: `Escribe tu *correo electrónico*:`,
    confirmacion: (nombre) => `✅ ¡Gracias, ${nombre}!\n\nEl área de RH revisará tu perfil y se pondrá en contacto contigo.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  noEntiendo: `No entendí tu respuesta. Por favor elige una opción escribiendo el número correspondiente.`,
};

module.exports = { MESSAGES };
