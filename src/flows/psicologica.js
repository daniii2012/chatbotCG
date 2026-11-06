const { MESSAGES: M } = require('../config/messages');
const { updateSession } = require('../db/sessions');
const { runQuestionnaire } = require('./questionnaireEngine');
const { SOCIOECONOMICO_PREGUNTAS, EMPODERAMIENTO_PREGUNTAS } = require('../config/questionnaires');
const { appendEmpoderamientoRecord } = require('../db/excel');
const { esCorreoValido, esTelefonoValido, validarNombreCompleto, validarFechaNacimiento, esComprobante } = require('../utils/validators');
const { alertarComprobante } = require('../utils/alertaPago');
const { agradecerMotivo } = require('../utils/calidez');

async function handlePsico(session, userMessage, media) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    case 'psico_motivo':
      data.motivoConsulta = userMessage;
      nextStep = 'psico_nombre';
      response = agradecerMotivo(userMessage) + '\n\n' + M.psico.pedirNombre;
      break;

    case 'psico_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.psico.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      data.modalidad = 'En línea'; // La atención psicológica es solo en línea
      nextStep = 'psico_telefono';
      response = M.psico.pedirTelefono;
      break;
    }

    case 'psico_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.psico.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'psico_correo';
      response = M.psico.pedirCorreo;
      break;

    case 'psico_correo':
      if (!esCorreoValido(userMessage)) {
        response = 'Parece que ese correo no está completo 😊 Revisa que tenga el formato ejemplo@dominio.com, por favor.\n\n' + M.psico.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      nextStep = 'psico_residencia';
      response = M.psico.pedirResidencia;
      break;

    case 'psico_residencia':
      data.residencia = userMessage;
      nextStep = 'psico_fechaNacimiento';
      response = M.psico.pedirFechaNacimiento;
      break;

    case 'psico_fechaNacimiento': {
      const r = validarFechaNacimiento(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.psico.pedirFechaNacimiento;
        break;
      }
      data.fechaNacimiento = r.fecha;
      data.edad = r.edad; // se calcula sola, para no perder la columna Edad del Excel
      nextStep = 'psico_cuota';
      response = M.psico.preguntarCuota(data.nombre);
      break;
    }

    case 'psico_cuota':
      if (userMessage === '1') {
        nextStep = 'psico_cuenta_enviada';
        response = M.psico.enviarCuenta;
      } else if (userMessage === '2') {
        nextStep = 'psico_socioeconomico';
        const primera = runQuestionnaire(session, null, SOCIOECONOMICO_PREGUNTAS, 'socioIndex');
        response = M.socioeconomicoIntro + '\n\n' + primera.response;
      } else {
        response = M.noEntiendo + '\n\n' + M.psico.preguntarCuota(data.nombre);
      }
      break;

    case 'psico_cuenta_enviada':
      if (esComprobante(userMessage, media)) {
        await alertarComprobante(session, 'psico', media); // avisa al equipo para revisión manual
        nextStep = 'psico_empoderamiento';
        const primera = runQuestionnaire(session, null, EMPODERAMIENTO_PREGUNTAS, 'empIndex');
        response = M.comprobanteRecibido + '\n\n' + M.empoderamientoIntro + '\n\n' + primera.response;
      } else {
        response = M.recordarComprobante;
      }
      break;

    case 'psico_socioeconomico': {
      const resultado = runQuestionnaire(session, userMessage, SOCIOECONOMICO_PREGUNTAS, 'socioIndex');
      if (resultado.finished) {
        nextStep = 'psico_valoracion';
        response = M.psico.valoracionCuota;
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'psico_valoracion':
      if (userMessage === '1') {
        nextStep = 'psico_fin';
        response = M.psico.circulosInfo(data.nombre);
      } else if (userMessage === '2') {
        nextStep = 'psico_fin';
        response = M.psico.soloValoracion;
      } else {
        response = M.noEntiendo + '\n\n' + M.psico.valoracionCuota;
      }
      break;

    case 'psico_empoderamiento': {
      const resultado = runQuestionnaire(session, userMessage, EMPODERAMIENTO_PREGUNTAS, 'empIndex');
      if (resultado.finished) {
        await appendEmpoderamientoRecord(session);
        nextStep = 'psico_fin';
        response = M.psico.asignacion;
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'psico_fin':
      nextStep = 'menu';
      response = M.bienvenida;
      break;

    default:
      nextStep = 'menu';
      response = M.bienvenida;
  }

  updateSession(session.userId, { step: nextStep, data });
  return response;
}

module.exports = { handlePsico };