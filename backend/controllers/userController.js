// backend/controllers/userController.js
const userService = require('../services/userService')
const authService = require('../services/authService') // Reutilizamos para crear usuarios

// GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userService.findAllUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios.' })
  }
}

// POST /api/users (Reutilizamos la lógica de registro)
exports.createUser = async (req, res) => {
  const { username, password } = req.body
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ message: 'Nombre de usuario y contraseña (mín. 6 caracteres) son requeridos.' })
  }
  try {
    const existingUser = await authService.findUserByUsername(username)
    if (existingUser) {
      return res.status(409).json({ message: 'El nombre de usuario ya existe.' })
    }
    await authService.createUser(username, password)
    res.status(201).json({ message: 'Usuario creado exitosamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el usuario.' })
  }
}

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { username, role, password } = req.body
    // Validaciones básicas
    if (!username || !role) {
      return res.status(400).json({ message: 'Nombre de usuario y rol son requeridos.' })
    }
    if (password && password.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' })
    }
    await userService.updateUser(id, { username, role, password })
    res.json({ message: 'Usuario actualizado exitosamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el usuario.' })
  }
}

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    // Prevenir que un admin se elimine a sí mismo
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta.' })
    }
    const affectedRows = await userService.deleteUser(id)
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' })
    }
    res.json({ message: 'Usuario eliminado exitosamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el usuario.' })
  }
}
