const { MESSAGES: M } = require('../config/messages');
const { updateSession } = require('../db/sessions');
const { runQuestionnaire } = require('./questionnaireEngine');
const { SOCIOECONOMICO_PREGUNTAS, LEGAL_FAMILIAR_PREGUNTAS } = require('../config/questionnaires');
const { esCorreoValido, esTelefonoValido, validarNombreCompleto, validarFechaNacimiento } = require('../utils/validators');
const { alertarComprobante } = require('../utils/alertaPago');

async function handleLegal(session, userMessage, media) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    case 'legal_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.legal.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      nextStep = 'legal_telefono';
      response = M.legal.pedirTelefono;
      break;
    }

    case 'legal_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = '⚠️ Ese teléfono no parece válido, debe tener 10 dígitos.\n\n' + M.legal.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'legal_correo';
      response = M.legal.pedirCorreo;
      break;

    case 'legal_correo':
      if (!esCorreoValido(userMessage)) {
        response = '⚠️ Ese correo no parece válido, revisa el formato (ejemplo@dominio.com).\n\n' + M.legal.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      nextStep = 'legal_residencia';
      response = M.legal.pedirResidencia;
      break;

        case 'legal_residencia':
      data.residencia = userMessage;
      nextStep = 'legal_fechaNacimiento';
      response = M.legal.pedirFechaNacimiento;
      break;

    case 'legal_fechaNacimiento': {
      const r = validarFechaNacimiento(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.legal.pedirFechaNacimiento;
        break;
      }
      data.fechaNacimiento = r.fecha;
      data.edad = r.edad; // se calcula sola, para no perder la columna Edad del Excel
      nextStep = 'legal_familiar';
      {
        const primera = runQuestionnaire(session, null, LEGAL_FAMILIAR_PREGUNTAS, 'legalIndex');
        response = M.legalFamiliarIntro + '\n\n' + primera.response;
      }
      break;
    }

    case 'legal_familiar': {
      const resultado = runQuestionnaire(session, userMessage, LEGAL_FAMILIAR_PREGUNTAS, 'legalIndex');
      if (resultado.finished) {
        nextStep = 'legal_cuota';
        response = M.legal.preguntarCuota(data.nombre);
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'legal_cuota':
      if (userMessage === '1') {
        nextStep = 'legal_cuenta_enviada';
        response = M.legal.enviarCuenta;
      } else if (userMessage === '2') {
        nextStep = 'legal_socioeconomico';
        const primera = runQuestionnaire(session, null, SOCIOECONOMICO_PREGUNTAS, 'socioIndex');
        response = M.socioeconomicoIntro + '\n\n' + primera.response;
      } else {
        response = M.noEntiendo + '\n\n' + M.legal.preguntarCuota(data.nombre);
      }
      break;

    case 'legal_cuenta_enviada':
      if (esComprobante(userMessage, media)) {
        await alertarComprobante(session, 'legal', media); // avisa al equipo para revisión manual
        data.modalidad = 'En línea'; // la asesoría legal es solo en línea
        nextStep = 'legal_fin';
        response = M.comprobanteRecibido + '\n\n' + M.legal.asignacion;
      } else {
        response = M.recordarComprobante;
      }
      break;

    case 'legal_socioeconomico': {
      const resultado = runQuestionnaire(session, userMessage, SOCIOECONOMICO_PREGUNTAS, 'socioIndex');
      if (resultado.finished) {
        nextStep = 'legal_fin';
        response = M.legal.valoracionCuota;
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'legal_fin':
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

module.exports = { handleLegal };
