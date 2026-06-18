const nodemailer = require('nodemailer')

// Creamos el "transporter" usando las variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true para puerto 465, false para otros
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Función exportable para enviar correos
const sendTestEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: `"Gestor de Correos" <${process.env.SMTP_USER}>`, // Remitente
      to: to, // Destinatario
      subject: subject, // Asunto
      html: htmlContent, // El HTML renderizado
    })

    console.log('Correo enviado exitosamente: %s', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error interno de Nodemailer:', error)
    throw new Error('No se pudo enviar el correo de prueba. Verifica las credenciales SMTP.')
  }
}

module.exports = {
  sendTestEmail,
}
