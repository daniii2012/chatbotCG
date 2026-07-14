const { MESSAGES: M, FORMS } = require('../config/messages');
const { updateSession } = require('../db/sessions');

async function handlePsico(session, userMessage) {
  const { step, data } = session;
  let response = '';
  let nextStep = step;

  switch (step) {
    // Recopilación de datos
    case 'psico_nombre':      data.nombre = userMessage; nextStep = 'psico_telefono';   response = M.psico.pedirTelefono; break;
    case 'psico_telefono':    data.telefono = userMessage; nextStep = 'psico_correo';   response = M.psico.pedirCorreo; break;
    case 'psico_correo':      data.correo = userMessage; nextStep = 'psico_residencia'; response = M.psico.pedirResidencia; break;
    case 'psico_residencia':  data.residencia = userMessage; nextStep = 'psico_edad';   response = M.psico.pedirEdad; break;
    case 'psico_edad':
      data.edad = userMessage;
      nextStep = 'psico_cuota';
      response = M.psico.preguntarCuota(data.nombre);
      break;

    // ¿Puede pagar?
    case 'psico_cuota':
      if (userMessage === '1') {
        nextStep = 'psico_cuenta_enviada';
        response = M.psico.enviarCuenta;
      } else if (userMessage === '2') {
        nextStep = 'psico_form_socio';
        response = M.psico.formularioSocioeconomico(FORMS.socioeconomico);
      } else {
        response = M.noEntiendo + '\n\n' + M.psico.preguntarCuota(data.nombre);
      }
      break;

    // Ruta pago: confirmar comprobante
    case 'psico_cuenta_enviada':
      if (userMessage === '1') {
        nextStep = 'psico_modalidad';
        response = M.psico.pedirModalidad;
      } else {
        response = M.psico.enviarCuenta; // reenvía datos de pago
      }
      break;

    case 'psico_modalidad':
      if (userMessage === '1' || userMessage === '2') {
        data.modalidad = userMessage === '1' ? 'Presencial' : 'En línea';
        nextStep = 'psico_fin';
        response = M.psico.asignacion;
      } else {
        response = M.noEntiendo + '\n\n' + M.psico.pedirModalidad;
      }
      break;

    // Ruta sin recursos: formulario socioeconómico
    case 'psico_form_socio':
      if (userMessage === '1') {
        nextStep = 'psico_valoracion';
        response = M.psico.valoracionCuota;
      } else {
        // Reenvía el link del formulario
        response = M.psico.formularioSocioeconomico(FORMS.socioeconomico);
      }
      break;

    case 'psico_valoracion':
      if (userMessage === '1') {
        nextStep = 'psico_fin';
        response = M.psico.circulosInfo(FORMS.socioeconomico);
      } else if (userMessage === '2') {
        nextStep = 'psico_fin';
        response = M.psico.soloValoracion;
      } else {
        response = M.noEntiendo + '\n\n' + M.psico.valoracionCuota;
      }
      break;

    // Fin → regresar al menú
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
