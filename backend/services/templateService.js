// backend/services/templateService.js
const pool = require('../config/db')

// Obtener todos los templates
exports.getAllTemplates = async () => {
  const [rows] = await pool.query('SELECT id, name, created_at FROM templates')
  return rows
}

// Obtener un template por ID
exports.getTemplateById = async id => {
  const [rows] = await pool.execute('SELECT html_content FROM templates WHERE id = ?', [id])
  return rows[0]
}

// Crear un nuevo template
exports.createTemplate = async (name, html_content, user_id) => {
  const [existing] = await pool.execute('SELECT id FROM templates WHERE name = ?', [name])
  if (existing.length > 0) {
    const error = new Error('Ya existe un template con este nombre.')
    error.statusCode = 409
    throw error
  }
  await pool.execute('INSERT INTO templates (name, html_content, user_id) VALUES (?, ?, ?)', [name, html_content, user_id])
}

// Actualizar un template
exports.updateTemplate = async (id, name, html_content) => {
  const [existing] = await pool.execute('SELECT id FROM templates WHERE name = ? AND id != ?', [name, id])
  if (existing.length > 0) {
    const error = new Error('Ya existe otro template con este nombre.')
    error.statusCode = 409
    throw error
  }
  const [result] = await pool.execute('UPDATE templates SET name = ?, html_content = ? WHERE id = ?', [name, html_content, id])
  return result.affectedRows
}

// Eliminar un template
exports.deleteTemplate = async id => {
  const [result] = await pool.execute('DELETE FROM templates WHERE id = ?', [id])
  return result.affectedRows
}
