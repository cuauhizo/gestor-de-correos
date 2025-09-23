// backend/routes/templateRoutes.js
const express = require('express')
const router = express.Router()
const { body, param } = require('express-validator')
const templateController = require('../controllers/templateController')
const { protect, admin } = require('../middleware/authMiddleware')

// --- Validaciones Reutilizables ---
const templateValidationRules = [
  body('name').isString().trim().isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres.'),
  body('html_content')
    .isString()
    .notEmpty()
    .custom(value => {
      const placeholderRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
      if (!placeholderRegex.test(value)) {
        throw new Error('Debe contener al menos un placeholder con el formato {{nombre_del_campo}}.')
      }
      return true
    }),
]

// --- Definición de Rutas ---
router.get('/', templateController.getAllTemplates) // Pública

router.get('/library/:id', protect, templateController.getTemplateLibrary)

router.get('/:id', protect, templateController.getTemplateById) // Protegida para usuarios logueados

router.post('/', protect, admin, templateValidationRules, templateController.createTemplate) // Solo Admin

router.put('/:id', protect, admin, [param('id').isInt(), ...templateValidationRules], templateController.updateTemplate) // Solo Admin

router.delete('/:id', protect, admin, templateController.deleteTemplate) // Solo Admin

module.exports = router
