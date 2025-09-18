// backend/config/db.js

const mysql = require('mysql2/promise')

// Configuración de la Base de Datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_correos_tolko',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Crear y exportar el pool de conexiones
const pool = mysql.createPool(dbConfig)

module.exports = pool
