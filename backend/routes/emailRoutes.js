// backend/routes/emailRoutes.js
const express = require('express')
const router = express.Router()
const { body, param } = require('express-validator')
const emailController = require('../controllers/emailController')
const { protect, admin } = require('../middleware/authMiddleware')
const { checkLock } = require('../middleware/lockMiddleware')

// <-- RUTA CORREGIDA PARA EL ENVÍO DE PRUEBA -->
router.post('/:uuid/send-test', protect, emailController.sendTestEmailController)

// Rutas de la colección de correos
router.get('/', protect, emailController.getAllEmails)
router.post('/', protect, [body('template_id').optional({ nullable: true }), body('initial_content').isObject()], emailController.createEmail)

// Rutas para un correo específico
router.get('/:uuid', protect, emailController.getEmailByUuid)
router.put('/:uuid', protect, checkLock, emailController.updateEmail)
router.delete('/:uuid', protect, emailController.deleteEmail)

// Rutas de bloqueo
router.post('/:uuid/lock', protect, emailController.lockEmail)
router.post('/:uuid/unlock', protect, emailController.unlockEmail)
router.post('/:uuid/force-unlock', protect, emailController.forceUnlockEmail)

module.exports = router
