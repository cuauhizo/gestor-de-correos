<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 text-center mb-4">
        <h1>Editor de Contenido de Correo</h1>
      </div>
      <div class="col-12">
        <div v-if="editorStore.loading" class="text-center text-secondary">Cargando correo...</div>
        <div v-if="editorStore.error" class="alert alert-danger text-center">{{ editorStore.error }}</div>

        <div v-if="!editorStore.loading && !editorStore.error" class="row g-4">
          <div class="col-md-4">
            <div class="card p-3 h-100">
              <div v-if="editorStore.isReadOnly" class="alert alert-warning">
                <i-iwwa:alert />
                Estás en modo de solo lectura. Otro usuario está editando este correo.
                <div class="text-end">
                  <button @click="handleForceUnlock" class="btn btn-sm btn-danger mt-2">Forzar Desbloqueo y
                    Editar</button>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h3 class="card-title text-center mb-0">Contenido Editable</h3>
                <span :class="['badge', editorStore.autoSaveStatus.class]">{{ editorStore.autoSaveStatus.text }}</span>
              </div>
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <button @click="isAddModalVisible = true" class="btn btn-outline-primary">
                    <i-entypo:add-to-list />
                    Añadir Sección
                  </button>
                  <div class="btn-group btn-group-sm">
                    <button @click="collapseAll" class="btn btn-outline-secondary" title="Colapsar todo">
                      <i-bi-arrows-collapse />
                    </button>
                    <button @click="expandAll" class="btn btn-outline-secondary" title="Expandir todo">
                      <i-bi-arrows-expand />
                    </button>
                  </div>
                </div>
                <AddSectionModal :is-visible="isAddModalVisible" @close="isAddModalVisible = false" />
              </div>
              <fieldset :disabled="editorStore.isReadOnly">
                <div class="scroll">
                  <draggable v-model="editorStore.editableContent.sections" item-key="id" handle=".drag-handle"
                    @end="handleContentChange" ghost-class="ghost">
                    <template #item="{ element: section, index }">
                      <SectionEditor :ref="el => {
                        if (el) sectionEditorRefs[index] = el
                      }
                        " :section="section" @delete="deleteSection(section.id)" />
                    </template>
                  </draggable>
                </div>
              </fieldset>
              <div class="d-flex flex-wrap justify-content-center gap-1 mt-3">
                <button @click="handleCancel" class="btn btn-danger">Cancelar</button>
                <button @click="manualSaveChanges" :disabled="editorStore.isSaving" class="btn btn-primary">
                  {{ editorStore.isSaving ? 'Guardando...' : 'Guardar' }}
                </button>
                <button @click="copyHtmlToClipboard" class="btn btn-success">Copiar HTML</button>
                <button v-if="authStore.isAdmin" @click="copyShareLink" class="btn btn-secondary">Compartir
                  Enlace</button>
              </div>
            </div>
          </div>
          <div class="col-md-8">
            <div class="card p-3 h-100">
              <h3 v-if="editorStore.templateName" class="card-title text-center mb-3">
                Previsualización del Correo -
                <span class="fw-bold">{{ editorStore.templateName }}</span>
              </h3>
              <iframe ref="previewIframe" @load="handlePreviewLoad"
                :style="{ height: '2100px', border: '1px solid #ccc', 'background-color': '#f6f6f6' }"
                class="w-100 border rounded shadow-sm"></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditorStore } from '../stores/editorStore.js'
import { useAuthStore } from '../stores/auth.js'
import { useFeedbackStore } from '../stores/feedbackStore.js'
import { useModalStore } from '../stores/modalStore.js'
import draggable from 'vuedraggable'
import SectionEditor from '../components/SectionEditor.vue'
import { getPlainTextFromHtml } from '../utils/helpers.js'
import AddSectionModal from '../components/AddSectionModal.vue'

// --- Instancias ---
const route = useRoute()
const router = useRouter()
const editorStore = useEditorStore()
const authStore = useAuthStore()
const feedbackStore = useFeedbackStore()
const uuid = route.params.uuid
const isAddModalVisible = ref(false)
const sectionEditorRefs = ref([])
const modalStore = useModalStore()

// --- Refs para el DOM y Timers ---
const previewIframe = ref(null)
let isPreviewReady = false
let debouncePreviewTimer = null
let autoSaveTimeoutId = null

// --- Lógica del Componente ---
const manualSaveChanges = async () => {
  clearTimeout(autoSaveTimeoutId)
  const wasSuccessful = await editorStore.saveEmail(uuid)

  if (wasSuccessful) {
    // Usa la acción del store:
    feedbackStore.show('Cambios guardados exitosamente!', 'success')
  } else {
    feedbackStore.show('No se pudieron guardar los cambios.', 'error')
  }

  scheduleNextAutoSave()
}

