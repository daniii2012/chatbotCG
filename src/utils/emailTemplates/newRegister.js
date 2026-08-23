
function getNewRegisterTemplate(flow, session) {
  const data = session.data || {};

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
          .header { background-color: #2b5b84; color: #ffffff; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .field { margin-bottom: 10px; }
          .label { font-weight: bold; color: #2b5b84; }
          .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nuevo Registro en el Bot</h2>
          </div>
          <div class="content">
            <p>Se ha completado una solicitud en el flujo <strong>${flow.toUpperCase()}</strong>:</p>
            <div class="field"><span class="label">Servicio:</span> ${data.servicioSolicita || flow}</div>
            <div class="field"><span class="label">UserId:</span> ${session.userId}</div>
            <div class="field"><span class="label">Nombre:</span> ${data.nombre || 'N/A'}</div>
            <div class="field"><span class="label">Teléfono:</span> ${data.telefono || 'N/A'}</div>
            <div class="field"><span class="label">Correo:</span> ${data.correo || 'N/A'}</div>
            <hr />
            <p class="label">Todos los datos recolectados:</p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">${JSON.stringify(data, null, 2)}</pre>
          </div>
          <div class="footer">
            <p>Casa Gaviota A.C. — Sistema de Notificaciones</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = { getNewRegisterTemplate };