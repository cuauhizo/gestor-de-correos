// backend/utils/templateParser.js
const { v4: uuidv4 } = require('uuid')

// Esta función toma el HTML completo de un template y lo convierte en nuestro nuevo formato de secciones.
function parseTemplateHTML(htmlContent) {
  const sections = []
  // La expresión regular ahora captura el tag <table> completo
  const sectionRegex = /(<table[^>]*data-section-type="([^"]+)"[^>]*>[\s\S]*?<\/table>)/g
  let match
  let imageCounter = 0

  while ((match = sectionRegex.exec(htmlContent)) !== null) {
    const fullHtml = match[1] // HTML completo de la sección
    const sectionType = match[2] // ej: "noticia-texto-imagen"

    const content = {}
    const placeholders = new Set() // Usamos un Set para evitar duplicados

    // 1. Extraer placeholders de texto como {{variable}}
    const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
    let textMatch
    while ((textMatch = textRegex.exec(fullHtml)) !== null) {
      content[textMatch[1].trim()] = ''
    }
    const imgRegex = /<img[^>]*>/g
    while (imgRegex.exec(fullHtml) !== null) {
      content[`image_${imageCounter}`] = ''
      imageCounter++
    }

    sections.push({
      id: uuidv4(),
      type: sectionType,
      html: fullHtml, // <-- Guardamos el HTML crudo
      content: content,
    })
  }

  return sections
}

module.exports = { parseTemplateHTML }
