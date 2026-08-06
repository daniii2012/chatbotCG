
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);


async function sendNotificationEmail(to, subject, htmlContent) {
  try {
    const data = await resend.emails.send({
      from: 'Casa Gaviota <contacto@casagaviota.org.mx>', 
      to: [to],
      subject: subject,
      html: htmlContent,
    });
    console.log(' Correo enviado:', data.id);
    return data;
  } catch (error) {
    console.error('Error enviando correo:', error.message);
  }
}

module.exports = { sendNotificationEmail };