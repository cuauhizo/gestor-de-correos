const userService = require('../services/userService')
const authService = require('../services/authService')
const catchAsync = require('../utils/catchAsync')
const { validationResult } = require('express-validator') // <-- Importamos validationResult

// GET /api/users
exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await userService.findAllUsers()
  res.json(users)
})

// POST /api/users
exports.createUser = catchAsync(async (req, res) => {
  // Comprobamos si las validaciones de la ruta fallaron
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    // Retornamos el primer mensaje de error para que lo lea el Frontend
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }

  const { username, password } = req.body

  const existingUser = await authService.findUserByUsername(username)
  if (existingUser) {
    const error = new Error('El nombre de usuario ya existe.')
    error.statusCode = 409
    throw error
  }

  await authService.createUser(username, password)
  res.status(201).json({ success: true, message: 'Usuario creado exitosamente.' })
})

// PUT /api/users/:id
exports.updateUser = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }

  const { id } = req.params
  const { username, role, password } = req.body

  await userService.updateUser(id, { username, role, password })
  res.json({ success: true, message: 'Usuario actualizado exitosamente.' })
})

// DELETE /api/users/:id
exports.deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params

  if (parseInt(id, 10) === req.user.id) {
    const error = new Error('No puedes eliminar tu propia cuenta.')
    error.statusCode = 400
    throw error
  }

  const affectedRows = await userService.deleteUser(id)
  if (affectedRows === 0) {
    const error = new Error('Usuario no encontrado.')
    error.statusCode = 404
    throw error
  }

  res.json({ success: true, message: 'Usuario eliminado exitosamente.' })
})
