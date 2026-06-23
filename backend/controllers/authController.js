const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authService = require('../services/authService')
const { validationResult } = require('express-validator')
const catchAsync = require('../utils/catchAsync')
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '8h'

exports.register = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { username, password } = req.body

  const existingUser = await authService.findUserByUsername(username)
  if (existingUser) {
    const error = new Error('El nombre de usuario ya existe.')
    error.statusCode = 409
    throw error
  }

  await authService.createUser(username, password)
  res.status(201).json({ message: 'Usuario registrado exitosamente.' })
})

exports.login = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { username, password } = req.body

  const user = await authService.findUserByUsername(username)
  if (!user) {
    const error = new Error('Credenciales inválidas.')
    error.statusCode = 401
    throw error
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    const error = new Error('Credenciales inválidas.')
    error.statusCode = 401
    throw error
  }

  const token = jwt.sign({ user: { id: user.id, username: user.username, role: user.role } }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })

  res.cookie('jwt_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 HORAS EN MILISEGUNDOS
  })

  res.json({ user: { id: user.id, username: user.username, role: user.role } })
})

exports.logout = (req, res) => {
  res.clearCookie('jwt_token')
  res.json({ message: 'Sesión cerrada exitosamente.' })
}
