const { MESSAGES: M } = require('../config/messages');
const { updateSession } = require('../db/sessions');
const { runQuestionnaire } = require('./questionnaireEngine');
const { SOCIOECONOMICO_PREGUNTAS, EMPODERAMIENTO_PREGUNTAS } = require('../config/questionnaires');
const { appendEmpoderamientoRecord } = require('../db/excel');
const { esCorreoValido, esTelefonoValido, esEdadValida } = require('../utils/validators');

async function handlePsico(session, userMessage) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    case 'psico_nombre':
      data.nombre = userMessage;
      nextStep = 'psico_telefono';
      response = M.psico.pedirTelefono;
      break;

    case 'psico_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = '⚠️ Ese teléfono no parece válido, debe tener 10 dígitos.\n\n' + M.psico.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'psico_correo';
      response = M.psico.pedirCorreo;
      break;

    case 'psico_correo':
      if (!esCorreoValido(userMessage)) {
        response = '⚠️ Ese correo no parece válido, revisa el formato (ejemplo@dominio.com).\n\n' + M.psico.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      nextStep = 'psico_residencia';
      response = M.psico.pedirResidencia;
      break;

    case 'psico_residencia':
      data.residencia = userMessage;
      nextStep = 'psico_edad';
      response = M.psico.pedirEdad;
      break;

    case 'psico_edad':
      if (!esEdadValida(userMessage)) {
        response = '⚠️ Escribe tu edad solo con números (entre 12 y 100).\n\n' + M.psico.pedirEdad;
        break;
      }
      data.edad = userMessage;
      nextStep = 'psico_cuota';
      response = M.psico.preguntarCuota(data.nombre);
      break;

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
      if (userMessage === '1') {
        nextStep = 'psico_modalidad';
        response = M.psico.pedirModalidad;
      } else {
        response = M.psico.enviarCuenta;
      }
      break;

    case 'psico_modalidad':
      if (userMessage === '1' || userMessage === '2') {
        data.modalidad = userMessage === '1' ? 'Presencial' : 'En línea';
        nextStep = 'psico_empoderamiento';
        const primera = runQuestionnaire(session, null, EMPODERAMIENTO_PREGUNTAS, 'empIndex');
        response = M.empoderamientoIntro + '\n\n' + primera.response;
      } else {
        response = M.noEntiendo + '\n\n' + M.psico.pedirModalidad;
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
