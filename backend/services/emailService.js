// backend/services/emailService.js
const pool = require('../config/db')
const { v4: uuidv4 } = require('uuid')
const { parseTemplateHTML } = require('../utils/templateParser')

exports.getAllEmails = async () => {
  const [rows] = await pool.query(`
        SELECT e.uuid, e.is_locked, e.template_id, t.name as template_name, e.created_at, e.updated_at, e.name as email_name,
               uc.username AS creator_username, um.username AS last_modifier_username
        FROM emails_editable e
        LEFT JOIN templates t ON e.template_id = t.id
        LEFT JOIN users uc ON e.user_id = uc.id
        LEFT JOIN users um ON e.last_modified_by = um.id
        ORDER BY e.updated_at DESC
    `)
  return rows
}

exports.getEmailByUuid = async uuid => {
  const [rows] = await pool.execute('SELECT e.template_id, t.name AS template_name, e.content_json, e.is_locked, e.locked_by_user_id, e.name as email_name FROM emails_editable e LEFT JOIN templates t ON e.template_id = t.id WHERE e.uuid = ?', [uuid])
  if (rows.length > 0) {
    rows[0].content_json = JSON.parse(rows[0].content_json)
  }
  return rows[0]
}

exports.createEmail = async (template_id, initial_content, user_id, email_name = null) => {
  const uuid = uuidv4()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    let sections = [] // Empezamos asumiendo que es un lienzo en blanco

    // Si viene un template_id, cargamos su estructura y la rellenamos
    if (template_id) {
      const [templateRows] = await connection.execute('SELECT html_content FROM templates WHERE id = ?', [template_id])
      if (templateRows.length === 0) {
        throw new Error('Template no encontrado')
      }
      const templateHtml = templateRows[0].html_content
      sections = parseTemplateHTML(templateHtml)

      // Rellenamos con el contenido inicial, respetando las imágenes
      if (initial_content) {
        sections.forEach(section => {
          for (const key in section.content) {
            if (initial_content[key] && !key.startsWith('image_')) {
              section.content[key] = initial_content[key]
            } else if (key.startsWith('image_') && !section.content[key] && initial_content[key]) {
              section.content[key] = initial_content[key]
            }
          }
        })
      }
    }

    const finalContentObject = { sections }

    // Guardamos en la base de datos (template_id se guardará como NULL si no existe)
    await connection.execute('INSERT INTO emails_editable (uuid, template_id, content_json, user_id, name) VALUES (?, ?, ?, ?, ?)', [uuid, template_id || null, JSON.stringify(finalContentObject), user_id, email_name])

    await connection.commit()
    return uuid
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

exports.updateEmailContent = async (uuid, updated_content, email_name, user_id) => {
  const [result] = await pool.execute('UPDATE emails_editable SET content_json = ?, name = ?, last_modified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?', [JSON.stringify(updated_content), email_name, user_id, uuid])
  return result.affectedRows
}

exports.deleteEmail = async uuid => {
  const [result] = await pool.execute('DELETE FROM emails_editable WHERE uuid = ?', [uuid])
  return result.affectedRows
}

exports.lockEmail = async (uuid, userId) => {
  await pool.execute('UPDATE emails_editable SET is_locked = 1, locked_by_user_id = ?, updated_at = updated_at WHERE uuid = ?', [userId, uuid])
}

exports.unlockEmail = async uuid => {
  await pool.execute('UPDATE emails_editable SET is_locked = 0, locked_by_user_id = NULL, updated_at = updated_at WHERE uuid = ?', [uuid])
}

// Obtenemos un email solo para verificar su estado de bloqueo
exports.getEmailLockStatus = async uuid => {
  const [rows] = await pool.execute('SELECT is_locked, locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid])
  return rows[0]
}
