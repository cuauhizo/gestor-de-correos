// backend/routes/authRoutes.js
const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const authController = require('../controllers/authController')

router.post('/register', [body('username').notEmpty().withMessage('El nombre de usuario es requerido.'), body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')], authController.register)

router.post('/login', [body('username').notEmpty().withMessage('El nombre de usuario es requerido.'), body('password').notEmpty().withMessage('La contraseña es requerida.')], authController.login)

module.exports = router
