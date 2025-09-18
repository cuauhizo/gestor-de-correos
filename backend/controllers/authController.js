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
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
  } catch (error) {
    console.error('Error en el login:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}
