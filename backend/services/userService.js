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

exports.getUserPermissions = async userId => {
  const [templateRows] = await pool.execute('SELECT template_id FROM user_template_access WHERE user_id = ?', [userId])
  const [sectionRows] = await pool.execute('SELECT section_id FROM user_section_access WHERE user_id = ?', [userId])

  return {
    templates: templateRows.map(r => r.template_id),
    sections: sectionRows.map(r => r.section_id),
  }
}

exports.updateUserPermissions = async (userId, templates, sections) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // 1. Limpiamos los permisos anteriores
    await connection.execute('DELETE FROM user_template_access WHERE user_id = ?', [userId])
    await connection.execute('DELETE FROM user_section_access WHERE user_id = ?', [userId])

    // 2. Insertamos los nuevos templates permitidos
    if (templates && templates.length > 0) {
      const templateValues = templates.map(tId => [userId, tId])
      await connection.query('INSERT INTO user_template_access (user_id, template_id) VALUES ?', [templateValues])
    }

    // 3. Insertamos las nuevas secciones permitidas
    if (sections && sections.length > 0) {
      const sectionValues = sections.map(sId => [userId, sId])
      await connection.query('INSERT INTO user_section_access (user_id, section_id) VALUES ?', [sectionValues])
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
