// backend/controllers/emailController.js
const emailService = require('../services/emailService')
const { validationResult } = require('express-validator')

// --- Funciones Auxiliares de Validación (traídas de server.js) ---
const validateRichContent = value => {
  if (typeof value !== 'string' || !value.replace(/<[^>]*>/g, '').trim()) {
    throw new Error('El contenido no puede estar vacío.')
  }
  return true
}

const validateUrl = value => {
  try {
    new URL(value)
    return true
  } catch (e) {
    throw new Error('Debe ser una URL válida.')
  }
}

// GET /api/emails-editable
exports.getAllEmails = async (req, res) => {
  try {
    const emails = await emailService.getAllEmails()
    res.json(emails)
  } catch (error) {
    console.error('Error al obtener la lista de correos:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// GET /api/emails-editable/:uuid
exports.getEmailByUuid = async (req, res) => {
  try {
    const emailData = await emailService.getEmailByUuid(req.params.uuid)
    if (!emailData) return res.status(404).json({ message: 'Correo editable no encontrado.' })
    res.json(emailData)
  } catch (error) {
    console.error('Error al obtener el correo:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// POST /api/emails-editable
exports.createEmail = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const { template_id, initial_content } = req.body
    const user_id = req.user.id

    // Validación del contenido inicial
    for (const key in initial_content) {
      const value = initial_content[key]
      if (key.includes('enlace_')) {
        validateUrl(value)
      } else {
        validateRichContent(value)
      }
    }

    const uuid = await emailService.createEmail(template_id, initial_content, user_id)
    res.status(201).json({ uuid, message: 'Correo editable creado y bloqueado exitosamente.' })
  } catch (error) {
    console.error('Error al crear el correo:', error)
    res.status(400).json({ message: error.message || 'Error interno del servidor.' })
  }
}

// PUT /api/emails-editable/:uuid
exports.updateEmail = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const { uuid } = req.params
    const { updated_content } = req.body
    const user_id = req.user.id

    // Validación del contenido actualizado
    for (const key in updated_content) {
      const value = updated_content[key]
      if (key.includes('enlace_')) {
        validateUrl(value)
      } else {
        validateRichContent(value)
      }
    }

    // Verificación de bloqueo (aunque el middleware ya lo hace, es una doble seguridad)
    const email = await emailService.getEmailLockStatus(uuid)
    if (email.locked_by_user_id !== user_id) {
      return res.status(403).json({ message: 'No tienes el bloqueo para guardar este correo.' })
    }

    await emailService.updateEmailContent(uuid, updated_content, user_id)
    res.json({ message: 'Contenido del correo actualizado exitosamente.' })
  } catch (error) {
    console.error('Error al actualizar el correo:', error)
    res.status(400).json({ message: error.message || 'Error interno del servidor.' })
  }
}

// DELETE /api/emails-editable/:uuid
exports.deleteEmail = async (req, res) => {
  try {
    const { uuid } = req.params
    const currentUserId = req.user.id

    // Se comprueba si el correo está bloqueado por OTRO usuario
    const email = await emailService.getEmailLockStatus(uuid)
    if (!email) {
      return res.status(404).json({ message: 'Correo editable no encontrado.' })
    }
    if (email.is_locked && email.locked_by_user_id !== currentUserId) {
      return res.status(409).json({ message: `Este correo está siendo editado y no se puede eliminar.` })
    }

    const affectedRows = await emailService.deleteEmail(uuid)
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Correo no encontrado para eliminar.' })
    }
    res.json({ message: 'Correo eliminado exitosamente.' })
  } catch (error) {
    console.error('Error al eliminar correo:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// POST /api/emails-editable/:uuid/lock
exports.lockEmail = async (req, res) => {
  try {
    const { uuid } = req.params
    const currentUserId = req.user.id

    const email = await emailService.getEmailLockStatus(uuid)
    if (!email) {
      return res.status(404).json({ message: 'Correo no encontrado.' })
    }
    if (email.is_locked && email.locked_by_user_id !== currentUserId) {
      return res.status(409).json({ message: `Este correo ya está bloqueado por otro usuario.` })
    }

    await emailService.lockEmail(uuid, currentUserId)
    res.status(200).json({ message: 'Correo bloqueado para edición.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al bloquear el correo.' })
  }
}

// POST /api/emails-editable/:uuid/unlock
exports.unlockEmail = async (req, res) => {
  try {
    const { uuid } = req.params
    const currentUserId = req.user.id

    const email = await emailService.getEmailLockStatus(uuid)
    if (!email) {
      return res.status(404).json({ message: 'Correo no encontrado.' })
    }
    if (email.locked_by_user_id !== currentUserId) {
      return res.status(403).json({ message: 'No tienes permiso para desbloquear este correo.' })
    }

    await emailService.unlockEmail(uuid)
    res.status(200).json({ message: 'Correo desbloqueado.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al desbloquear el correo.' })
  }
}

// POST /api/emails-editable/:uuid/force-unlock
exports.forceUnlockEmail = async (req, res) => {
  try {
    const { uuid } = req.params
    const email = await emailService.getEmailLockStatus(uuid)
    if (!email) {
      return res.status(404).json({ message: 'Correo no encontrado.' })
    }

    await emailService.unlockEmail(uuid) // El servicio hace lo mismo: quita el bloqueo
    res.status(200).json({ message: 'Correo desbloqueado por el administrador.' })
  } catch (error) {
    console.error('Error al forzar el desbloqueo:', error)
    res.status(500).json({ message: 'Error al forzar el desbloqueo del correo.' })
  }
}
