// backend/middleware/lockMiddleware.js
const pool = require('../config/db')

// Middleware para verificar si un correo está bloqueado por otro usuario
const checkLock = async (req, res, next) => {
  const { uuid } = req.params
  const currentUserId = req.user.id
  try {
    const [rows] = await pool.execute('SELECT is_locked, locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Correo no encontrado.' })
    }
    const email = rows[0]
    if (email.is_locked && email.locked_by_user_id !== currentUserId) {
      const [userRows] = await pool.execute('SELECT username FROM users WHERE id = ?', [email.locked_by_user_id])
      const lockedByUsername = userRows.length > 0 ? userRows[0].username : 'otro usuario'
      return res.status(409).json({ message: `Este correo está siendo editado por ${lockedByUsername}.` })
    }
    next()
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar el bloqueo.' })
  }
}

module.exports = { checkLock }
