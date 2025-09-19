// backend/services/userService.js
const pool = require('../config/db')
const bcrypt = require('bcryptjs')

exports.findAllUsers = async () => {
  const [rows] = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY username ASC')
  return rows
}

exports.updateUser = async (id, { username, role, password }) => {
  if (password) {
    // Si se proporciona una nueva contraseña, la hasheamos
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    await pool.execute('UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?', [username, role, hashedPassword, id])
  } else {
    // Si no, actualizamos solo el nombre y el rol
    await pool.execute('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, id])
  }
}

exports.deleteUser = async id => {
  const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id])
  return result.affectedRows
}
