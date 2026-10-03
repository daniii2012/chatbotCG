const { MESSAGES: M } = require('../config/messages');
const { sendNotificationEmail } = require('../senders/email');
const { getNewRegisterTemplate } = require('../utils/emailTemplates/newRegister');

const { getSession, updateSession } = require('../db/sessions');

const { appendRecord } = require('../db/excel');
const { saveBotRecord } = require('../db/mongo');

const { handlePsico } = require('./psicologica');
const { handleLegal } = require('./legal');
const { handleBio, handleStandup, handleEmpEco, handleServicios, handleEmpresarial, handleDonativos, handleRRHH } = require('./otrosFlujos');

const COMANDOS_CANCELAR = ['cancelar', 'salir', 'menu', 'menú', 'regresar', 'volver'];

// -- Validar si es una situación de riesgo
const { esRiesgoInmediato } = require('../utils/validators');
const { llamarGroq } = require('../senders/groq');

// Mensaje predeterminado directo
const RESPUESTA_CRISIS_PREDETERMINADA = 
  "Si estás en peligro inmediato o necesitas auxilio urgente, por favor comunícate a la línea de emergencia 911 o a la Línea Mujeres. No estás sola.";

/**
 * Función auxiliar para manejar el protocolo de crisis local o por GPT
 */
async function activarProtocoloCrisis(session) {
  updateSession(session.userId, {
    flow: null,
    step: 'menu',
    data: session.data, // conserva lo que ya haya llenado, si aplica
  });

  // Log interno
  try {
    await saveBotRecord('crisis_activada', { timestamp: new Date().toISOString() }, session.userId);
  } catch (err) {
    console.error('[ERROR] No se pudo registrar evento de crisis:', err.message);
  }
}

// Primer step de cada flujo al seleccionar del menú
const MENU_MAP = {
  '1': { flow: 'psico', step: 'psico_nombre', msg: M.psico.pedirNombre, servicio: 'Atención psicológica', keywords: ['psicológ', 'psicologa', 'terapia'] },
  '2': { flow: 'legal', step: 'legal_nombre', msg: M.legal.pedirNombre, servicio: 'Asesoría legal', keywords: ['legal', 'abogad', 'jurídic'] },
  '3': { flow: 'bio', step: 'bio_nombre', msg: M.bio.pedirNombre, servicio: 'Biodescodificación biológica', keywords: ['biodescodificaci', 'biodecodificaci', 'biodesc'] },
  '4': { flow: 'standup', step: 'standup_grupo', msg: M.standup.intro, servicio: 'Stand Up', keywords: ['stand up', 'standup'] },
  '5': { flow: 'empeco', step: 'empeco_programa', msg: M.empEco.inicio, servicio: 'Empoderamiento económico', keywords: ['empoderamiento económico', 'empoderamiento economico'] },
  '6': { flow: 'servicios', step: 'servicios_nombre', msg: M.servicios.inicio, servicio: 'Servicios del centro', keywords: ['servicios del centro'] },
  '7': { flow: 'empresarial', step: 'empresarial_empresa', msg: M.empresarial.inicio, servicio: 'Servicios empresariales', keywords: ['servicios empresariales', 'empresa'] },
  '8': { flow: 'donativos', step: 'donativos_tipo', msg: M.donativos.inicio, servicio: 'Donativos', keywords: ['donativ', 'donar'] },
  '9': { flow: 'rrhh', step: 'rrhh_opcion', msg: M.rrhh.inicio, servicio: 'Recursos Humanos', keywords: ['recursos humanos', 'rrhh'] },
};

// Frases que indican que la usuaria quiere INICIAR el servicio, no solo preguntar sobre él
const VERBOS_SELECCION = /^(quiero|dame|necesito|inscr[ií]beme|empezar con|iniciar)\b/i;
const PALABRAS_PREGUNTA = /saber|informaci[oó]n|duda|c[oó]mo funciona|qu[eé] es|en qu[eé] consiste/i;

function detectarSeleccionPorTexto(texto) {
  const lower = texto.toLowerCase().trim();

  if (!VERBOS_SELECCION.test(lower)) return null;
  if (PALABRAS_PREGUNTA.test(lower)) return null; // "quiero saber sobre X" no cuenta como selección

  for (const [num, o] of Object.entries(MENU_MAP)) {
    if (o.keywords.some(k => lower.includes(k))) return num;
  }
  return null;
}

