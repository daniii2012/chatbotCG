const { MESSAGES: M } = require('../config/messages');
const { updateSession } = require('../db/sessions');

const PROGRAMAS_EMPECO = { '1': 'Capacitación para el trabajo', '2': 'Belleza por un futuro', '3': 'Microemprendimiento', '4': 'Vinculación laboral' };

// ─── BIODECODIFICACIÓN ────────────────────────────────────────────────────────
async function handleBio(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'bio_nombre':     data.nombre = userMessage; nextStep = 'bio_telefono';   response = M.bio.pedirTelefono; break;
    case 'bio_telefono':   data.telefono = userMessage; nextStep = 'bio_correo';   response = M.bio.pedirCorreo; break;
    case 'bio_correo':     data.correo = userMessage; nextStep = 'bio_residencia'; response = M.bio.pedirResidencia; break;
    case 'bio_residencia': data.residencia = userMessage; nextStep = 'bio_edad';   response = M.bio.pedirEdad; break;
    case 'bio_edad':
      data.edad = userMessage;
      nextStep = 'bio_agendar';
      response = M.bio.preguntarAgendar(data.nombre);
      break;
    case 'bio_agendar':
      if (userMessage === '1') { nextStep = 'bio_fin'; response = M.bio.agendarSi; }
      else if (userMessage === '2') { nextStep = 'bio_fin'; response = M.bio.agendarNo; }
      else { response = M.noEntiendo + '\n\n' + M.bio.preguntarAgendar(data.nombre); }
      break;
    case 'bio_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── STANDUP ──────────────────────────────────────────────────────────────────
async function handleStandup(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'standup_grupo':
      if (userMessage === '1') { nextStep = 'standup_fin'; response = M.standup.menosCincuenta; }
      else if (userMessage === '2') { nextStep = 'standup_datos_grupo'; response = M.standup.masCincuenta; }
      else { response = M.noEntiendo + '\n\n' + M.standup.intro; }
      break;
    case 'standup_datos_grupo':
      data.datosGrupo = userMessage;
      nextStep = 'standup_fin';
      response = M.standup.masCincuentaConfirm;
      break;
    case 'standup_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── EMPODERAMIENTO ECONÓMICO ─────────────────────────────────────────────────
async function handleEmpEco(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'empeco_programa':
      if (PROGRAMAS_EMPECO[userMessage]) {
        data.programa = PROGRAMAS_EMPECO[userMessage];
        nextStep = 'empeco_nombre';
        response = M.empEco.pedirNombre;
      } else {
        response = M.noEntiendo + '\n\n' + M.empEco.inicio;
      }
      break;
    case 'empeco_nombre':   data.nombre = userMessage; nextStep = 'empeco_telefono'; response = M.empEco.pedirTelefono; break;
    case 'empeco_telefono': data.telefono = userMessage; nextStep = 'empeco_fin'; response = M.empEco.confirmacion(data.nombre, data.programa); break;
    case 'empeco_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── SERVICIOS DEL CENTRO ─────────────────────────────────────────────────────
async function handleServicios(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'servicios_nombre':   data.nombre = userMessage; nextStep = 'servicios_telefono'; response = M.servicios.pedirTelefono; break;
    case 'servicios_telefono': data.telefono = userMessage; nextStep = 'servicios_interes'; response = M.servicios.pedirInteres; break;
    case 'servicios_interes':  data.interes = userMessage; nextStep = 'servicios_fin'; response = M.servicios.confirmacion(data.nombre); break;
    case 'servicios_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── SERVICIOS EMPRESARIALES ──────────────────────────────────────────────────
async function handleEmpresarial(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'empresarial_empresa':  data.empresa = userMessage; nextStep = 'empresarial_contacto'; response = M.empresarial.pedirContacto; break;
    case 'empresarial_contacto': data.contacto = userMessage; nextStep = 'empresarial_fin'; response = M.empresarial.confirmacion(data.empresa); break;
    case 'empresarial_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── DONATIVOS ────────────────────────────────────────────────────────────────
async function handleDonativos(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'donativos_tipo':
      if (userMessage === '1') { nextStep = 'donativos_fin'; response = M.donativos.economico; }
      else if (userMessage === '2') { nextStep = 'donativos_fin'; response = M.donativos.especie; }
      else if (userMessage === '3') { nextStep = 'donativos_voluntariado'; response = M.donativos.voluntariado; }
      else { response = M.noEntiendo + '\n\n' + M.donativos.inicio; }
      break;
    case 'donativos_voluntariado': data.contacto = userMessage; nextStep = 'donativos_fin'; response = M.donativos.confirmVoluntariado(userMessage.split(' ')[0]); break;
    case 'donativos_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── RECURSOS HUMANOS ─────────────────────────────────────────────────────────
async function handleRRHH(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'rrhh_opcion':
      if (userMessage === '1') { nextStep = 'rrhh_dato'; data.tipo = 'vacante'; response = M.rrhh.vacante; }
      else if (userMessage === '2') { nextStep = 'rrhh_dato'; data.tipo = 'servicio'; response = M.rrhh.servicio; }
      else if (userMessage === '3') { nextStep = 'rrhh_dato'; data.tipo = 'voluntariado'; response = M.rrhh.voluntariado; }
      else if (userMessage === '4') { nextStep = 'rrhh_dato'; data.tipo = 'consulta'; response = M.rrhh.vacantes; }
      else { response = M.noEntiendo + '\n\n' + M.rrhh.inicio; }
      break;
    case 'rrhh_dato':   data.info = userMessage; nextStep = 'rrhh_correo'; response = M.rrhh.pedirCorreo; break;
    case 'rrhh_correo': data.correo = userMessage; nextStep = 'rrhh_fin'; response = M.rrhh.confirmacion(data.info?.split(' ')[0] || 'candidata'); break;
    case 'rrhh_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

module.exports = { handleBio, handleStandup, handleEmpEco, handleServicios, handleEmpresarial, handleDonativos, handleRRHH };
