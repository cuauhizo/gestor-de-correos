// frontend/src/utils/htmlParser.js
import { EDITOR_DEFAULTS } from './constants'

/**
 * Analiza el HTML de una nueva sección y genera el objeto 'content' inicial.
 */
export const parseNewSectionContent = (sectionHTML, currentGlobalImgIndex) => {
  const newContent = {}
  let addedImagesCount = 0

  // 1. Parsear atributos editables (ej: data-editor-attribute="href")
  const attributeRegex = /data-editor-attribute="[^"]+"\s*[^>]*?\s*\w+="{{\s*([a-zA-Z0-9_]+)\s*}}"/g
  let attributeMatch
  while ((attributeMatch = attributeRegex.exec(sectionHTML)) !== null) {
    newContent[attributeMatch[1]] = EDITOR_DEFAULTS.PLACEHOLDER_URL
  }

  // 2. Parsear placeholders de texto
  const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
  let textMatch
  while ((textMatch = textRegex.exec(sectionHTML)) !== null) {
    const key = textMatch[1].trim()
    if (newContent[key] === undefined) {
      if (key.toLowerCase().includes('enlace') || key.toLowerCase().endsWith('_url')) {
        newContent[key] = EDITOR_DEFAULTS.PLACEHOLDER_URL
      } else if (key.toLowerCase().includes('titulo')) {
        newContent[key] = EDITOR_DEFAULTS.LOREM_IPSUM_TITLE
      } else {
        newContent[key] = EDITOR_DEFAULTS.LOREM_IPSUM_PARAGRAPH
      }
    }
  }

  // 3. Parsear imágenes
  const imgRegex = /<img[^>]*>/g
  const imagesInThisSection = sectionHTML.match(imgRegex) || []
  imagesInThisSection.forEach(() => {
    newContent[`image_${currentGlobalImgIndex + addedImagesCount}`] = EDITOR_DEFAULTS.PLACEHOLDER_IMG_URL
    addedImagesCount++
  })

  return { newContent, addedImagesCount }
}

/**
 * Sincroniza el contenido tras editar el HTML manualmente en modo avanzado.
 */
export const syncSectionContentWithHtml = (newHtml, oldContent) => {
  const newContentKeys = {}
  const textRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g
  let textMatch

  while ((textMatch = textRegex.exec(newHtml)) !== null) {
    newContentKeys[textMatch[1].trim()] = ''
  }

  const newContent = {}
  for (const key in newContentKeys) {
    if (oldContent.hasOwnProperty(key)) {
      newContent[key] = oldContent[key]
    } else {
      newContent[key] = '<p>Nuevo Campo...</p>'
    }
  }

  // Mantener las imágenes intactas
  for (const key in oldContent) {
    if (key.startsWith('image_')) {
      newContent[key] = oldContent[key]
    }
  }

  return newContent
}
