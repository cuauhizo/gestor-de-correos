const sectionTemplateService = require('../services/sectionTemplateService')
const catchAsync = require('../utils/catchAsync')

exports.getAllSectionTemplates = catchAsync(async (req, res) => {
  const sections = await sectionTemplateService.findAll()
  res.json(sections)
})

exports.createSectionTemplate = catchAsync(async (req, res) => {
  const { name, type_key, html_content } = req.body

  if (!name || !type_key || !html_content) {
    const error = new Error('Todos los campos son requeridos.')
    error.statusCode = 400
    throw error
  }

  const newSection = await sectionTemplateService.create({ name, type_key, html_content })
  res.status(201).json(newSection)
})

exports.updateSectionTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const { name, type_key, html_content } = req.body

  if (!name || !type_key || !html_content) {
    const error = new Error('Todos los campos son requeridos.')
    error.statusCode = 400
    throw error
  }

  const affectedRows = await sectionTemplateService.update(id, { name, type_key, html_content })

  if (affectedRows === 0) {
    const error = new Error('Plantilla de sección no encontrada.')
    error.statusCode = 404
    throw error
  }

  res.json({ message: 'Plantilla de sección actualizada exitosamente.' })
})

exports.deleteSectionTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const affectedRows = await sectionTemplateService.deleteById(id)

  if (affectedRows === 0) {
    const error = new Error('Plantilla de sección no encontrada.')
    error.statusCode = 404
    throw error
  }

  res.json({ message: 'Plantilla de sección eliminada exitosamente.' })
})