async function dispatchFlow(session, userMessage) {
  const flow = session.flow;
  const stepBefore = session.step;

  let response;
  switch (flow) {
    case 'psico': response = await handlePsico(session, userMessage); break;
    case 'legal': response = await handleLegal(session, userMessage); break;
    case 'bio': response = await handleBio(session, userMessage); break;
    case 'standup': response = await handleStandup(session, userMessage); break;
    case 'empeco': response = await handleEmpEco(session, userMessage); break;
    case 'servicios': response = await handleServicios(session, userMessage); break;
    case 'empresarial': response = await handleEmpresarial(session, userMessage); break;
    case 'donativos': response = await handleDonativos(session, userMessage); break;
    case 'rrhh': response = await handleRRHH(session, userMessage); break;
    default: return M.bienvenida;
  }

  const stepAfter = session.step;
  const recienLlegoAFin = stepAfter && (stepAfter.endsWith('_fin') || stepAfter === 'fin') && stepBefore !== stepAfter;

  if (recienLlegoAFin) {
    console.log('[INFO] Fin de flujo detectado. Iniciando guardado y envio...');

    try {
      await appendRecord(flow, session.data, session.userId);
    } catch(err) {
      console.error('[ERROR] Guardado en Excel:', err.message);
    }

    try {
      await saveBotRecord(flow, session.data, session.userId);
    } catch (err) {
      console.error('[ERROR] Guardado en Mongo:', err.message);
    }

    if (session.data.correo) {
      console.log('[INFO] Intentando enviar correo a:', session.data.correo);
      try {
        let htmlBody = `<p>Hola ${session.data.nombre || ''}, tu solicitud para ${session.data.servicioSolicita || flow} ha sido recibida con exito.</p>`;
        
        try {
          htmlBody = getNewRegisterTemplate(flow, session);
        } catch (templateErr) {
          console.error('[WARN] Error en plantilla HTML, usando respaldo:', templateErr.message);
        }

        await sendNotificationEmail(
          session.data.correo, 
          `[Casa Gaviota] Confirmacion de tu solicitud: ${session.data.servicioSolicita || flow}`,
          htmlBody
        );
      } catch (emailErr) {
        console.error('[ERROR] Proceso de envio de correo:', emailErr.message);
      }
    } else {
      console.log('[WARN] Correo vacio en session.data.correo');
    }
  }

  return response;
}

const OPCIONES_MENU = Object.entries(MENU_MAP).map(
  ([num, o]) => `${num}. ${o.servicio}`
);

async function processMessage(userId, userMessage) {
  const session = getSession(userId);
  const trimmed = userMessage.trim();

  // 1. PRIMER PASO: Filtro local de crisis (Ahorro de tokens y respuesta inmediata)
  if (esRiesgoInmediato(trimmed)) {
    await activarProtocoloCrisis(session);
    return `${RESPUESTA_CRISIS_PREDETERMINADA}\n\n${M.bienvenida}`;
  }

  // 2. Comando global de cancelar, disponible en cualquier punto del flujo
  if (session.flow && COMANDOS_CANCELAR.includes(trimmed.toLowerCase())) {
    updateSession(userId, { flow: null, step: 'menu', data: {} });
    return `Sin problema, volvamos al inicio.\n\n${M.bienvenida}`;
  }

  // 3. Si la usuaria está en el menú raíz o no tiene flujo definido
  if (!session.flow || session.step === 'menu') {
    const option = MENU_MAP[trimmed] || MENU_MAP[detectarSeleccionPorTexto(trimmed)];

    if (option) {
      updateSession(userId, {
        flow: option.flow,
        step: option.step,
        data: { servicioSolicita: option.servicio },
      });
      return option.msg;
    }

    // Si el mensaje menciona una opción (por número o por nombre), recuérdala para más adelante
    const opcionMencionada = detectarOpcionMencionada(trimmed);
    if (opcionMencionada) {
      updateSession(userId, {
        data: { ...session.data, ultimaOpcionMencionada: opcionMencionada },
      });
    }

    // Si pregunta "cómo iniciar" y ya sabemos de qué opción hablaba, entra directo al flujo
    const FRASES_INICIO = /^(c[oó]mo (iniciar|empezar|inscribirme|registrarme|me registro)|quiero (iniciar|empezar|inscribirme|registrarme)|inscr[ií]beme|reg[ií]strame|registrarme)\b/i;
    if (FRASES_INICIO.test(trimmed) && session.data?.ultimaOpcionMencionada) {
      const opcionGuardada = MENU_MAP[session.data.ultimaOpcionMencionada];
      updateSession(userId, {
        flow: opcionGuardada.flow,
        step: opcionGuardada.step,
        data: { servicioSolicita: opcionGuardada.servicio },
      });
      return opcionGuardada.msg;
    }

    // Si la opción no fue un número del 1 al 9 ni una selección clara, usamos Groq para responder
    const yaMostroMenu = session.data?.menuMostrado || false;
    const respuestaGPT = await llamarGroq(trimmed, OPCIONES_MENU, yaMostroMenu);

    if (!yaMostroMenu) {
      updateSession(userId, { data: { ...session.data, menuMostrado: true } });
    }

    if (respuestaGPT.includes('ESCALAR_CRISIS')) {
      await activarProtocoloCrisis(session);
      return `${RESPUESTA_CRISIS_PREDETERMINADA}\n\n${M.bienvenida}`;
    }

    return respuestaGPT;
  }

  // 4. Si la usuaria ya está dentro de un flujo activo (ej. respondiendo preguntas del formulario)
  return dispatchFlow(session, trimmed);
}

function detectarOpcionMencionada(texto) {
  const lower = texto.toLowerCase();

  // 1. Intenta por número suelto (ej. "es la 3", "opción 3")
  const matchNumero = lower.match(/\b([1-9])\b/);
  if (matchNumero && MENU_MAP[matchNumero[1]]) {
    return matchNumero[1];
  }

  // 2. Intenta por nombre del servicio, usando las mismas keywords de MENU_MAP
  for (const [num, o] of Object.entries(MENU_MAP)) {
    if (o.keywords.some(k => lower.includes(k))) {
      return num;
    }
  }

  return null;
}
module.exports = { processMessage };