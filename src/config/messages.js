const { DATOS } = require('./datos');

// Las tarifas, horarios y el nombre del taller salen de config/datos.js.
// Si algo cambia, se edita allá y aquí se actualiza solo.
function construirMensajes() {
const t = DATOS.tarifas;
const cb = DATOS.cuentaBancaria;
const cr = DATOS.circulosReflexion;

return {
  bienvenida: `¡Hola! Soy *Gavi*, la asistente virtual de *Casa Gaviota — Un vuelo sin violencia A.C.* 👋

Estoy aquí para orientarte y ayudarte a encontrar la información que necesitas.

Si estás ante una situación de emergencia o riesgo inmediato, puedes comunicarte al *911* para solicitar apoyo. 💙

*Menú de opciones:*

1️⃣ Atención psicológica
2️⃣ Asesoría legal
3️⃣ Biodescodificación biológica
4️⃣ ${DATOS.standUp.nombreCompleto}
5️⃣ Empoderamiento económico
6️⃣ Servicios del centro de empoderamiento
7️⃣ Servicios empresariales
8️⃣ Donativos
9️⃣ Recursos Humanos

Escribe el número de tu opción.`,

  // Primer mensaje: cálido, SIN menú
  saludoInicial: `¡Hola! Soy *Gavi*, la asistente virtual de *Casa Gaviota* 💙\n\nEstoy aquí para orientarte y ayudarte a encontrar la información que necesitas.\n\n¿Qué te gustaría consultar?`,

  // Comprobantes de pago
  comprobanteRecibido: `✅ ¡Gracias! Recibimos tu comprobante. El equipo de Casa Gaviota lo revisará y, una vez confirmado el pago, continuamos con tu cita. 💙`,
  recordarComprobante: `Cuando hayas hecho el pago, envíame tu *comprobante* (foto o captura) por este medio. 💙\n\nSi prefieres salir, escribe *menú*.`,

  menuRepeat: `Por favor escribe el número de la opción que deseas (1-9).`,

  // ─── Mensajes compartidos entre flujos (cuestionarios largos) ─────────
  socioeconomicoIntro: `Entendemos tu situación, no te preocupes. 💙\n\nVamos a hacerte algunas preguntas para valorar tu cuota.`,
  legalFamiliarIntro: `¡Recibido! Antes de continuar, necesito algunos datos sobre tu caso legal.`,
  empoderamientoIntro: `Para conocerte mejor y darte un mejor acompañamiento, te compartimos un breve cuestionario. No hay respuestas correctas o incorrectas, solo responde con lo que más se acerque a cómo te sientes. 💪`,

  psico: {
    pedirMotivo: `💙 Antes de empezar, cuéntame brevemente cuál es el *motivo de tu consulta* (solo lo que quieras compartir). Así identifico si nuestro servicio puede acompañarte.\n\nTe aclaro que la atención psicológica de Casa Gaviota es para mujeres, con perspectiva de género, y no brindamos atención a personas generadoras de violencia.`,
    pedirNombre: `Vamos paso a paso, sin prisa. 💙\n\nPara poder canalizarte con el equipo, escribe tu *nombre completo*:`,
    pedirTelefono: `Gracias. 😊 Ahora escribe tu *número de teléfono* para que podamos contactarte:`,
    pedirCorreo: `Perfecto. Escribe también tu *correo electrónico*, ahí te llegará la confirmación de tu registro:`,
    pedirResidencia: `¿En qué *ciudad o municipio* vives?`,
    pedirFechaNacimiento: `Vamos muy bien. 💙 Escribe tu *fecha de nacimiento* (día/mes/año). Ejemplo: 15/03/1998:`,
    preguntarCuota: (nombre) => `Gracias, ${nombre}. 😊\n\n*Atención psicológica ${DATOS.horarios.psicologia.replace(/\.$/, '')}.*\nEs un espacio seguro y sin juicios, con perspectiva de género, para acompañar tu proceso personal y emocional.\n\n*Costos del servicio:*\n• 1 sesión: ${t.psicologiaSesion}\n• 4 sesiones: ${t.psicologiaPaquete4}\n\n¿Puedes cubrir la cuota?\n\n1️⃣ Sí, puedo cubrir el costo\n2️⃣ No puedo cubrirla en este momento (te acompañamos con un estudio socioeconómico)`,
    enviarCuenta: `✅ Perfecto. Te enviamos los datos para el pago:\n\n🏦 *Datos bancarios:*\nBanco: ${cb.banco}\nTitular: ${cb.titular}\nCLABE: ${cb.clabe}\n\nUna vez realizado el pago, envíanos tu *comprobante* por este medio.`,
    confirmarPago: `¿Ya realizaste el pago?\n\n1️⃣ Sí, ya pagué\n2️⃣ Aún no he pagado`,
    asignacion: `Perfecto. En breve una terapeuta con horario disponible se pondrá en contacto contigo para confirmar tu cita en línea. 💙\n\nTambién recibirás:\n📄 Reglamento\n📄 Carta compromiso\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    valoracionCuota: `¡Gracias! Hemos recibido tu información.\n\nNuestro equipo la revisará para asignarte una cuota personalizada. Si resultara menor a ${cr.cuotaMinima}, te ofrecemos los *Círculos de Reflexión*:\n\n🌸 Espacios seguros donde podrás expresarte y descubrir que más mujeres están pasando por lo mismo.\n• Costo: ${cr.costo} · ${cr.frecuencia} · ${cr.duracion}\n\n¿Te interesa?\n1️⃣ Sí, quiero inscribirme\n2️⃣ Solo espero la valoración`,
    circulosInfo: (nombre) => `🌸 *Círculos de Reflexión*\n\n¡Listo, ${nombre}! Registramos tu inscripción con los datos que ya nos diste. En breve te contactamos con horarios disponibles. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    soloValoracion: `Entendido. En cuanto tengamos tu valoración nos ponemos en contacto. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  legal: {
    // Primer mensaje al elegir asesoría legal: primero explica en qué consiste, luego pide datos
    inicio: `⚖️ *Asesoría legal*\n\nEs una asesoría *en línea*, con perspectiva de género y sin juicios. La abogada te da información clara sobre tus derechos, los posibles pasos a seguir y las instituciones a las que puedes acudir, para que tomes decisiones informadas y seguras. Atendemos temas como guardia y custodia, divorcio, violencia familiar, violencia sexual y violencia digital.\n\nPara iniciar tu solicitud vamos paso a paso. 💙 Escribe tu *nombre completo*:`,
    pedirNombre: `Vamos paso a paso, sin prisa. 💙\n\nPara poder canalizarte con el equipo, escribe tu *nombre completo*:`,
    pedirTelefono: `Gracias. 😊 Ahora escribe tu *número de teléfono* para que podamos contactarte:`,
    pedirCorreo: `Perfecto. Escribe también tu *correo electrónico*, ahí te llegará la confirmación de tu registro:`,
    pedirResidencia: `¿En qué *ciudad o municipio* vives?`,
    pedirFechaNacimiento: `Vamos muy bien. 💙 Escribe tu *fecha de nacimiento* (día/mes/año). Ejemplo: 15/03/1998:`,
    preguntarCuota: (nombre) => `Gracias, ${nombre}. 😊\n\n*Antes de continuar, te cuento cómo funciona:* la asesoría es en línea y te orienta sobre tus derechos y los posibles pasos a seguir. La asesoría inicial no implica que Casa Gaviota asumirá tu caso: la abogada valorará tu situación y, si es posible continuar con el acompañamiento jurídico, te enviará una propuesta de honorarios por correo electrónico.\n\n*Costo:* cuota de recuperación de ${t.asesoriaLegal} por sesión.\n\n¿Puedes cubrir la cuota?\n\n1️⃣ Sí, puedo cubrir el costo\n2️⃣ No puedo cubrirla en este momento (te acompañamos con un estudio socioeconómico)`,
    enviarCuenta: `✅ Perfecto. Te enviamos los datos para el pago:\n\n🏦 *Datos bancarios:*\nBanco: ${cb.banco}\nTitular: ${cb.titular}\nCLABE: ${cb.clabe}\n\nUna vez realizado el pago, envíanos tu *comprobante* por este medio.`,
    confirmarPago: `¿Ya realizaste el pago?\n\n1️⃣ Sí, ya pagué\n2️⃣ Aún no he pagado`,
    asignacion: `Perfecto. En breve una abogada se pondrá en contacto contigo para acordar el horario de tu asesoría en línea, según tu disponibilidad y la suya. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
    valoracionCuota: `¡Gracias! Nuestro equipo revisará tu información. Si la cuota resultara muy baja, emitiremos una *carta de canalización* con opciones de apoyo gratuito.\n\nNos pondremos en contacto pronto.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  bio: {
    pedirNombre: `Vamos paso a paso, sin prisa. 💙\n\nEscribe tu *nombre completo*:`,
    pedirTelefono: `Gracias. 😊 Ahora escribe tu *número de teléfono* para que podamos contactarte:`,
    pedirCorreo: `Perfecto. Escribe también tu *correo electrónico*, ahí te llegará la confirmación de tu registro:`,
    pedirResidencia: `¿En qué *ciudad o municipio* vives?`,
    pedirFechaNacimiento: `Vamos muy bien. 💙 Escribe tu *fecha de nacimiento* (día/mes/año). Ejemplo: 15/03/1998:`,
    preguntarAgendar: (nombre) => `Gracias, ${nombre}. 😊\n\n*Costo:* 1 sesión ${t.biodescodificacion}\nLas sesiones son en línea y están sujetas a la disponibilidad de agenda.\n\n¿Deseas agendar ahora?\n\n1️⃣ Sí\n2️⃣ No`,
    agendarSi: `¡Genial! Te enviamos los datos para el pago:\n\n🏦 Banco: ${cb.banco}\nTitular: ${cb.titular}\nCLABE: ${cb.clabe}\n\nEnvía tu comprobante aquí para asignarte horario con la terapeuta. 💙`,
    agendarNo: `Gracias por comunicarte con *Casa Gaviota*. Cuando estés lista, con gusto te ayudamos. 💙\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  // El Stand Up (intro, mínimos, datos) ahora vive en config/datos.js -> TEXTOS.standup

  empEco: {
    // La lista de cursos vive en config/datos.js -> TEXTOS.empEco.inicio
    pedirNombre: `Escribe tu *nombre completo*:`,
    pedirTelefono: `Gracias. 😊 Ahora escribe tu *número de teléfono* para que podamos contactarte:`,
    confirmacion: (nombre, programa) => `✅ ¡Gracias, ${nombre}!\n\nTu interés en *${programa}* fue registrado. El equipo responsable te compartirá información sobre las convocatorias vigentes; la disponibilidad depende del calendario institucional.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  servicios: {
    inicio: `🏛️ *Servicios del Centro*\n\n${DATOS.serviciosCentro.map((x) => '• ' + x).join('\n')}\n\nEscribe tu *nombre completo* para recibir información:`,
    pedirTelefono: `Gracias. 😊 Ahora escribe tu *número de teléfono* para que podamos contactarte:`,
    pedirInteres: `¿Qué servicio te interesa?`,
    confirmacion: (nombre) => `✅ ¡Gracias, ${nombre}!\n\nEn breve te contactaremos con fechas y costos.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  empresarial: {
    inicio: `🏢 *Servicios Empresariales*\n\nAcompañamos a empresas e instituciones con talleres y procesos de formación para construir *culturas de trabajo más humanas, seguras e inclusivas*. Trabajamos desde la Educación para la Paz, la noviolencia, los derechos humanos y el aprendizaje de personas adultas.\n\nTenemos *${DATOS.empresas.lineas.length} líneas temáticas* con más de 20 talleres. Y si buscas sensibilizar sobre el acoso callejero, también está el *${DATOS.standUp.nombreCompleto}* (sin costo), en la opción 4 del menú principal.\n\n¿Qué te gustaría hacer?\n\n1️⃣ Ver los temas de talleres\n2️⃣ Conocer las modalidades\n3️⃣ Solicitar una propuesta personalizada`,

    menu: `¿Qué te gustaría hacer?\n\n1️⃣ Ver los temas de talleres\n2️⃣ Conocer las modalidades\n3️⃣ Solicitar una propuesta personalizada`,

    lineas: () => {
      const num = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
      const lista = DATOS.empresas.lineas.map((l, i) => `${num[i + 1]} ${l.nombre}`).join('\n');
      return `📚 *Líneas temáticas*\n\n${lista}\n\nEscribe el *número* de una línea para ver sus talleres.\n9️⃣ Solicitar una propuesta personalizada\n0️⃣ Regresar`;
    },

    detalleLinea: (n) => {
      const l = DATOS.empresas.lineas[n - 1];
      const talleres = l.talleres.map((t) => `• *${t.nombre}*\n${t.objetivo}`).join('\n\n');
      return `📌 *${l.nombre}*\n\n${talleres}\n\nEscribe otro *número del 1 al ${DATOS.empresas.lineas.length}* para ver otra línea, *9* para solicitar una propuesta o *0* para regresar.`;
    },

    modalidades: () => {
      const m = DATOS.empresas.modalidades.map((x) => `*${x.letra}) ${x.nombre}*\n${x.detalle}`).join('\n\n');
      return `🧩 *Modalidades*\n\n${m}\n\nSe pueden configurar junto con el equipo de Recursos Humanos o Responsabilidad Social de tu empresa.`;
    },

    pedirEmpresa: `Con gusto armamos una propuesta para tu empresa 💙\n\nEscribe el *nombre de tu empresa u organización*:`,

    confirmacion: (empresa, nombrePersona, horario) => `✅ ¡Gracias, ${nombrePersona}!\n\nHemos registrado el interés de *${empresa}*. Una representante se pondrá en contacto contigo${horario ? ' en el horario que nos indicaste (' + horario + ')' : ' pronto'} para diseñar una propuesta personalizada.\n\nTambién puedes escribirnos a ${DATOS.empresas.contacto.correo} o llamar al ${DATOS.empresas.contacto.telefonos}.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  donativos: {
    inicio: `💛 *Donativos*\n\n1️⃣ Donativo económico\n2️⃣ Donativo en especie\n3️⃣ Voluntariado`,

    // Económico
    preguntarRecibo: `💛 ¡Gracias por querer apoyar!\n\n¿Requieres *recibo de donatario*?\n\n1️⃣ Sí\n2️⃣ No`,
    pedirNombre: `Escribe tu *nombre completo*:`,
    pedirCantidad: `¿Qué *cantidad* estimada te gustaría donar?`,
    economico: `🏦 *Datos bancarios:*\nBanco: ${cb.banco}\nTitular: ${cb.titular}\nCLABE: ${cb.clabe}\n\nEnvía tu comprobante aquí. ¡Gracias! 💛`,
    reciboPedirDatos: `Para donativos con recibo de donatario, el equipo de Casa Gaviota te indicará el procedimiento correspondiente.\n\nEscribe tu *nombre completo* y un *teléfono o correo* para que te contacten:`,
    reciboConfirmacion: `✅ ¡Gracias! El equipo de Casa Gaviota se pondrá en contacto contigo para indicarte el procedimiento para tu recibo de donatario. 💛\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,

    // En especie
    especie: `📦 *Donativo en especie (ropa)*\n\n¡Gracias por querer donar! 💛 Ten en cuenta:\n\n✅ La ropa debe estar en *buenas condiciones* y *lavada*.\n🚫 No recibimos *ropa interior*, *trajes de baño* ni *calcetines*.\n💛 Dona *desde la dignidad*: entrega solo lo que tú usarías o regalarías con gusto a alguien que quieres.\n\n📸 Para darle seguimiento, envía una *fotografía* de la ropa que vas a donar a estos correos:\n${DATOS.donativosEspecie.correos.map((c) => '• ' + c).join('\n')}\n\nAquí cuéntame *qué prendas* quieres donar y una *cantidad aproximada*:`,
    especiePedirTelefono: `¿Cuál es tu número de teléfono? (10 dígitos)`,
    especiePedirCorreo: `¿Cuál es tu *correo electrónico*?`,
    especieConfirmacion: `✅ ¡Gracias! Registramos tu donativo en especie. 💛\n\nRecuerda enviar la *foto de tu ropa* a:\n${DATOS.donativosEspecie.correos.map((c) => '• ' + c).join('\n')}\n\nEl equipo de Casa Gaviota le dará seguimiento y te confirmará la recepción.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,

    // Voluntariado
    voluntariado: `🙋 Escribe tu *nombre completo y teléfono*:`,
    confirmVoluntariado: (nombre) => `✅ ¡Gracias, ${nombre}! Nos pondremos en contacto pronto. 💛\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  rrhh: {
    inicio: `👩‍💼 *Recursos Humanos*\n\n1️⃣ Postulación para vacante\n2️⃣ Servicio social o prácticas profesionales\n3️⃣ Voluntariado\n4️⃣ Consultar vacantes disponibles\n\n${DATOS.rrhh.formularioMensaje}\n${DATOS.rrhh.formularioUrl}`,
    vacante: `📝 Escribe tu *nombre completo y el puesto de interés*:`,
    servicio: `🎓 Escribe tu *nombre, institución educativa y carrera*:`,
    voluntariado: `🙋 Escribe tu *nombre completo y teléfono*:`,
    vacantes: DATOS.vacantes.length
      ? `📋 *Vacantes actuales:*\n${DATOS.vacantes.map((v) => '• ' + v).join('\n')}\n\nEscribe tu nombre y puesto de interés para postularte.`
      : `📋 Por el momento no tenemos vacantes abiertas. Si quieres dejar tus datos para futuras oportunidades, escribe tu *nombre y el puesto de interés*.`,
    pedirCorreo: `Perfecto. Escribe también tu *correo electrónico*, ahí te llegará la confirmación de tu registro:`,
    pedirTelefono: `Gracias. 😊 Ahora escribe tu *número de teléfono* para que podamos contactarte:`,
    confirmacion: (nombre) => `✅ ¡Gracias, ${nombre}!\n\nEl equipo correspondiente dará seguimiento a tu solicitud. Esto no garantiza una vacante ni su aceptación.\n\n${DATOS.rrhh.formularioMensaje}\n${DATOS.rrhh.formularioUrl}\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú`,
  },

  noEntiendo: `Disculpa, no logré entender tu respuesta. 💙 ¿Me ayudas escribiendo el *número* de la opción que prefieres?`,
};
}

const MESSAGES = construirMensajes();

// Reconstruye los textos en el mismo objeto (los flujos siguen usando la misma referencia)
function reconstruirMensajes() {
  Object.assign(MESSAGES, construirMensajes());
}

module.exports = { MESSAGES, reconstruirMensajes };