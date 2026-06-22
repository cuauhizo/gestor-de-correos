// backend/routes/userRoutes.js
const express = require('express')
const router = express.Router()
const { body } = require('express-validator') // <-- Importamos express-validator
const userController = require('../controllers/userController')
const { protect, admin } = require('../middleware/authMiddleware')

// Todas las rutas de gestión de usuarios requieren ser admin
router.use(protect, admin)

router.get('/', userController.getAllUsers)

// Rutas con validaciones inyectadas
router.post('/', [body('username').notEmpty().withMessage('El nombre de usuario es requerido.'), body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')], userController.createUser)

router.put(
  '/:id',
  [
    body('username').notEmpty().withMessage('El nombre de usuario es requerido.'),
    body('role').isIn(['admin', 'editor']).withMessage('El rol es requerido y debe ser válido.'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
  ],
  userController.updateUser
)

router.delete('/:id', userController.deleteUser)

module.exports = router
