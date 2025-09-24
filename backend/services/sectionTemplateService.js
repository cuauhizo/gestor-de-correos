// backend/services/sectionTemplateService.js
const pool = require('../config/db')

exports.findAll = async () => {
  const [rows] = await pool.query('SELECT id, name, type_key, html_content FROM section_templates ORDER BY name ASC')
  return rows
}

exports.create = async ({ name, type_key, html_content }) => {
  const [result] = await pool.execute('INSERT INTO section_templates (name, type_key, html_content) VALUES (?, ?, ?)', [name, type_key, html_content])
  return { id: result.insertId, name, type_key }
}

exports.update = async (id, { name, type_key, html_content }) => {
  const [result] = await pool.execute('UPDATE section_templates SET name = ?, type_key = ?, html_content = ? WHERE id = ?', [name, type_key, html_content, id])
  return result.affectedRows
}

exports.deleteById = async id => {
  const [result] = await pool.execute('DELETE FROM section_templates WHERE id = ?', [id])
  return result.affectedRows
}
