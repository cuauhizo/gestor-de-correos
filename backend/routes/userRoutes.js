// backend/routes/userRoutes.js
const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { protect, admin } = require('../middleware/authMiddleware')

// Todas las rutas de gestión de usuarios requieren ser admin
router.use(protect, admin)

router.get('/', userController.getAllUsers)
router.post('/', userController.createUser)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)

module.exports = router
