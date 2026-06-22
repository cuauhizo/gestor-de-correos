// backend/routes/sectionTemplateRoutes.js
const express = require('express')
const router = express.Router()
const { body } = require('express-validator') // <-- Importación
const sectionTemplateController = require('../controllers/sectionTemplateController')
const { protect, admin } = require('../middleware/authMiddleware')

// Reglas de validación reutilizables
const sectionValidationRules = [
  body('name').notEmpty().withMessage('El nombre de la sección es requerido.'),
  body('type_key').notEmpty().withMessage('La clave única es requerida.'),
  body('html_content').notEmpty().withMessage('El contenido HTML no puede estar vacío.'),
]

// Obtener la biblioteca es para todos los usuarios logueados
router.get('/', protect, sectionTemplateController.getAllSectionTemplates)

// Crear nuevas secciones es solo para administradores
router.post('/', protect, admin, sectionValidationRules, sectionTemplateController.createSectionTemplate)

// Rutas para actualizar y eliminar, solo para administradores
router.put('/:id', protect, admin, sectionValidationRules, sectionTemplateController.updateSectionTemplate)
router.delete('/:id', protect, admin, sectionTemplateController.deleteSectionTemplate)

module.exports = router
