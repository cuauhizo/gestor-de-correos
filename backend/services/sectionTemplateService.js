const pool = require('../config/db')

exports.findAll = async user => {
  // Si no hay usuario o es admin, le devolvemos todas las secciones
  if (!user || user.role === 'admin') {
    const [rows] = await pool.query('SELECT id, name, type_key, html_content FROM section_templates ORDER BY name ASC')
    return rows
  }

  // Si es editor, devolvemos solo las secciones asignadas
  const [rows] = await pool.execute(
    `
    SELECT s.id, s.name, s.type_key, s.html_content 
    FROM section_templates s
    INNER JOIN user_section_access usa ON s.id = usa.section_id
    WHERE usa.user_id = ?
    ORDER BY s.name ASC
  `,
    [user.id]
  )
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