const handlePreviewLoad = () => {
  isPreviewReady = true
  updatePreviewContent()
  const iframeDoc = previewIframe.value.contentWindow.document
  if (!iframeDoc) return

  const handleInteraction = event => {
    let target = event.target
    while (target && target !== iframeDoc.body) {
      const keyData = target.getAttribute('data-editor-key')
      if (keyData) {
        const keyParts = keyData.split('-')
        const contentKey = keyParts.pop()
        const sectionId = keyParts.join('-')

        if (!sectionId || !contentKey) return

        // Lógica para imágenes (sin cambios)
        if (target.tagName === 'IMG' && authStore.isAdmin) {
          event.preventDefault()
          const section = editorStore.editableContent.sections.find(s => s.id === sectionId)
          if (section) {
            const currentUrl = section.content[contentKey] || ''
            const newUrl = prompt('Introduce la nueva URL de la imagen:', currentUrl)
            if (newUrl !== null && newUrl !== currentUrl) {
              // Llamamos a la acción del store para asegurar reactividad
              editorStore.updateSectionContent(sectionId, contentKey, newUrl)
            }
          }
        } else if (target.tagName !== 'IMG' && event.type === 'dblclick') {
          // 1. Buscamos la referencia al componente de forma segura
          const sectionComponent = sectionEditorRefs.value.find(comp => comp && comp.section && comp.section.id === sectionId)

          // 2. Si la encontramos, le decimos que se expanda
          if (sectionComponent) {
            sectionComponent.setCollapsed(false)
          }

          // 3. Esperamos a que Vue actualice el DOM (la sección ya está visible)
          nextTick(() => {
            // 4. Luego, llamamos a focusEditor
            focusEditor(sectionId, contentKey)
          })
        }
        break
      }
      target = target.parentElement
    }
  }

  // Escuchamos solo dblclick para la acción de enfocar/expandir texto
  iframeDoc.addEventListener('dblclick', handleInteraction)
  // Mantenemos el click simple solo para las imágenes
  iframeDoc.addEventListener('click', event => {
    let target = event.target
    while (target && target !== iframeDoc.body) {
      const keyData = target.getAttribute('data-editor-key')
      if (keyData && target.tagName === 'IMG' && authStore.isAdmin) {
        handleInteraction(event) // Reutilizamos la lógica si es una imagen
        break
      }
      target = target.parentElement
    }
  })
}

