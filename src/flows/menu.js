const { MESSAGES: M } = require('../config/messages');
const { DATOS, TEXTOS, mensajeFormulario } = require('../config/datos');
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
const { llamarGroq, detectarEmergencia, mensajeEmergencia } = require('../senders/groq');

/**
 * Función auxiliar para manejar el protocolo de crisis local o por IA
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
  '1': { flow: 'psico', step: 'psico_motivo', get msg() { return M.psico.pedirMotivo; }, get servicio() { return 'Atención psicológica'; }, keywords: ['psicológ', 'psicologa', 'terapia'] },
  '2': { flow: 'legal', step: 'legal_nombre', get msg() { return M.legal.pedirNombre; }, get servicio() { return 'Asesoría legal'; }, keywords: ['legal', 'abogad', 'jurídic'] },
  '3': { flow: 'bio', step: 'bio_nombre', get msg() { return M.bio.pedirNombre; }, get servicio() { return 'Biodescodificación biológica'; }, keywords: ['biodescodificaci', 'biodecodificaci', 'biodesc'] },
  '4': { flow: 'standup', step: 'standup_modalidad', get msg() { return TEXTOS.standup.intro; }, get servicio() { return DATOS.standUp.nombreCompleto; }, keywords: ['stand up', 'standup', 'acoso callejero'] },
  '5': { flow: 'empeco', step: 'empeco_programa', get msg() { return TEXTOS.empEco.inicio; }, get servicio() { return 'Empoderamiento económico'; }, keywords: ['empoderamiento económico', 'empoderamiento economico'] },
  '6': { flow: 'servicios', step: 'servicios_nombre', get msg() { return M.servicios.inicio; }, get servicio() { return 'Servicios del centro'; }, keywords: ['servicios del centro'] },
  '7': { flow: 'empresarial', step: 'empresarial_menu', get msg() { return M.empresarial.inicio; }, get servicio() { return 'Servicios empresariales'; }, keywords: ['servicios empresariales', 'empresa'] },
  '8': { flow: 'donativos', step: 'donativos_tipo', get msg() { return M.donativos.inicio; }, get servicio() { return 'Donativos'; }, keywords: ['donativ', 'donar'] },
  '9': { flow: 'rrhh', step: 'rrhh_opcion', get msg() { return M.rrhh.inicio; }, get servicio() { return 'Recursos Humanos'; }, keywords: ['recursos humanos', 'rrhh'] },
};

// Frases que indican que la usuaria quiere INICIAR el servicio, no solo preguntar sobre él
const VERBOS_SELECCION = /^(quiero|dame|necesito|inscr[ií]beme|empezar con|iniciar)\b/i;
const PALABRAS_PREGUNTA = /saber|informaci[oó]n|duda|c[oó]mo funciona|qu[eé] es|en qu[eé] consiste/i;

// Quita acentos y pasa a minúsculas ("Psicológica" -> "psicologica"),
// para que "atencion psicologica" y "atención psicológica" se reconozcan igual.
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function detectarSeleccionPorTexto(texto) {
  const lower = norm(texto);

  if (!VERBOS_SELECCION.test(lower)) return null;
  if (PALABRAS_PREGUNTA.test(lower)) return null; // "quiero saber sobre X" no cuenta como selección

  for (const [num, o] of Object.entries(MENU_MAP)) {
    if (o.keywords.some(k => lower.includes(norm(k)))) return num;
  }
  return null;
}

async function dispatchFlow(session, userMessage, media) {
  const flow = session.flow;
  const stepBefore = session.step;

  let response;
  switch (flow) {
    case 'psico': response = await handlePsico(session, userMessage, media); break;
    case 'legal': response = await handleLegal(session, userMessage, media); break;
    case 'bio': response = await handleBio(session, userMessage, media); break;
    case 'standup': response = await handleStandup(session, userMessage); break;
    case 'empeco': response = await handleEmpEco(session, userMessage); break;
    case 'servicios': response = await handleServicios(session, userMessage); break;
    case 'empresarial': response = await handleEmpresarial(session, userMessage); break;
    case 'donativos': response = await handleDonativos(session, userMessage, media); break;
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

    // Ya guardado todo: mandamos el link del formulario (Forms Assembly)
    if (DATOS.formulario.flujos.includes(flow)) {
      response = `${response}\n\n${mensajeFormulario()}`;
    }
  }

  return response;
}

const opcionesMenu = () => Object.entries(MENU_MAP).map(
  ([num, o]) => `${num}. ${o.servicio}`
);

async function processMessage(userId, userMessage, media = null) {
  const session = getSession(userId);
  const trimmed = userMessage.trim();
  const enFlujoActivo = Boolean(session.flow) && session.step !== 'menu';

  // 1. PRIMER PASO: Filtro local de crisis (Ahorro de tokens y respuesta inmediata)
  //    - esRiesgoInmediato: siempre (como estaba).
  //    - detectarEmergencia (lista de palabras de config/datos.js): solo fuera de un flujo,
  //      para no cortar el cuestionario cuando alguien describe su caso en legal/psico.
  if (esRiesgoInmediato(trimmed) || (!enFlujoActivo && detectarEmergencia(trimmed))) {
    await activarProtocoloCrisis(session);
    return mensajeEmergencia();
  }

  // 2. Comando global de cancelar, disponible en cualquier punto del flujo
  if (session.flow && COMANDOS_CANCELAR.includes(trimmed.toLowerCase())) {
    // menuMostrado: true porque M.bienvenida ya trae el menú
    updateSession(userId, { flow: null, step: 'menu', data: { menuMostrado: true } });
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
    // (se prueba sobre el texto sin acentos)
    const FRASES_INICIO = /^((si,?\s*)?(quiero\s+)?(iniciar|empezar|comenzar)|como (iniciar|empezar|comenzar|inscribirme|registrarme|me registro)|quiero (inscribirme|registrarme)|inscribeme|registrame|registrarme)\b/;
    if (FRASES_INICIO.test(norm(trimmed)) && session.data?.ultimaOpcionMencionada) {
      const opcionGuardada = MENU_MAP[session.data.ultimaOpcionMencionada];
      updateSession(userId, {
        flow: opcionGuardada.flow,
        step: opcionGuardada.step,
        data: { servicioSolicita: opcionGuardada.servicio },
      });
      return opcionGuardada.msg;
    }

    // ── PRIMER MENSAJE: saludo cálido, sin menú ──────────────────────────
    const esPrimerMensaje = !session.data?.saludoEnviado;
    const pideMenu = /\b(menu|opciones|servicios|que ofrecen|que hacen)\b/.test(norm(trimmed));
    if (esPrimerMensaje && !pideMenu) {
      const esSaludoOCorto = trimmed.split(/\s+/).length <= 4; // "hola", "buenas tardes", "f", "info"...
      updateSession(userId, { data: { ...session.data, saludoEnviado: true } });
      if (esSaludoOCorto) return M.saludoInicial;
      // Si ya cuenta algo concreto, Gavi responde a eso (con su presentación) y NO suelta el menú todavía
      return llamarGroq(trimmed, opcionesMenu(), true);
    }

    // Si la opción no fue un número del 1 al 9 ni una selección clara, usamos Groq para responder
    const yaMostroMenu = session.data?.menuMostrado || false;
    const respuestaGPT = await llamarGroq(trimmed, opcionesMenu(), yaMostroMenu);

    if (!yaMostroMenu) {
      updateSession(userId, { data: { ...session.data, menuMostrado: true } });
    }

    // La IA detectó riesgo: respondemos con el mensaje fijo (líneas editables en config/datos.js)
    if (respuestaGPT.includes('ESCALAR_CRISIS')) {
      await activarProtocoloCrisis(session);
      return mensajeEmergencia();
    }

    return respuestaGPT;
  }

  // 4. Si la usuaria ya está dentro de un flujo activo (ej. respondiendo preguntas del formulario)
  return dispatchFlow(session, trimmed, media);
}

function detectarOpcionMencionada(texto) {
  const lower = norm(texto);

  // 1. Número solo si viene como opción (ej. "es la 3", "opcion 3", "numero 3"),
  //    para no confundir "me pegó 3 veces" con la opción 3 del menú
  const matchNumero = lower.match(/\b(?:opcion|numero|num|la|el)\s+([1-9])\b/);
  if (matchNumero && MENU_MAP[matchNumero[1]]) {
    return matchNumero[1];
  }

  // 2. Intenta por nombre del servicio, usando las mismas keywords de MENU_MAP
  for (const [num, o] of Object.entries(MENU_MAP)) {
    if (o.keywords.some(k => lower.includes(norm(k)))) {
      return num;
    }
  }

  return null;
}
module.exports = { processMessage };