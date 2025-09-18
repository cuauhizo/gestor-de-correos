// backend/services/emailService.js
const pool = require('../config/db')
const { v4: uuidv4 } = require('uuid')

exports.getAllEmails = async () => {
  const [rows] = await pool.query(`
        SELECT e.uuid, e.template_id, t.name as template_name, e.created_at, e.updated_at,
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
  const [rows] = await pool.execute('SELECT e.template_id, t.name AS template_name, e.content_json, e.is_locked, e.locked_by_user_id FROM emails_editable e JOIN templates t ON e.template_id = t.id WHERE e.uuid = ?', [uuid])
  if (rows.length > 0) {
    rows[0].content_json = JSON.parse(rows[0].content_json)
  }
  return rows[0]
}

exports.createEmail = async (template_id, initial_content, user_id) => {
  const uuid = uuidv4()
  await pool.execute('INSERT INTO emails_editable (uuid, template_id, content_json, user_id, is_locked, locked_by_user_id) VALUES (?, ?, ?, ?, 1, ?)', [uuid, template_id, JSON.stringify(initial_content), user_id, user_id])
  return uuid
}

exports.updateEmailContent = async (uuid, updated_content, user_id) => {
  const [result] = await pool.execute('UPDATE emails_editable SET content_json = ?, last_modified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?', [JSON.stringify(updated_content), user_id, uuid])
  return result.affectedRows
}

exports.deleteEmail = async uuid => {
  const [result] = await pool.execute('DELETE FROM emails_editable WHERE uuid = ?', [uuid])
  return result.affectedRows
}

exports.lockEmail = async (uuid, userId) => {
  await pool.execute('UPDATE emails_editable SET is_locked = 1, locked_by_user_id = ? WHERE uuid = ?', [userId, uuid])
}

exports.unlockEmail = async uuid => {
  await pool.execute('UPDATE emails_editable SET is_locked = 0, locked_by_user_id = NULL WHERE uuid = ?', [uuid])
}

// Obtenemos un email solo para verificar su estado de bloqueo
exports.getEmailLockStatus = async uuid => {
  const [rows] = await pool.execute('SELECT is_locked, locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid])
  return rows[0]
}
