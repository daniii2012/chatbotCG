const { MESSAGES: M } = require('../config/messages');
const { updateSession } = require('../db/sessions');
const { runQuestionnaire } = require('./questionnaireEngine');
const { SOCIOECONOMICO_PREGUNTAS, LEGAL_FAMILIAR_PREGUNTAS } = require('../config/questionnaires');
const { esCorreoValido, esTelefonoValido, esEdadValida } = require('../utils/validators');

async function handleLegal(session, userMessage) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    case 'legal_nombre':
      data.nombre = userMessage;
      nextStep = 'legal_telefono';
      response = M.legal.pedirTelefono;
      break;

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
      nextStep = 'legal_edad';
      response = M.legal.pedirEdad;
      break;

    case 'legal_edad':
      if (!esEdadValida(userMessage)) {
        response = '⚠️ Escribe tu edad solo con números (entre 12 y 100).\n\n' + M.legal.pedirEdad;
        break;
      }
      data.edad = userMessage;
      nextStep = 'legal_familiar';
      {
        const primera = runQuestionnaire(session, null, LEGAL_FAMILIAR_PREGUNTAS, 'legalIndex');
        response = M.legalFamiliarIntro + '\n\n' + primera.response;
      }
      break;

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
      if (userMessage === '1') {
        nextStep = 'legal_modalidad';
        response = M.legal.pedirModalidad;
      } else {
        response = M.legal.enviarCuenta;
      }
      break;

    case 'legal_modalidad':
      if (userMessage === '1' || userMessage === '2') {
        data.modalidad = userMessage === '1' ? 'Presencial' : 'En línea';
        nextStep = 'legal_fin';
        response = M.legal.asignacion;
      } else {
        response = M.noEntiendo + '\n\n' + M.legal.pedirModalidad;
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