// Asegúrate de que tu función focusEditor también esté presente
const focusEditor = (sectionId, contentKey) => {
  const combinedKey = `${sectionId}-${contentKey}`
  const wrapper = document.querySelector(`[data-editor-wrapper-key="${combinedKey}"]`)
  if (wrapper) {
    const inputElement = wrapper.querySelector('input, textarea, .ProseMirror')
    if (inputElement) {
      inputElement.focus()
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

const updatePreviewContent = () => {
  if (!isPreviewReady || !previewIframe.value) return
  const finalHtml = generateFinalHtml()
  previewIframe.value.contentWindow.document.body.innerHTML = `
    <center>
      <div style="max-width: 772px; margin: 30px auto; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ${finalHtml}
      </div>
    </center>
      `
}

const debouncedUpdatePreview = () => {
  clearTimeout(debouncePreviewTimer)
  debouncePreviewTimer = setTimeout(updatePreviewContent, 200)
}

const handleContentChange = () => {
  if (!editorStore.hasUnsavedChanges) {
    // CORRECCIÓN: Eliminar el 'editorStore' duplicado
    editorStore.autoSaveStatus.text = 'Cambios sin guardar'
    editorStore.autoSaveStatus.class = 'bg-warning'
  }
  editorStore.hasUnsavedChanges = true
  debouncedUpdatePreview()
}

const scheduleNextAutoSave = () => {
  clearTimeout(autoSaveTimeoutId)
  autoSaveTimeoutId = setTimeout(async () => {
    if (editorStore.hasUnsavedChanges) {
      await editorStore.saveEmail(uuid)
    }
    scheduleNextAutoSave()
  }, 20000) // 20 segundos
}

const copyHtmlToClipboard = () => {
  const textToCopy = generateFinalHtml(true)
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => feedbackStore.show('HTML copiado al portapapeles!', 'success'))
    .catch(() => feedbackStore.show('Error al copiar HTML.', 'error'))
}

const generateFinalHtml = (forClipboard = false) => {
  if (!editorStore.editableContent || !Array.isArray(editorStore.editableContent.sections)) {
    return ''
  }

  // Obtenemos una lista ordenada de TODAS las claves de imagen de todo el correo
  const allImageKeys = editorStore.editableContent.sections.flatMap(section => Object.keys(section.content).filter(key => key.startsWith('image_')))

  let imageCounter = 0 // Un contador para llevar la cuenta de qué imagen nos toca

  const finalHtmlSections = editorStore.editableContent.sections.map(section => {
    let sectionHtml = section.html || ''

    // Lógica de Imágenes: Reemplazamos cada <img> con la imagen que le corresponde en orden
    sectionHtml = sectionHtml.replace(/<img[^>]*>/g, imgTag => {
      const imageKey = allImageKeys[imageCounter]
      if (!imageKey) return imgTag // Si no hay más claves de imagen (poco probable), no hagas nada

      // Verificamos que esta sección realmente CONTENGA esta clave de imagen
      if (!section.content.hasOwnProperty(imageKey)) return imgTag

      const rawContent = section.content[imageKey] || ''
      const newSrc = rawContent ? `src="${encodeURI(rawContent)}"` : 'src=""'

      let updatedTag = imgTag.replace(/src="[^"]*"/, newSrc)
      if (!forClipboard && authStore.isAdmin) {
        updatedTag = updatedTag.replace('<img', `<img data-editor-key="${section.id}-${imageKey}"`)
      }

      imageCounter++ // Incrementamos el contador para la SIGUIENTE imagen del correo
      return updatedTag
    })

    // Lógica de Texto y Enlaces (sin cambios)
    for (const key in section.content) {
      if (!key.startsWith('image_')) {
        const rawContent = section.content[key] || ''
        const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        if (key.includes('enlace') || key.endsWith('_url') || key === 'url') {
          sectionHtml = sectionHtml.replace(new RegExp(`href="{{\\s*${key}\\s*}}"`, 'g'), `href="${encodeURI(rawContent)}"`)
        } else {
          const plainText = getPlainTextFromHtml(rawContent)

          // --- INICIO DE LA CORRECCIÓN ---
          // Esta regex busca <p> o <p con_atributos>
          const styledHtmlContent = rawContent.replace(/<p( [^>]*)?>/g, (match, existingAttrs) => {
            let style = 'margin: 0;'

            // Si existingAttrs existe (ej: ' style="text-align: center;"')
            if (existingAttrs) {
              const styleMatch = existingAttrs.match(/style="([^"]*)"/)
              if (styleMatch && styleMatch[1]) {
                // Si ya hay un 'style', lo combinamos
                style += ' ' + styleMatch[1] // ej: "margin: 0; text-align: center;"
                // Quitamos el style viejo para reemplazarlo
                existingAttrs = existingAttrs.replace(styleMatch[0], '')
              }
              // Devolvemos el tag <p con los atributos que no eran 'style' y el nuevo 'style' combinado
              return `<p${existingAttrs} style="${style}">`
            }

            // Si era un <p> simple, solo añadimos el style
            return `<p style="${style}">`
          })
          // --- FIN DE LA CORRECCIÓN ---

          sectionHtml = sectionHtml.replace(new RegExp(`(alt="[^"]*){{\\s*${key}\\s*}}([^"]*")`, 'g'), `$1${plainText}$2`)
          const replacement = forClipboard ? styledHtmlContent : `<span data-editor-key="${section.id}-${key}">${styledHtmlContent}</span>`
          sectionHtml = sectionHtml.replace(placeholderRegex, replacement)
        }
      }
    }

    return sectionHtml
  })

  const joinedHtml = finalHtmlSections.join('\n')

  return `<center>\n${joinedHtml}\n</center>`
}

const copyShareLink = () => {
  // Obtenemos la URL actual de la ventana del navegador
  const link = window.location.href

  // Usamos la API del portapapeles para copiar el enlace
  navigator.clipboard
    .writeText(link)
    .then(() => {
      // Notificamos al usuario que se copió con éxito
      feedbackStore.show('¡Enlace de edición copiado al portapapeles!', 'success')
    })
    .catch(() => {
      feedbackStore.show('Error al copiar el enlace.', 'error')
    })
}

const deleteSection = sectionId => {
  // Esta es la lógica que queremos ejecutar SÓLO si el usuario confirma
  const doDelete = () => {
    editorStore.editableContent.sections = editorStore.editableContent.sections.filter(s => s.id !== sectionId)
    handleContentChange()
  }

  // En lugar de borrar, ahora mostramos el modal
  modalStore.show({
    title: 'Confirmar Eliminación',
    message: '¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.',
    onConfirm: doDelete // Llama a nuestra lógica de borrado si se da clic en "Aceptar"
  })
}


const handleForceUnlock = async () => {
  const result = await editorStore.forceUnlockAndReload(uuid)
  if (result.success) {
    feedbackStore.show(result.message, 'success')
  } else {
    feedbackStore.show(result.message, 'error')
  }
}

const handleCancel = async () => {
  // 1. Llama explícitamente a la función de desbloqueo del store
  await editorStore.unlockEmail(uuid)
  // 2. Una vez que se ha desbloqueado, redirige al usuario
  router.push('/lista-correos')
}

const collapseAll = () => {
  sectionEditorRefs.value.forEach(comp => comp.setCollapsed(true))
}

const expandAll = () => {
  sectionEditorRefs.value.forEach(comp => comp.setCollapsed(false))
}

// --- Ciclo de Vida ---
watch(
  () => editorStore.editableContent.sections,
  (newSections, oldSections) => {
    // Cuando el array de secciones cambie, actualizamos la vista previa.
    updatePreviewContent()
  },
  { deep: true }, // 'deep: true' es crucial para detectar cambios dentro de los objetos del array.
)

onMounted(async () => {
  editorStore.resetEditorState()
  const result = await editorStore.loadAndLockEmail(uuid)

  if (!result.success) {
    if (result.isLockedError) {
      feedbackStore.show(editorStore.error, 'error')
      router.push('/lista-correos')
    }
    return
  }

  nextTick(() => {
    const isAdminStyles = authStore.isAdmin
      ? `
        img[data-editor-key] { cursor: pointer; border: 2px dashed transparent; transition: border-color 0.2s; }
        img[data-editor-key]:hover { border-color: #0d6efd; }
      `
      : ''
    const initialHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
              span[data-editor-key] { cursor: pointer; display: contents; }
              ${isAdminStyles}
            </style>
          </head>
          <body></body>
        </html>
      `
    previewIframe.value.srcdoc = initialHtml
    scheduleNextAutoSave()
  })
})

onBeforeUnmount(async () => {
  clearTimeout(autoSaveTimeoutId)
  // Solo guardamos y desbloqueamos si NO estábamos en modo de solo lectura
  if (!editorStore.isReadOnly) {
    if (editorStore.hasUnsavedChanges) {
      await editorStore.saveEmail(uuid)
    }
    await editorStore.unlockEmail(uuid)
  }
  editorStore.resetEditorState()
})

const renderedHtml = computed(() => {
  let currentHtml = editorStore.currentTemplateHtml

  // Asegúrate de que el editorStore.editableContent y editorStore.currentTemplateHtml no sean nulos
  if (!editorStore.editableContent || !currentHtml) {
    return ''
  }

  const sectionsContent = editorStore.editableContent.sections.reduce((acc, section) => {
    return { ...acc, ...section.content }
  }, {})

  // Esta expresión regular ahora busca tanto placeholders en el contenido como en atributos con data-editor-attribute
  // El nuevo patrón para atributos es (data-editor-attribute="([^"]+)"\s*[^>]*?\s*)?(\w+)="{{\s*([a-zA-Z0-9_]+)\s*}}"
  const replaceRegex = /(data-editor-key="([^"]+)"[^>]*?)?<([^>]+)>(.*?){{\s*([a-zA-Z0-9_]+)\s*}}(.*?)</g
  // O si quieres algo más específico para atributos:
  const attributeReplaceRegex = /(data-editor-attribute="([^"]+)")([^>]*?)(\w+)="{{\s*([a-zA-Z0-9_]+)\s*}}"/g

  // 1. Reemplazar placeholders en atributos (como href)
  currentHtml = currentHtml.replace(attributeReplaceRegex, (match, dataAttrPart, attrKey, restOfTag, attributeName, placeholderKey) => {
    const replacementValue = sectionsContent[placeholderKey] || ''
    // Reconstruimos el atributo: data-editor-attribute="href" href="VALOR_NUEVO"
    return `${dataAttrPart}${restOfTag}${attributeName}="${replacementValue}"`
  })

  // 2. Reemplazar placeholders de texto y atributos data-editor-key (para imágenes)
  currentHtml = currentHtml.replace(/({{\s*([a-zA-Z0-9_]+)\s*}})|(data-editor-key="([^"]+)"[^>]+src="([^"]+)")/g, (match, placeholderMatch, placeholderKey, imgMatch, imgDataKey, imgSrc) => {
    if (placeholderKey) {
      // Es un placeholder de texto
      return sectionsContent[placeholderKey] || ''
    } else if (imgDataKey && imgSrc) {
      // Es una imagen con data-editor-key
      const replacementSrc = sectionsContent[imgDataKey] || imgSrc // Usa el src del contenido editable o el original
      return `data-editor-key="${imgDataKey}" src="${replacementSrc}"` // Reconstruye el atributo src
    }
    return match // Si no es ninguno, devuelve el match original
  })

  return currentHtml
})
</script>

<style scoped>
.scroll {
  max-height: 2100px;
  overflow-y: auto;
  padding-right: 10px;
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb;
  border: 1px dashed #0d6efd;
}

/* Estilo para el elemento que está siendo arrastrado */
.sortable-drag {
  cursor: grabbing;
  /* Cambia el cursor para indicar que estás arrastrando */
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  transform: scale(1.02);
  opacity: 0.9;
}
</style>
