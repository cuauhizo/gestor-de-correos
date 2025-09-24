// backend/routes/sectionTemplateRoutes.js
const express = require('express')
const router = express.Router()
const sectionTemplateController = require('../controllers/sectionTemplateController')
const { protect, admin } = require('../middleware/authMiddleware')

// Obtener la biblioteca es para todos los usuarios logueados
router.get('/', protect, sectionTemplateController.getAllSectionTemplates)

// Crear nuevas secciones es solo para administradores
router.post('/', protect, admin, sectionTemplateController.createSectionTemplate)

// Rutas para actualizar y eliminar, solo para administradores
router.put('/:id', protect, admin, sectionTemplateController.updateSectionTemplate)
router.delete('/:id', protect, admin, sectionTemplateController.deleteSectionTemplate)

module.exports = router
