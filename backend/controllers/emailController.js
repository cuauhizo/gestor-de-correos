const emailService = require('../services/emailService')
const { validationResult } = require('express-validator')
const catchAsync = require('../utils/catchAsync')
const mailer = require('../utils/mailer')

// --- Funciones Auxiliares de Validación ---
const validateRichContent = value => {
  if (typeof value !== 'string' || !value || value === '<p></p>') return true
  if (!value.replace(/<[^>]*>/g, '').trim()) {
    const err = new Error('El contenido no puede estar vacío.')
    err.statusCode = 400
    throw err
  }
  return true
}

const validateUrl = value => {
  try {
    new URL(value)
    return true
  } catch (e) {
    const err = new Error('Debe ser una URL válida.')
    err.statusCode = 400
    throw err
  }
}

// GET /api/emails-editable
exports.getAllEmails = catchAsync(async (req, res) => {
  const emails = await emailService.getAllEmails()
  res.json(emails)
})

// GET /api/emails-editable/:uuid
exports.getEmailByUuid = catchAsync(async (req, res) => {
  const emailData = await emailService.getEmailByUuid(req.params.uuid)
  if (!emailData) {
    const error = new Error('Correo editable no encontrado.')
    error.statusCode = 404
    throw error
  }
  res.json(emailData)
})

// POST /api/emails-editable
exports.createEmail = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { template_id, initial_content, email_name } = req.body
  const user_id = req.user.id

  for (const key in initial_content) {
    const value = initial_content[key]
    if (key.includes('enlace_')) validateUrl(value)
    else validateRichContent(value)
  }

  const uuid = await emailService.createEmail(template_id, initial_content, user_id, email_name)
  res.status(201).json({ uuid, message: 'Correo editable creado y bloqueado exitosamente.' })
})

// PUT /api/emails-editable/:uuid
exports.updateEmail = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { uuid } = req.params
  const { updated_content, email_name } = req.body
  const user_id = req.user.id

  if (!updated_content || !Array.isArray(updated_content.sections)) {
    const error = new Error('El formato del contenido es inválido. Se esperaba un array de secciones.')
    error.statusCode = 400
    throw error
  }

  for (const section of updated_content.sections) {
    for (const key in section.content) {
      const value = section.content[key]
      if (key.includes('enlace_')) validateUrl(value)
      else if (!key.startsWith('image_')) validateRichContent(value)
    }
  }

  await emailService.updateEmailContent(uuid, updated_content, email_name, user_id)
  res.json({ message: 'Contenido del correo actualizado exitosamente.' })
})

// DELETE /api/emails-editable/:uuid
exports.deleteEmail = catchAsync(async (req, res) => {
  const { uuid } = req.params
  const currentUserId = req.user.id

  const email = await emailService.getEmailLockStatus(uuid)
  if (!email) {
    const error = new Error('Correo editable no encontrado.')
    error.statusCode = 404
    throw error
  }
  if (email.is_locked && email.locked_by_user_id !== currentUserId) {
    const error = new Error('Este correo está siendo editado y no se puede eliminar.')
    error.statusCode = 409
    throw error
  }

  const affectedRows = await emailService.deleteEmail(uuid)
  if (affectedRows === 0) {
    const error = new Error('Correo no encontrado para eliminar.')
    error.statusCode = 404
    throw error
  }
  res.json({ message: 'Correo eliminado exitosamente.' })
})

// POST /api/emails-editable/:uuid/lock
exports.lockEmail = catchAsync(async (req, res) => {
  const { uuid } = req.params
  const currentUserId = req.user.id

  const email = await emailService.getEmailLockStatus(uuid)
  if (!email) {
    const error = new Error('Correo no encontrado.')
    error.statusCode = 404
    throw error
  }
  if (email.is_locked && email.locked_by_user_id !== currentUserId) {
    const error = new Error('Este correo ya está bloqueado por otro usuario.')
    error.statusCode = 409
    throw error
  }

  await emailService.lockEmail(uuid, currentUserId)
  res.status(200).json({ message: 'Correo bloqueado para edición.' })
})

// POST /api/emails-editable/:uuid/unlock
exports.unlockEmail = catchAsync(async (req, res) => {
  const { uuid } = req.params
  const currentUserId = req.user.id

  const email = await emailService.getEmailLockStatus(uuid)
  if (!email) {
    const error = new Error('Correo no encontrado.')
    error.statusCode = 404
    throw error
  }
  if (email.locked_by_user_id !== currentUserId) {
    const error = new Error('No tienes permiso para desbloquear este correo.')
    error.statusCode = 403
    throw error
  }

  await emailService.unlockEmail(uuid)
  res.status(200).json({ message: 'Correo desbloqueado.' })
})

// POST /api/emails-editable/:uuid/force-unlock
exports.forceUnlockEmail = catchAsync(async (req, res) => {
  const { uuid } = req.params
  const email = await emailService.getEmailLockStatus(uuid)
  if (!email) {
    const error = new Error('Correo no encontrado.')
    error.statusCode = 404
    throw error
  }

  await emailService.unlockEmail(uuid)
  res.status(200).json({ message: 'Correo desbloqueado por el administrador.' })
})

exports.sendTestEmailController = async (req, res) => {
  try {
    const { uuid } = req.params
    const { to, subject, html } = req.body

    // Validaciones básicas
    if (!to || !html) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: correo de destino o contenido HTML.',
      })
    }

    // Usamos el utilitario para despachar el correo
    await mailer.sendTestEmail(to, subject, html)

    res.status(200).json({
      success: true,
      message: 'Correo de prueba enviado exitosamente',
    })
  } catch (error) {
    console.error('Error en sendTestEmailController:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno al enviar el correo de prueba',
    })
  }
}
