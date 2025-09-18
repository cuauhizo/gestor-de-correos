// backend/server.js
// Archivo principal del servidor Express.js para la aplicación de gestión de correos.
// Carga las variables de entorno desde el archivo .env
require('dotenv').config()

// --- Módulos de Node.js ---
const express = require('express')
const mysql = require('mysql2/promise') // Cliente MySQL con soporte para promesas
const cors = require('cors') // Middleware para habilitar CORS
// const pool = require('./config/db');
const pool = require('./config/db.js')
const { v4: uuidv4 } = require('uuid') // Para generar IDs únicos
const { body, param, validationResult } = require('express-validator') // Para validar datos de entrada
const { protect, admin } = require('./middleware/authMiddleware.js')
const authRoutes = require('./routes/authRoutes.js')
const templateRoutes = require('./routes/templateRoutes')
const emailRoutes = require('./routes/emailRoutes')
const app = express()
const port = process.env.PORT || 3000

// Rutas (Endpoints API)
app.get('/', (req, res) => {
  res.send('API del Editor de Correos funcionando!')
})

// --- Middleware Global ---
const allowedOrigins = [
  'https://mailcreator.tolkogroup.com', // Tu dominio de producción
]

// Si estamos en modo desarrollo, también permitimos localhost
if (process.env.NODE_ENV === 'development') {
  // El puerto por defecto de Vite es 5173
  allowedOrigins.push('http://localhost:5173')
}

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones si el origen está en nuestra lista blanca o si no tienen origen (como Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions)) // Habilita CORS con tu configuración específica

app.use(express.json()) // Habilita el parseo de JSON

// Importar rutas
app.use('/api', authRoutes) // Todas las rutas en authRoutes estarán prefijadas con /api
app.use('/api/templates', templateRoutes)
app.use('/api/emails-editable', emailRoutes)
// (Aquí usaremos las otras rutas)

// Conectar a la base de datos e iniciar el servidor
async function startServer() {
  try {
    // Hacemos una consulta simple para verificar la conexión
    const connection = await pool.getConnection()
    console.log('Conectado a la base de datos MySQL!')
    connection.release() // Devolvemos la conexión al pool

    app.listen(port, () => {
      console.log(`Servidor backend corriendo en http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error)
    process.exit(1) // Detiene la aplicación si no puede conectarse a la DB
  }
}

startServer()
