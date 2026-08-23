const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNotificationEmail(to, subject, htmlContent) {
  try {
    const response = await resend.emails.send({
      from: 'Casa Gaviota <notificaciones@contacto.casagaviota.org.mx>', 
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (response.error) {
      console.error(' Error de Resend:', response.error.message);
      return null;
    }

    console.log('Correo enviado con éxito. ID:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Excepción al enviar correo:', error.message);
  }
}

module.exports = { sendNotificationEmail };