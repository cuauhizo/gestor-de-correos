const templateService = require('../services/templateService')
const { validationResult } = require('express-validator')
const { parseTemplateHTML } = require('../utils/templateParser')
const catchAsync = require('../utils/catchAsync')

// GET /api/templates
exports.getAllTemplates = catchAsync(async (req, res) => {
  const templates = await templateService.getAllTemplates()
  res.json(templates)
})

// GET /api/templates/:id
exports.getTemplateById = catchAsync(async (req, res) => {
  const { id } = req.params
  const template = await templateService.getTemplateById(id)

  if (!template) {
    const error = new Error('Template no encontrado.')
    error.statusCode = 404
    throw error
  }

  const placeholders = []
  const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
  let match
  while ((match = regex.exec(template.html_content)) !== null) {
    if (!placeholders.includes(match[1])) placeholders.push(match[1])
  }
  res.json({ html_content: template.html_content, placeholders })
})

// POST /api/templates
exports.createTemplate = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { name, html_content } = req.body
  const user_id = req.user.id

  await templateService.createTemplate(name, html_content, user_id)
  res.status(201).json({ message: 'Template creado exitosamente.' })
})

// PUT /api/templates/:id
exports.updateTemplate = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { id } = req.params
  const { name, html_content } = req.body

  const affectedRows = await templateService.updateTemplate(id, name, html_content)
  if (affectedRows === 0) {
    const error = new Error('Template no encontrado para actualizar.')
    error.statusCode = 404
    throw error
  }
  res.json({ message: 'Template actualizado exitosamente.' })
})

// DELETE /api/templates/:id
exports.deleteTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const affectedRows = await templateService.deleteTemplate(id)

  if (affectedRows === 0) {
    const error = new Error('Template no encontrado para eliminar.')
    error.statusCode = 404
    throw error
  }
  res.json({ message: 'Template eliminado exitosamente.' })
})

// GET /api/templates/library/:id
exports.getTemplateLibrary = catchAsync(async (req, res) => {
  const { id } = req.params
  const template = await templateService.getTemplateById(id)

  if (!template) {
    const error = new Error('Template no encontrado.')
    error.statusCode = 404
    throw error
  }

  const librarySections = parseTemplateHTML(template.html_content)

  const library = librarySections.map(sec => ({
    type: sec.type,
    html: sec.html,
    content: sec.content,
  }))

  res.json(library)
})
