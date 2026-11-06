const { MESSAGES: M } = require('../config/messages');
const { DATOS, TEXTOS } = require('../config/datos');
const { updateSession } = require('../db/sessions');
const { runQuestionnaire } = require('./questionnaireEngine');
const { EMPRESARIAL_PREGUNTAS } = require('../config/questionnaires');
const { esCorreoValido, esTelefonoValido, validarNombreCompleto, validarFechaNacimiento, esComprobante } = require('../utils/validators');
const { alertarComprobante, avisarDonativoEspecie } = require('../utils/alertaPago');
const { appendRecord } = require('../db/excel');


const T = TEXTOS;

// ─── BIODECODIFICACIÓN ────────────────────────────────────────────────────────
async function handleBio(session, userMessage, media) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'bio_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.bio.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'bio_telefono';
      response = M.bio.pedirTelefono;
      break;
    }

    case 'bio_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.bio.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'bio_correo';
      response = M.bio.pedirCorreo;
      break;

    case 'bio_correo':
      if (!esCorreoValido(userMessage)) {
        response = 'Parece que ese correo no está completo 😊 Revísalo, por favor.\n\n' + M.bio.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      nextStep = 'bio_residencia';
      response = M.bio.pedirResidencia;
      break;

    case 'bio_residencia':
      data.residencia = userMessage;
      nextStep = 'bio_fechaNacimiento';
      response = M.bio.pedirFechaNacimiento;
      break;

    case 'bio_fechaNacimiento': {
      const r = validarFechaNacimiento(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.bio.pedirFechaNacimiento;
        break;
      }
      data.fechaNacimiento = r.fecha;
      data.edad = r.edad;
      nextStep = 'bio_agendar';
      response = M.bio.preguntarAgendar(data.nombre);
      break;
    }

    case 'bio_agendar':
      if (userMessage === '1') { nextStep = 'bio_comprobante'; response = M.bio.agendarSi; }
      else if (userMessage === '2') { nextStep = 'bio_fin'; response = M.bio.agendarNo; }
      else { response = M.noEntiendo + '\n\n' + M.bio.preguntarAgendar(data.nombre); }
      break;

    case 'bio_comprobante':
      if (esComprobante(userMessage, media)) {
        await alertarComprobante(session, 'bio', media);
        nextStep = 'bio_fin';
        response = M.comprobanteRecibido + '\n\nEn breve te contactamos para asignarte horario con la terapeuta.\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú';
      } else {
        response = M.recordarComprobante;
      }
      break;

    case 'bio_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── TALLER DE STAND UP CONTRA EL ACOSO CALLEJERO ─────────────────────────────
async function handleStandup(session, userMessage) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'standup_modalidad':
      if (userMessage === '1' || userMessage === '2') {
        data.modalidad = userMessage === '1' ? 'Presencial' : 'En línea';
        nextStep = 'standup_asistentes';
        response = T.standup.pedirAsistentes;
      } else {
        response = M.noEntiendo + '\n\n' + T.standup.intro;
      }
      break;

    case 'standup_asistentes': {
      const m = userMessage.match(/\d+/);
      if (!m) {
        response = T.standup.errorAsistentes + '\n\n' + T.standup.pedirAsistentes;
        break;
      }
      const n = parseInt(m[0], 10);
      const min = data.modalidad === 'Presencial' ? DATOS.standUp.minimoPresencial : DATOS.standUp.minimoEnLinea;
      data.asistentes = n;

      if (n < min) {
        nextStep = 'menu';
        response = T.standup.noCumpleMinimo(data.modalidad, min, n) + '\n\n' + M.bienvenida;
      } else {
        nextStep = 'standup_nombre';
        response = T.standup.pedirNombre;
      }
      break;
    }

    case 'standup_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + T.standup.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'standup_telefono';
      response = T.standup.pedirTelefono;
      break;
    }

    case 'standup_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + T.standup.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'standup_correo';
      response = T.standup.pedirCorreo;
      break;

    case 'standup_correo':
      if (!esCorreoValido(userMessage)) {
        response = 'Parece que ese correo no está completo 😊 Revisa que tenga el formato ejemplo@dominio.com, por favor.\n\n' + T.standup.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      nextStep = 'standup_institucion';
      response = T.standup.pedirInstitucion;
      break;

    case 'standup_institucion':
      data.institucion = userMessage;
      nextStep = 'standup_cargo';
      response = T.standup.pedirCargo;
      break;

    case 'standup_cargo':
      data.cargo = userMessage;
      data.datosGrupo = `${data.institucion} | ${data.cargo} | ${data.modalidad} | ${data.asistentes} asistentes`;
      nextStep = 'standup_fin';
      response = T.standup.confirmacion(data.nombre);
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
      if (T.empEco.programas[userMessage]) {
        data.programa = T.empEco.programas[userMessage];
        nextStep = 'empeco_nombre';
        response = M.empEco.pedirNombre;
      } else {
        response = M.noEntiendo + '\n\n' + T.empEco.inicio;
      }
      break;

    case 'empeco_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.empEco.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'empeco_telefono';
      response = M.empEco.pedirTelefono;
      break;
    }

    case 'empeco_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.empEco.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'empeco_fin';
      response = M.empEco.confirmacion(data.nombre, data.programa);
      break;

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
    case 'servicios_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.servicios.inicio;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'servicios_telefono';
      response = M.servicios.pedirTelefono;
      break;
    }

    case 'servicios_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.servicios.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'servicios_interes';
      response = M.servicios.pedirInteres;
      break;

    case 'servicios_interes':
      data.interes = userMessage;
      nextStep = 'servicios_fin';
      response = M.servicios.confirmacion(data.nombre);
      break;

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
    case 'empresarial_menu':
      if (userMessage === '1') { nextStep = 'empresarial_lineas'; response = M.empresarial.lineas(); }
      else if (userMessage === '2') { response = M.empresarial.modalidades() + '\n\n' + M.empresarial.menu; }
      else if (userMessage === '3') { nextStep = 'empresarial_empresa'; response = M.empresarial.pedirEmpresa; }
      else { response = M.noEntiendo + '\n\n' + M.empresarial.menu; }
      break;

    case 'empresarial_lineas': {
      const totalLineas = DATOS.empresas.lineas.length;
      const n = /^\d$/.test(userMessage) ? Number(userMessage) : NaN;
      if (n === 9) { nextStep = 'empresarial_empresa'; response = M.empresarial.pedirEmpresa; }
      else if (n === 0) { nextStep = 'empresarial_menu'; response = M.empresarial.menu; }
      else if (n >= 1 && n <= totalLineas) {
        const vistas = new Set(data.lineasConsultadas ? data.lineasConsultadas.split(', ') : []);
        vistas.add(DATOS.empresas.lineas[n - 1].nombre);
        data.lineasConsultadas = [...vistas].join(', ');
        response = M.empresarial.detalleLinea(n);
      } else { response = M.noEntiendo + '\n\n' + M.empresarial.lineas(); }
      break;
    }

    case 'empresarial_empresa':
      data.empresa = userMessage;
      nextStep = 'empresarial_cuestionario';
      {
        const primera = runQuestionnaire(session, null, EMPRESARIAL_PREGUNTAS, 'empresarialIndex');
        response = primera.response;
      }
      break;

    case 'empresarial_cuestionario': {
      const resultado = runQuestionnaire(session, userMessage, EMPRESARIAL_PREGUNTAS, 'empresarialIndex');
      if (resultado.finished) {
        data.nombre = data.nombrePersona;
        data.telefono = data.celular;
        const modal = DATOS.empresas.modalidades.find((x) => x.letra.toLowerCase() === String(data.modalidadFormacion || '').trim().toLowerCase().replace(/[).]/g, ''));
        if (modal) data.modalidadFormacion = `${modal.letra}) ${modal.nombre}`;

        nextStep = 'empresarial_fin';
        response = M.empresarial.confirmacion(data.empresa, data.nombrePersona, data.horarioAtencion);
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'empresarial_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

// ─── DONATIVOS ────────────────────────────────────────────────────────────────
async function handleDonativos(session, userMessage, media) {
  const { step, data } = session;
  let response = '', nextStep = step;

  switch (step) {
    case 'donativos_tipo':
      if (userMessage === '1') { data.tipoDonativo = 'Económico'; nextStep = 'donativos_recibo'; response = M.donativos.preguntarRecibo; }
      else if (userMessage === '2') { data.tipoDonativo = 'En especie (ropa)'; nextStep = 'donativos_especie'; response = M.donativos.especie; }
      else if (userMessage === '3') { data.tipoDonativo = 'Voluntariado'; nextStep = 'donativos_voluntariado'; response = M.donativos.voluntariado; }
      else { response = M.noEntiendo + '\n\n' + M.donativos.inicio; }
      break;

    case 'donativos_recibo':
      if (userMessage === '1') { data.requiereRecibo = 'Sí'; nextStep = 'donativos_recibo_datos'; response = M.donativos.reciboPedirDatos; }
      else if (userMessage === '2') { data.requiereRecibo = 'No'; nextStep = 'donativos_nombre'; response = M.donativos.pedirNombre; }
      else { response = M.noEntiendo + '\n\n' + M.donativos.preguntarRecibo; }
      break;

    case 'donativos_recibo_datos':
      data.contacto = userMessage;
      nextStep = 'donativos_fin';
      response = M.donativos.reciboConfirmacion;
      break;

    case 'donativos_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.donativos.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'donativos_cantidad';
      response = M.donativos.pedirCantidad;
      break;
    }

    case 'donativos_cantidad':
      data.cantidadEstimada = userMessage;
      nextStep = 'donativos_comprobante';
      response = M.donativos.economico;
      break;

    case 'donativos_comprobante':
      if (esComprobante(userMessage, media)) {
        await alertarComprobante(session, 'donativos', media);
        nextStep = 'donativos_fin';
        response = '✅ ¡Muchas gracias por tu donativo! Recibimos tu comprobante y el equipo lo revisará. 💛\n\n¿Deseas regresar al menú principal?\n1️⃣ Sí, regresar al menú';
      } else {
        response = M.recordarComprobante;
      }
      break;

    case 'donativos_especie':
      data.detalleEspecie = userMessage;
      nextStep = 'donativos_especie_nombre';
      response = M.donativos.pedirNombre;
      break;

    case 'donativos_especie_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.donativos.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'donativos_especie_telefono';
      response = M.donativos.especiePedirTelefono;
      break;
    }

    case 'donativos_especie_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.donativos.especiePedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'donativos_especie_correo';
      response = M.donativos.especiePedirCorreo;
      break;

    case 'donativos_especie_correo':
      if (!esCorreoValido(userMessage)) {
        response = 'Parece que ese correo no está completo 😊 Revísalo, por favor.\n\n' + M.donativos.especiePedirCorreo;
        break;
      }
      data.correo = userMessage;
      await avisarDonativoEspecie(session);
      nextStep = 'donativos_fin';
      response = M.donativos.especieConfirmacion;
      break;

    case 'donativos_voluntariado':
      data.contacto = userMessage;
      nextStep = 'donativos_fin';
      response = M.donativos.confirmVoluntariado(userMessage.split(' ')[0]);
      break;

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

    case 'rrhh_dato':
      data.info = userMessage;
      nextStep = 'rrhh_correo';
      response = M.rrhh.pedirCorreo;
      break;

    case 'rrhh_correo':
      if (!esCorreoValido(userMessage)) {
        response = 'Parece que ese correo no está completo 😊 Revísalo, por favor.\n\n' + M.rrhh.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      if (data.tipo === 'voluntariado') {
        nextStep = 'rrhh_fin';
        response = M.rrhh.confirmacion(data.info?.split(' ')[0] || 'candidata');
      } else {
        nextStep = 'rrhh_telefono';
        response = M.rrhh.pedirTelefono;
      }
      break;

    case 'rrhh_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.rrhh.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'rrhh_fin';
      response = M.rrhh.confirmacion(data.info?.split(' ')[0] || 'candidata');
      break;

    case 'rrhh_fin': nextStep = 'menu'; response = M.bienvenida; break;
    default: nextStep = 'menu'; response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

module.exports = { handleBio, handleStandup, handleEmpEco, handleServicios, handleEmpresarial, handleDonativos, handleRRHH };