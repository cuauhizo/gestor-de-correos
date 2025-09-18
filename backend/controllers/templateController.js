// backend/controllers/templateController.js
const templateService = require('../services/templateService')
const { validationResult } = require('express-validator')

// GET /api/templates
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates()
    res.json(templates)
  } catch (error) {
    console.error('Error al obtener lista de templates:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// GET /api/templates/:id
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params
    const template = await templateService.getTemplateById(id)
    if (!template) return res.status(404).json({ message: 'Template no encontrado.' })

    const placeholders = []
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
    let match
    while ((match = regex.exec(template.html_content)) !== null) {
      if (!placeholders.includes(match[1])) placeholders.push(match[1])
    }
    res.json({ html_content: template.html_content, placeholders })
  } catch (error) {
    console.error('Error al obtener template:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// POST /api/templates
exports.createTemplate = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const { name, html_content } = req.body
    const user_id = req.user.id
    await templateService.createTemplate(name, html_content, user_id)
    res.status(201).json({ message: 'Template creado exitosamente.' })
  } catch (error) {
    console.error('Error al crear template:', error)
    res.status(error.statusCode || 500).json({ message: error.message || 'Error interno del servidor.' })
  }
}

// PUT /api/templates/:id
exports.updateTemplate = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const { id } = req.params
    const { name, html_content } = req.body
    const affectedRows = await templateService.updateTemplate(id, name, html_content)

    if (affectedRows === 0) return res.status(404).json({ message: 'Template no encontrado para actualizar.' })
    res.json({ message: 'Template actualizado exitosamente.' })
  } catch (error) {
    console.error('Error al actualizar template:', error)
    res.status(error.statusCode || 500).json({ message: error.message || 'Error interno del servidor.' })
  }
}

// DELETE /api/templates/:id
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const affectedRows = await templateService.deleteTemplate(id)
    if (affectedRows === 0) return res.status(404).json({ message: 'Template no encontrado para eliminar.' })
    res.json({ message: 'Template eliminado exitosamente.' })
  } catch (error) {
    console.error('Error al eliminar template:', error)
    res.status(500).json({ message: 'Error interno del servidor.' })
  }
}
