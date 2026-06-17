const userService = require('../services/userService')
const authService = require('../services/authService')
const catchAsync = require('../utils/catchAsync')

// GET /api/users
exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await userService.findAllUsers()
  res.json(users)
})

// POST /api/users
exports.createUser = catchAsync(async (req, res) => {
  const { username, password } = req.body

  if (!username || !password || password.length < 6) {
    const error = new Error('Nombre de usuario y contraseña (mín. 6 caracteres) son requeridos.')
    error.statusCode = 400
    throw error
  }

  const existingUser = await authService.findUserByUsername(username)
  if (existingUser) {
    const error = new Error('El nombre de usuario ya existe.')
    error.statusCode = 409
    throw error
  }

  await authService.createUser(username, password)
  res.status(201).json({ message: 'Usuario creado exitosamente.' })
})

// PUT /api/users/:id
exports.updateUser = catchAsync(async (req, res) => {
  const { id } = req.params
  const { username, role, password } = req.body

  if (!username || !role) {
    const error = new Error('Nombre de usuario y rol son requeridos.')
    error.statusCode = 400
    throw error
  }
  if (password && password.length < 6) {
    const error = new Error('La nueva contraseña debe tener al menos 6 caracteres.')
    error.statusCode = 400
    throw error
  }

  await userService.updateUser(id, { username, role, password })
  res.json({ message: 'Usuario actualizado exitosamente.' })
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

  res.json({ message: 'Usuario eliminado exitosamente.' })
})
