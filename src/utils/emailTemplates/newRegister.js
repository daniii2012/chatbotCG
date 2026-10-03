function getNewRegisterTemplate(flow, session) {
    const data = session.data || {};

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Raleway', Arial, sans-serif; color: #444; line-height: 1.6; background: linear-gradient(135deg, #fdeef4 0%, #eaf9fa 100%); margin: 0; padding: 30px 0; }
            .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(214, 51, 129, 0.12); }

            .header { padding: 35px 30px 10px 30px; text-align: center; }
            .header img { max-width: 200px; height: auto; }
            .tagline { font-family: 'Brush Script MT', cursive; color: #d63381; font-size: 15px; margin-top: 6px; }

            .wave { width: 100%; display: block; }

            .content { padding: 10px 35px 30px 35px; }
            .greeting { font-size: 21px; font-weight: 700; color: #d63381; margin: 20px 0 4px 0; }
            .subtext { font-size: 14.5px; color: #555; margin-bottom: 22px; }

            .contact-card { background: linear-gradient(135deg, #16aab4 0%, #12909a 100%); border-radius: 14px; padding: 18px 20px; color: #ffffff; margin-bottom: 20px; }
            .contact-card p { margin: 4px 0; font-size: 13.5px; }
            .contact-card strong { font-size: 15px; }

            .emergency { background-color: #fdeef4; border: 1.5px solid #d63381; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #a3225e; font-weight: 700; text-align: center; margin-bottom: 26px; }

            .divider { display: flex; align-items: center; text-align: center; color: #bbb; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; margin: 20px 0 16px 0; }
            .divider img { width: 10px; height: 10px; margin: 0 10px; }

            .info-table { width: 100%; border-collapse: collapse; }
            .info-table td { padding: 10px 0; font-size: 13.5px; border-bottom: 1px solid #f0f0f0; }
            .info-label { color: #16aab4; font-weight: 700; width: 40%; }
            .info-value { color: #333; }

            .footer { background-color: #16aab4; color: #ffffff; padding: 20px 30px; font-size: 11.5px; text-align: center; }
            .footer a { color: #ffffff; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">

            <div class="header">
              <img src="https://chatbot.casagaviota.org.mx/logo-casagaviota.png" alt="Casa Gaviota" />
              <div class="tagline">un vuelo sin violencia a.c.</div>
            </div>

            <img class="wave" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNTAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPgo8cGF0aCBkPSJNMCw1MCBMMCwxNSBDMTUwLDQ1IDMwMCwwIDQ1MCwyMCBDNTIwLDMwIDU3MCwxMCA2MDAsMCBMNjAwLDUwIFoiIGZpbGw9IiMxNmFhYjQiLz4KPC9zdmc+Cg==" alt="" />

            <div class="content">
              <p class="greeting">Gracias por confiar en Casa Gaviota 💜</p>
              <p class="subtext">
                Hemos recibido tu información correctamente. Nuestro equipo revisará tu solicitud
                y se pondrá en contacto contigo en un plazo máximo de <strong>24 horas</strong>
                para orientarte y dar seguimiento a tu caso.
              </p>

              <div class="contact-card">
                <p>📞 Llámanos: <strong>55 9373 8850</strong></p>
                <p>💬 WhatsApp: <strong>55 7430 3412</strong></p>
              </div>

              <div class="emergency">
                🚨 Si estás en una situación de emergencia o tu vida está en riesgo, llama al 911
              </div>

              <div class="divider">
                <span style="flex:1; height:1px; background:#eee;"></span>
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjZDYzMzgxIiB0cmFuc2Zvcm09InJvdGF0ZSg0NSAxMCAxMCkiLz48L3N2Zz4K" alt="" />
                Detalles de tu solicitud
                <span style="flex:1; height:1px; background:#eee;"></span>
              </div>

              <table class="info-table">
                <tr><td class="info-label">Servicio</td><td class="info-value">${data.servicioSolicita || flow}</td></tr>
                <tr><td class="info-label">Nombre</td><td class="info-value">${data.nombre || 'N/A'}</td></tr>
                <tr><td class="info-label">Teléfono</td><td class="info-value">${data.telefono || 'N/A'}</td></tr>
                <tr><td class="info-label">Correo</td><td class="info-value">${data.correo || 'N/A'}</td></tr>
              </table>
            </div>

            <div class="footer">
              Casa Gaviota un vuelo sin violencia A.C. · Galicia no. 192 int. 3, Col. Álamos, CDMX · RFC: CGU120224488<br/>
              T. (55) 3096 5189 · <a href="https://www.casagaviota.org">www.casagaviota.org</a>
            </div>

          </div>
        </body>
      </html>
    `;
}

module.exports = { getNewRegisterTemplate };