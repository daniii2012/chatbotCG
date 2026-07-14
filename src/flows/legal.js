const { MESSAGES: M, FORMS } = require('../config/messages');
const { updateSession } = require('../db/sessions');

async function handleLegal(session, userMessage) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    case 'legal_nombre':     data.nombre = userMessage; nextStep = 'legal_telefono';   response = M.legal.pedirTelefono; break;
    case 'legal_telefono':   data.telefono = userMessage; nextStep = 'legal_correo';   response = M.legal.pedirCorreo; break;
    case 'legal_correo':     data.correo = userMessage; nextStep = 'legal_residencia'; response = M.legal.pedirResidencia; break;
    case 'legal_residencia': data.residencia = userMessage; nextStep = 'legal_edad';   response = M.legal.pedirEdad; break;
    case 'legal_edad':
      data.edad = userMessage;
      nextStep = 'legal_cuota';
      response = M.legal.preguntarCuota(data.nombre);
      break;

    case 'legal_cuota':
      if (userMessage === '1') {
        nextStep = 'legal_cuenta_enviada';
        response = M.legal.enviarCuenta;
      } else if (userMessage === '2') {
        nextStep = 'legal_form_socio';
        response = M.legal.formularioSocioeconomico(FORMS.legal);
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

    case 'legal_form_socio':
      if (userMessage === '1') {
        nextStep = 'legal_fin';
        response = M.legal.valoracionCuota;
      } else {
        response = M.legal.formularioSocioeconomico(FORMS.legal);
      }
      break;

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
