// backend/services/authService.js
const bcrypt = require('bcryptjs')
// const pool = require('../server').pool; // Importamos el pool exportado de server.js
const pool = require('../config/db.js')

async function findUserByUsername(username) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
  return rows[0]
}

async function createUser(username, password) {
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)
  await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword])
}

module.exports = { findUserByUsername, createUser }
