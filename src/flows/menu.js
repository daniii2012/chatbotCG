const { MESSAGES: M } = require('../config/messages');
const { getSession, updateSession } = require('../db/sessions');
const { appendRecord } = require('../db/excel');
const { handlePsico } = require('./psicologica');
const { handleLegal } = require('./legal');
const { handleBio, handleStandup, handleEmpEco, handleServicios, handleEmpresarial, handleDonativos, handleRRHH } = require('./otrosFlujos');

// Primer step de cada flujo al seleccionar del menú
const MENU_MAP = {
  '1': { flow: 'psico', step: 'psico_nombre', msg: M.psico.pedirNombre, servicio: 'Atención psicológica' },
  '2': { flow: 'legal', step: 'legal_nombre', msg: M.legal.pedirNombre, servicio: 'Asesoría legal' },
  '3': { flow: 'bio', step: 'bio_nombre', msg: M.bio.pedirNombre, servicio: 'Biodescodificación biológica' },
  '4': { flow: 'standup', step: 'standup_grupo', msg: M.standup.intro, servicio: 'Stand Up' },
  '5': { flow: 'empeco', step: 'empeco_programa', msg: M.empEco.inicio, servicio: 'Empoderamiento económico' },
  '6': { flow: 'servicios', step: 'servicios_nombre', msg: M.servicios.inicio, servicio: 'Servicios del centro' },
  '7': { flow: 'empresarial', step: 'empresarial_empresa', msg: M.empresarial.inicio, servicio: 'Servicios empresariales' },
  '8': { flow: 'donativos', step: 'donativos_tipo', msg: M.donativos.inicio, servicio: 'Donativos' },
  '9': { flow: 'rrhh', step: 'rrhh_opcion', msg: M.rrhh.inicio, servicio: 'Recursos Humanos' },
};

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

  // El flujo acaba de llegar por primera vez a su paso "_fin" (ej. psico_fin,
  // legal_fin, donativos_fin...) → ahí ya tenemos todos los datos recopilados,
  // así que guardamos el registro en Excel. Si el paso YA estaba en "_fin"
  // antes de procesar este mensaje, significa que solo está regresando al
  // menú y no se debe duplicar el registro.
  const stepAfter = session.step;
  const recienLlegoAFin = stepAfter && stepAfter.endsWith('_fin') && stepBefore !== stepAfter;
  if (recienLlegoAFin) {
    await appendRecord(flow, session.data, session.userId);
  }

  return response;
}

async function processMessage(userId, userMessage) {
  const session = getSession(userId);
  const trimmed = userMessage.trim();

  if (!session.flow || session.step === 'menu') {
    const option = MENU_MAP[trimmed];
    if (option) {
      updateSession(userId, { flow: option.flow, step: option.step, data: { servicioSolicita: option.servicio } });
      return option.msg;
    }
    return M.bienvenida;
  }

  return dispatchFlow(session, trimmed);
}

module.exports = { processMessage };
