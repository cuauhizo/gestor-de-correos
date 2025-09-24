// backend/controllers/sectionTemplateController.js
const sectionTemplateService = require('../services/sectionTemplateService')

exports.getAllSectionTemplates = async (req, res) => {
  try {
    const sections = await sectionTemplateService.findAll()
    res.json(sections)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las plantillas de sección.' })
  }
}

exports.createSectionTemplate = async (req, res) => {
  try {
    const { name, type_key, html_content } = req.body
    if (!name || !type_key || !html_content) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' })
    }
    const newSection = await sectionTemplateService.create({ name, type_key, html_content })
    res.status(201).json(newSection)
  } catch (error) {
    // Manejar error de clave duplicada
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'La clave de tipo (type_key) ya existe.' })
    }
    res.status(500).json({ message: 'Error al crear la plantilla de sección.' })
  }
}

exports.updateSectionTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { name, type_key, html_content } = req.body
    if (!name || !type_key || !html_content) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' })
    }
    const affectedRows = await sectionTemplateService.update(id, { name, type_key, html_content })
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Plantilla de sección no encontrada.' })
    }
    res.json({ message: 'Plantilla de sección actualizada exitosamente.' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'La clave de tipo (type_key) ya existe.' })
    }
    res.status(500).json({ message: 'Error al actualizar la plantilla de sección.' })
  }
}

exports.deleteSectionTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const affectedRows = await sectionTemplateService.deleteById(id)
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Plantilla de sección no encontrada.' })
    }
    res.json({ message: 'Plantilla de sección eliminada exitosamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la plantilla de sección.' })
  }
}
