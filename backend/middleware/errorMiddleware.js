const errorHandler = (err, req, res, next) => {
  // Loguear el error en consola para debugging (puedes usar librerías como winston más adelante)
  console.error('💥 Error detectado:', err)

  // Definir el código de estado (500 por defecto)
  const statusCode = err.statusCode || 500

  // Definir el mensaje
  let message = err.message || 'Error interno del servidor.'

  // Manejo de errores específicos de MySQL (opcional pero recomendado)
  if (err.code === 'ER_DUP_ENTRY') {
    message = 'El registro ya existe (valor duplicado).'
    err.statusCode = 409
  }

  // Enviar la respuesta. En desarrollo, enviamos el stack trace para ayudar a depurar.
  res.status(err.statusCode || statusCode).json({
    message: message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
}

module.exports = errorHandler
