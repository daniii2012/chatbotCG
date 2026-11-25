const { MESSAGES: M } = require('../config/messages');
const { updateSession } = require('../db/sessions');
const { runQuestionnaire } = require('./questionnaireEngine');
const { SOCIOECONOMICO_PREGUNTAS, EMPODERAMIENTO_PREGUNTAS } = require('../config/questionnaires');
const { appendEmpoderamientoRecord } = require('../db/excel');
const { esCorreoValido, esTelefonoValido, validarNombreCompleto, validarFechaNacimiento, esComprobante } = require('../utils/validators');
const { alertarComprobante } = require('../utils/alertaPago');

// ─── OPCIÓN 10: TALLER DE LECTURA PARA MUJERES ────────────────────────────────
// Mismo recorrido que la atención psicológica: datos → cuota → (cuenta + comprobante + cuestionario)
// o (estudio socioeconómico). Los textos salen de DATOS.tallerLectura y de los datos bancarios (panel admin).
async function handleLectura(session, userMessage, media) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    case 'lectura_nombre': {
      const r = validarNombreCompleto(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.lectura.pedirNombre;
        break;
      }
      data.nombre = r.valor;
      data.modalidad = 'En línea';
      nextStep = 'lectura_telefono';
      response = M.psico.pedirTelefono;
      break;
    }

    case 'lectura_telefono':
      if (!esTelefonoValido(userMessage)) {
        response = 'Creo que a ese número le falta algo 😊 Escríbelo con *10 dígitos*, por favor.\n\n' + M.psico.pedirTelefono;
        break;
      }
      data.telefono = userMessage;
      nextStep = 'lectura_correo';
      response = M.psico.pedirCorreo;
      break;

    case 'lectura_correo':
      if (!esCorreoValido(userMessage)) {
        response = 'Parece que ese correo no está completo 😊 Revisa que tenga el formato ejemplo@dominio.com, por favor.\n\n' + M.psico.pedirCorreo;
        break;
      }
      data.correo = userMessage;
      nextStep = 'lectura_residencia';
      response = M.psico.pedirResidencia;
      break;

    case 'lectura_residencia':
      data.residencia = userMessage;
      nextStep = 'lectura_fechaNacimiento';
      response = M.psico.pedirFechaNacimiento;
      break;

    case 'lectura_fechaNacimiento': {
      const r = validarFechaNacimiento(userMessage);
      if (!r.ok) {
        response = r.error + '\n\n' + M.psico.pedirFechaNacimiento;
        break;
      }
      data.fechaNacimiento = r.fecha;
      data.edad = r.edad;
      nextStep = 'lectura_cuota';
      response = M.lectura.preguntarCuota(data.nombre);
      break;
    }

    case 'lectura_cuota':
      if (userMessage === '1') {
        nextStep = 'lectura_cuenta_enviada';
        response = M.psico.enviarCuenta; // misma cuenta que psicología
      } else if (userMessage === '2') {
        nextStep = 'lectura_socioeconomico';
        const primera = runQuestionnaire(session, null, SOCIOECONOMICO_PREGUNTAS, 'socioIndex');
        response = M.socioeconomicoIntro + '\n\n' + primera.response;
      } else {
        response = M.noEntiendo + '\n\n' + M.lectura.preguntarCuota(data.nombre);
      }
      break;

    case 'lectura_cuenta_enviada':
      if (esComprobante(userMessage, media)) {
        await alertarComprobante(session, 'lectura', media); // avisa al equipo para revisión manual
        nextStep = 'lectura_empoderamiento';
        const primera = runQuestionnaire(session, null, EMPODERAMIENTO_PREGUNTAS, 'empIndex');
        response = M.lectura.comprobanteRecibido + '\n\n' + M.empoderamientoIntro + '\n\n' + primera.response;
      } else {
        response = M.recordarComprobante;
      }
      break;

    case 'lectura_socioeconomico': {
      const resultado = runQuestionnaire(session, userMessage, SOCIOECONOMICO_PREGUNTAS, 'socioIndex');
      if (resultado.finished) {
        nextStep = 'lectura_fin';
        response = M.lectura.valoracionCuota;
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'lectura_empoderamiento': {
      const resultado = runQuestionnaire(session, userMessage, EMPODERAMIENTO_PREGUNTAS, 'empIndex');
      if (resultado.finished) {
        await appendEmpoderamientoRecord(session);
        nextStep = 'lectura_fin';
        response = M.lectura.confirmacion(data.nombre);
      } else {
        response = resultado.response;
      }
      break;
    }

    case 'lectura_fin':
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

module.exports = { handleLectura };