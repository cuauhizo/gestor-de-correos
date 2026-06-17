// backend/controllers/authController.js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authService = require('../services/authService')
const { validationResult } = require('express-validator')
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_muy_segura'
const JWT_EXPIRES_IN = '1h'

exports.register = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { username, password } = req.body
  try {
    const existingUser = await authService.findUserByUsername(username)
    if (existingUser) return res.status(409).json({ message: 'El nombre de usuario ya existe.' })

    await authService.createUser(username, password)
    res.status(201).json({ message: 'Usuario registrado exitosamente.' })
  } catch (error) {
    console.error('Error al registrar usuario:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

exports.login = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { username, password } = req.body
  try {
    const user = await authService.findUserByUsername(username)
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' })

    const token = jwt.sign({ user: { id: user.id, username: user.username, role: user.role } }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    // <-- NUEVO: Configurar y enviar la cookie
    res.cookie('jwt_token', token, {
      httpOnly: true, // Evita acceso desde JS (XSS)
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'lax', // Ayuda a prevenir CSRF
      maxAge: 60 * 60 * 1000, // 1 hora en milisegundos (coincide con JWT_EXPIRES_IN)
    })

    // Ya no enviamos el token en el JSON
    res.json({ user: { id: user.id, username: user.username, role: user.role } })
  } catch (error) {
    console.error('Error en el login:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

exports.logout = (req, res) => {
  res.clearCookie('jwt_token')
  res.json({ message: 'Sesión cerrada exitosamente.' })
}
