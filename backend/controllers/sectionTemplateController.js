const sectionTemplateService = require('../services/sectionTemplateService')
const catchAsync = require('../utils/catchAsync')
const { validationResult } = require('express-validator')

exports.getAllSectionTemplates = catchAsync(async (req, res) => {
  const sections = await sectionTemplateService.findAll(req.user)
  res.json(sections)
})

exports.createSectionTemplate = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }

  const { name, type_key, html_content } = req.body

  const newSection = await sectionTemplateService.create({ name, type_key, html_content })
  res.status(201).json({ success: true, message: 'Plantilla de sección creada exitosamente.', data: newSection })
})

exports.updateSectionTemplate = catchAsync(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }

  const { id } = req.params
  const { name, type_key, html_content } = req.body

  const affectedRows = await sectionTemplateService.update(id, { name, type_key, html_content })

  if (affectedRows === 0) {
    const error = new Error('Plantilla de sección no encontrada.')
    error.statusCode = 404
    throw error
  }

  res.json({ success: true, message: 'Plantilla de sección actualizada exitosamente.' })
})

exports.deleteSectionTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const affectedRows = await sectionTemplateService.deleteById(id)

  if (affectedRows === 0) {
    const error = new Error('Plantilla de sección no encontrada.')
    error.statusCode = 404
    throw error
  }

  res.json({ success: true, message: 'Plantilla de sección eliminada exitosamente.' })
})
