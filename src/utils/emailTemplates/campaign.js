function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCampaignTemplate({ mensaje, imageUrls = [], enlace, logoUrl }) {
  const logo = logoUrl || 'https://chatbot.casagaviota.org.mx/logo-casagaviota.png';

  const imagesHtml = imageUrls.map(url => `
    <div style="text-align: center; margin: 22px 0;">
      <img src="${url}" alt="Comunicado" style="max-width: 100%; height: auto; border-radius: 14px; display: block; margin: 0 auto;" />
    </div>
  `).join('');

  const buttonHtml = enlace ? `
    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${escapeHtml(enlace)}" target="_blank"
         style="background-color: #d63381; background-image: linear-gradient(135deg, #d63381 0%, #a3225e 100%); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 6px 16px rgba(214,51,129,0.3);">
        Ver más información
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: 'Raleway', Arial, sans-serif; color: #444; line-height: 1.6; background-color: #fdf4f8; margin: 0; padding: 30px 12px;">

        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(214,51,129,0.12);">

          <!-- Franja de color superior -->
          <div style="height: 8px; background-color: #16aab4; background-image: linear-gradient(90deg, #d63381 0%, #16aab4 100%);"></div>

          <!-- Encabezado -->
          <div style="padding: 32px 30px 8px 30px; text-align: center;">
            <img src="${logo}" alt="Casa Gaviota" style="max-width: 200px; height: auto;" />
            <div style="font-family: 'Brush Script MT', cursive; color: #d63381; font-size: 15px; margin-top: 6px;">un vuelo sin violencia a.c.</div>
          </div>

          <!-- Contenido -->
          <div style="padding: 18px 35px 30px 35px;">
            <div style="text-align: center; margin: 6px 0 22px 0;">
              <span style="display: inline-block; background-color: #E1F5F4; color: #12909a; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px;">Comunicado</span>
            </div>

            <p style="font-size: 16px; line-height: 1.7; color: #3A2430; white-space: pre-wrap; margin: 0;">${escapeHtml(mensaje)}</p>

            ${imagesHtml}
            ${buttonHtml}

            <!-- Aviso de emergencia -->
            <div style="background-color: #fdeef4; border: 1.5px solid #d63381; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #a3225e; font-weight: 700; text-align: center; margin-top: 30px;">
              Si estás en una situación de emergencia o tu vida está en riesgo, llama al 911
            </div>

            <!-- Tarjeta de contacto -->
            <div style="background-color: #16aab4; background-image: linear-gradient(135deg, #16aab4 0%, #12909a 100%); border-radius: 14px; padding: 18px 20px; color: #ffffff; margin-top: 18px;">
              <p style="margin: 4px 0; font-size: 13.5px;">Llámanos: <strong style="font-size: 15px;">55 9373 8850</strong></p>
              <p style="margin: 4px 0; font-size: 13.5px;">WhatsApp: <strong style="font-size: 15px;">55 7430 3412</strong></p>
            </div>
          </div>

          <!-- Pie -->
          <div style="background-color: #16aab4; color: #ffffff; padding: 20px 30px; font-size: 11.5px; text-align: center;">
            Casa Gaviota un vuelo sin violencia A.C. · Galicia no. 192 int. 3, Col. Álamos, CDMX · RFC: CGU120224488<br/>
            T. (55) 3096 5189 · <a href="https://www.casagaviota.org" style="color: #ffffff; text-decoration: underline;">www.casagaviota.org</a>
          </div>

        </div>
      </body>
    </html>
  `;
}

module.exports = { getCampaignTemplate };