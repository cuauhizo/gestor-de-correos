<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 text-center mb-4">
        <h1>Editor de Contenido de Correo</h1>
      </div>
      <div class="col-12">
        <div v-if="editorStore.loading" class="row g-4">
          <div class="col-md-4">
            <div class="card p-3 h-100">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <SkeletonLoader width="60%" height="28px" />
                <SkeletonLoader width="25%" height="24px" radius="12px" />
              </div>
              <div class="d-flex justify-content-between mb-4">
                <SkeletonLoader width="40%" height="34px" radius="6px" />
                <SkeletonLoader width="25%" height="34px" radius="6px" />
              </div>

              <div v-for="i in 3" :key="'skel-sec-' + i" class="border rounded p-3 mb-3 bg-light">
                <div class="d-flex justify-content-between mb-3">
                  <SkeletonLoader width="50%" height="20px" />
                  <SkeletonLoader width="20%" height="20px" />
                </div>
                <SkeletonLoader width="100%" height="15px" class="mb-2 d-block" />
                <SkeletonLoader width="90%" height="15px" class="mb-2 d-block" />
                <SkeletonLoader width="95%" height="15px" class="d-block" />
              </div>
            </div>
          </div>

          <div class="col-md-8">
            <div class="card p-3 h-100">
              <SkeletonLoader width="50%" height="32px" class="mx-auto mb-4 d-block" />

              <div class="mx-auto mb-3 d-flex justify-content-center gap-2">
                <SkeletonLoader width="45px" height="35px" radius="6px" />
                <SkeletonLoader width="45px" height="35px" radius="6px" />
              </div>

              <SkeletonLoader width="100%" height="600px" radius="4px" />
            </div>
          </div>
        </div>

        <div v-else-if="editorStore.error" class="alert alert-danger text-center">{{ editorStore.error }}</div>

        <div v-else class="row g-4">
          <div class="col-md-4">
            <div class="card p-3 h-100">
              <div v-if="editorStore.isReadOnly" class="alert alert-warning">
                <i-iwwa:alert />
                Estás en modo de solo lectura. Otro usuario está editando este correo.
                <div class="text-end">
                  <button @click="handleForceUnlock" class="btn btn-sm btn-danger mt-2">Forzar Desbloqueo y Editar</button>
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
                  <draggable v-model="editorStore.editableContent.sections" item-key="id" handle=".drag-handle" @end="handleContentChange" ghost-class="ghost">
                    <template #item="{ element: section, index }">
                      <SectionEditor
                        :ref="
                          el => {
                            if (el) sectionEditorRefs[index] = el
                          }
                        "
                        :section="section"
                        @delete="deleteSection(section.id)" />
                    </template>
                  </draggable>
                </div>
              </fieldset>

              <!-- <div class="d-flex flex-wrap justify-content-center gap-1 mt-3">
                <button @click="handleCancel" class="btn btn-danger">Cancelar</button>
                <button @click="manualSaveChanges" :disabled="editorStore.isSaving" class="btn btn-primary">
                  {{ editorStore.isSaving ? 'Guardando...' : 'Guardar' }}
                </button>
                <button @click="copyHtmlToClipboard" class="btn btn-success">Copiar HTML</button>

                <button @click="sendTestEmail" :disabled="isSendingTest" class="btn btn-info text-white">
                  {{ isSendingTest ? 'Enviando...' : 'Enviar Prueba' }}
                </button>

                <button v-if="authStore.isAdmin" @click="copyShareLink" class="btn btn-secondary">Compartir Enlace</button>
              </div> -->

              <div class="sticky-action-bar mt-3 p-3 bg-white border-top shadow-sm rounded-bottom">
                <div class="d-flex flex-wrap justify-content-center gap-2">
                  <button @click="handleCancel" class="btn btn-outline-danger">Cancelar</button>
                  <button @click="manualSaveChanges" :disabled="editorStore.isSaving" class="btn btn-primary px-4">
                    <i-bi-save class="me-1" v-if="!editorStore.isSaving" />
                    {{ editorStore.isSaving ? 'Guardando...' : 'Guardar' }}
                  </button>
                  <button @click="sendTestEmail" :disabled="isSendingTest" class="btn btn-info text-white">
                    <i-bi-envelope-paper class="me-1" v-if="!isSendingTest" />
                    {{ isSendingTest ? 'Enviando...' : 'Enviar Prueba' }}
                  </button>
                </div>
                <div class="d-flex flex-wrap justify-content-center gap-2 mt-2">
                  <button @click="copyHtmlToClipboard" class="btn btn-sm btn-success">Copiar HTML</button>
                  <button v-if="authStore.isAdmin" @click="copyShareLink" class="btn btn-sm btn-secondary">Compartir Enlace</button>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-8">
            <div class="card p-3 h-100">
              <h3 v-if="editorStore.templateName" class="card-title text-center mb-3">
                Previsualización del Correo -
                <span class="fw-bold">{{ editorStore.templateName }}</span>
              </h3>
              <div class="mx-auto my-3 btn-group">
                <button @click="setPreviewWidth('100%')" :class="['btn', previewWidth === '100%' ? 'btn-primary' : 'btn-outline-secondary']">
                  <span>
                    <i-entypo:tv />
                  </span>
                </button>
                <button @click="setPreviewWidth('375px')" :class="['btn', previewWidth === '375px' ? 'btn-primary' : 'btn-outline-secondary']">
                  <span>
                    <i-entypo:mobile />
                  </span>
                </button>
              </div>
              <iframe
                ref="previewIframe"
                @load="handlePreviewLoad"
                :style="{ width: previewWidth, height: '2100px', border: '1px solid #ccc', 'background-color': '#f6f6f6', transition: 'width 0.3s ease' }"
                class="mx-auto border rounded shadow-sm"></iframe>
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
  import api from '../services/api'
  import SkeletonLoader from '../components/SkeletonLoader.vue' // <-- IMPORTACIÓN DEL SKELETON

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
  const previewWidth = ref('100%')

  const isSendingTest = ref(false)

  // --- Refs para el DOM y Timers ---
  const previewIframe = ref(null)
  let isPreviewReady = false
  let debouncePreviewTimer = null
  let autoSaveTimeoutId = null

  // --- Lógica del Componente ---

  const sendTestEmail = async () => {
    const emailDestino = prompt('Introduce el correo electrónico para recibir la prueba:')
    if (!emailDestino) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailDestino)) {
      feedbackStore.show('Por favor ingresa un correo electrónico válido.', 'error')
      return
    }

    isSendingTest.value = true
    try {
      const htmlContent = generateFinalHtml(true)

      await api.post(`/api/emails-editable/${uuid}/send-test`, {
        to: emailDestino,
        subject: `[Prueba] ${editorStore.templateName || 'Gestor de Correos'}`,
        html: htmlContent,
      })

      feedbackStore.show('¡Correo de prueba enviado exitosamente!', 'success')
    } catch (error) {
      console.error('Error al enviar la prueba:', error)
      feedbackStore.show(error.response?.data?.message || 'Hubo un error al enviar el correo de prueba.', 'error')
    } finally {
      isSendingTest.value = false
    }
  }

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

          // Lógica para imágenes
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
          handleInteraction(event)
          break
        }
        target = target.parentElement
      }
    })
  }

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
    }, 20000)
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

    let imageCounter = 0

    const finalHtmlSections = editorStore.editableContent.sections.map(section => {
      let sectionHtml = section.html || ''

      // Lógica de Imágenes: Reemplazamos cada <img> con la imagen que le corresponde en orden
      sectionHtml = sectionHtml.replace(/<img[^>]*>/g, imgTag => {
        const imageKey = allImageKeys[imageCounter]
        if (!imageKey) return imgTag

        // Verificamos que esta sección realmente CONTENGA esta clave de imagen
        if (!section.content.hasOwnProperty(imageKey)) return imgTag

        const rawContent = section.content[imageKey] || ''
        const newSrc = rawContent ? `src="${encodeURI(rawContent)}"` : 'src=""'

        let updatedTag = imgTag.replace(/src="[^"]*"/, newSrc)
        if (!forClipboard && authStore.isAdmin) {
          updatedTag = updatedTag.replace('<img', `<img data-editor-key="${section.id}-${imageKey}"`)
        }

        imageCounter++
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
                  style += ' ' + styleMatch[1]
                  existingAttrs = existingAttrs.replace(styleMatch[0], '')
                }
                return `<p${existingAttrs} style="${style}">`
              }

              return `<p style="${style}">`
            })

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
    const link = window.location.href

    navigator.clipboard
      .writeText(link)
      .then(() => {
        feedbackStore.show('¡Enlace de edición copiado al portapapeles!', 'success')
      })
      .catch(() => {
        feedbackStore.show('Error al copiar el enlace.', 'error')
      })
  }

  const deleteSection = sectionId => {
    const doDelete = () => {
      editorStore.editableContent.sections = editorStore.editableContent.sections.filter(s => s.id !== sectionId)
      handleContentChange()
    }

    modalStore.show({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.',
      onConfirm: doDelete,
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
    await editorStore.unlockEmail(uuid)
    router.push('/lista-correos')
  }

  const collapseAll = () => {
    sectionEditorRefs.value.forEach(comp => comp.setCollapsed(true))
  }

  const expandAll = () => {
    sectionEditorRefs.value.forEach(comp => comp.setCollapsed(false))
  }

  const setPreviewWidth = width => {
    previewWidth.value = width
  }

  watch(
    () => editorStore.editableContent.sections,
    (newSections, oldSections) => {
      updatePreviewContent()
    },
    { deep: true }
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
        img[data-editor-key] { cursor: pointer; box-shadow: inset 0 0 0 0 transparent; transition: box-shadow 0.2s; }
        img[data-editor-key]:hover { box-shadow: 0px 1px 4px 0px #0d6efd }
      `
        : ''
      const initialHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* RESET GLOBAL */
              body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Helvetica, Arial, sans-serif; }
              img { border: 0; outline: none; text-decoration: none; }
              table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
              
              /* ESTILOS DE EDICIÓN */
              span[data-editor-key] { cursor: pointer; display: contents; }
              ${isAdminStyles}

              /* TUS FUENTES CUSTOM */
              @font-face { font-family: "Nike Futura"; src: url("https://www.nike.com/assets/ncss/2.2/dotcom/fonts/nike-futura-extra-bold-v200.woff2") format("woff2"); }

              /* TUS MEDIA QUERIES */
              @media only screen and (max-width: 600px) {
                  .two-column { display: block !important; width: 100% !important; }
                  .column { width: 100% !important; display: block !important; padding: 16px 0 !important; }
                  .mobile-hidden { display: none !important; mso-hide: all; }
                  .w-100 { width: 100% !important; max-width: 100% !important; min-width: 100% !important; }
                  .img-fluid { width: 100% !important; height: auto !important; max-width: 100% !important; display: block; }
                  table[width="772"], table[style*="width: 772px"],
                  table[width="680"], table[style*="width: 680px"] { width: 100% !important; }
                  img { max-width: 100% !important; height: auto !important; }
              }
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
    if (!editorStore.isReadOnly) {
      if (editorStore.hasUnsavedChanges) {
        await editorStore.saveEmail(uuid)
      }
      await editorStore.unlockEmail(uuid)
    }
    editorStore.resetEditorState()
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

  .sortable-drag {
    cursor: grabbing;
    box-shadow:
      0 10px 15px -3px rgb(0 0 0 / 0.1),
      0 4px 6px -4px rgb(0 0 0 / 0.1);
    transform: scale(1.02);
    opacity: 0.9;
  }

  .sticky-action-bar {
    position: sticky;
    bottom: 0;
    z-index: 10;
    margin-left: -1rem; /* Ajustes para compensar el padding del card padre */
    margin-right: -1rem;
    margin-bottom: -1rem;
  }
</style>
