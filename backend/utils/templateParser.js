// backend/utils/templateParser.js
const { v4: uuidv4 } = require('uuid')
const { parse } = require('node-html-parser') // <-- IMPORTAMOS EL NUEVO PARSER

function parseTemplateHTML(htmlContent) {
  const sections = []
  let imageCounter = 0

  // 1. Parseamos el string de HTML en un árbol de DOM
  const root = parse(htmlContent)

  // 2. Buscamos TODOS los elementos que sean secciones
  const sectionElements = root.querySelectorAll('[data-section-type]')

  sectionElements.forEach(sectionNode => {
    // Solo procesamos las tablas que son hijas directas del cuerpo principal,
    // para ignorar las tablas anidadas.
    if (sectionNode.tagName === 'TABLE' && (sectionNode.parentNode.tagName === 'BODY' || sectionNode.parentNode.tagName === 'CENTER')) {
      const sectionType = sectionNode.getAttribute('data-section-type')
      const sectionHTML = sectionNode.outerHTML // Obtenemos el HTML completo de la sección
      const content = {}

      // 3. Extraer placeholders de texto
      const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
      let textMatch
      while ((textMatch = textRegex.exec(sectionHTML)) !== null) {
        content[textMatch[1].trim()] = ''
      }

      // 4. Extraer imágenes
      const images = sectionNode.querySelectorAll('img')
      images.forEach(() => {
        const imageKey = `image_${imageCounter}`
        content[imageKey] = ''
        imageCounter++
      })

      sections.push({
        id: uuidv4(),
        type: sectionType,
        html: sectionHTML,
        content: content,
      })
    }
  })

  return sections
}

module.exports = { parseTemplateHTML }
