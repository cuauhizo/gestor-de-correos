const pool = require('../config/db')

exports.getTotals = async () => {
  // Ejecutamos todas las consultas de conteo en paralelo para mayor eficiencia
  const [emailRows] = await pool.query('SELECT COUNT(*) as total FROM emails_editable')
  const [templateRows] = await pool.query('SELECT COUNT(*) as total FROM templates')
  const [userRows] = await pool.query('SELECT COUNT(*) as total FROM users')

  return {
    emails: emailRows[0].total,
    templates: templateRows[0].total,
    users: userRows[0].total,
  }
}
