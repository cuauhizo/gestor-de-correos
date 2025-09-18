<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 text-center mb-4">
        <h1>Editor de Contenido de Correo</h1>
        <h2 v-if="editorStore.templateName" class="h4 text-muted fw-normal">
          Editando Template:
          <span class="fw-bold">{{ editorStore.templateName }}</span>
        </h2>
      </div>
      <div class="col-12">
        <div v-if="editorStore.loading" class="text-center text-secondary">Cargando correo...</div>
        <div v-if="editorStore.error" class="alert alert-danger text-center">{{ editorStore.error }}</div>

        <div v-if="!editorStore.loading && !editorStore.error" class="row g-4">
          <div class="col-md-4">
            <div class="card p-3 h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="card-title text-center mb-0">Contenido Editable</h3>
                <span :class="['badge', editorStore.autoSaveStatus.class]">{{ editorStore.autoSaveStatus.text }}</span>
              </div>
              <div class="scroll">
                <div v-for="(value, key) in visibleEditableContent" :key="key" class="mb-3" :data-editor-wrapper-key="key">
                  <label :for="key" class="form-label fw-bold">{{ capitalizeFirstLetter(key.replace(/_/g, ' ')) }}:</label>
                  <template v-if="key.includes('enlace_')">
                    <input :id="key" :value="editorStore.editableContent[key]" @input="handleLinkInput(key, $event)" type="url" class="form-control" />
                  </template>
                  <template v-else>
                    <TiptapEditor :modelValue="value" @update:modelValue="newValue => handleTiptapUpdate(key, newValue)" />
                  </template>
                </div>
              </div>
              <div class="d-flex flex-wrap justify-content-center gap-2 mt-3">
                <router-link to="/lista-correos" class="btn btn-danger">Cancelar</router-link>
                <button @click="manualSaveChanges" :disabled="editorStore.isSaving" class="btn btn-primary">
                  {{ editorStore.isSaving ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
                <button @click="copyHtmlToClipboard" class="btn btn-success">Copiar HTML Final</button>
              </div>
            </div>
          </div>
          <div class="col-md-8">
            <div class="card p-3 h-100">
              <h3 v-if="editorStore.templateName" class="card-title text-center mb-3">
                Previsualización del Correo -
                <span class="fw-bold">{{ editorStore.templateName }}</span>
              </h3>
              <iframe ref="previewIframe" @load="handlePreviewLoad" :style="{ height: '2100px', border: '1px solid #ccc', 'background-color': '#f6f6f6' }" class="w-100 border rounded shadow-sm"></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, computed, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useEditorStore } from '../stores/editorStore.js'
  import { useAuthStore } from '../stores/auth.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import TiptapEditor from '../components/TiptapEditor.vue'
  import { capitalizeFirstLetter, getPlainTextFromHtml, isValidUrl } from '../utils/helpers.js'

  // --- Instancias ---
  const route = useRoute()
  const router = useRouter()
  const editorStore = useEditorStore()
  const authStore = useAuthStore()
  const feedbackStore = useFeedbackStore()
  const uuid = route.params.uuid

  // --- Refs para el DOM y Timers ---
  const previewIframe = ref(null)
  let isPreviewReady = false
  let debouncePreviewTimer = null
  let autoSaveTimeoutId = null

  // --- Lógica del Componente ---
  const visibleEditableContent = computed(() => {
    const filtered = {}
    for (const key in editorStore.editableContent) {
      if (!key.startsWith('image_')) {
        filtered[key] = editorStore.editableContent[key]
      }
    }
    return filtered
  })

  const handleLinkInput = (key, event) => {
    editorStore.editableContent[key] = event.target.value
    handleContentChange()
  }

  const handleTiptapUpdate = (key, newValue) => {
    editorStore.editableContent[key] = newValue
    handleContentChange()
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
    if (iframeDoc) {
      iframeDoc.addEventListener('dblclick', event => {
        let target = event.target
        while (target && target !== iframeDoc.body) {
          if (target.dataset && target.dataset.editorKey) {
            focusEditor(target.dataset.editorKey)
            break
          }
          target = target.parentElement
        }
      })

      if (authStore.isAdmin) {
        iframeDoc.addEventListener('click', event => {
          const target = event.target
          if (target.tagName === 'IMG' && target.dataset.editorKey) {
            event.preventDefault()
            const key = target.dataset.editorKey
            // CORRECCIÓN: Leer el valor actual desde el store
            const currentUrl = editorStore.editableContent[key] || ''
            const newUrl = prompt('Introduce la nueva URL de la imagen:', currentUrl)
            if (newUrl !== null && newUrl !== currentUrl) {
              // CORRECCIÓN: Actualizar el valor en el store
              editorStore.editableContent[key] = newUrl
              handleContentChange()
            }
          }
        })
      }
    }
  }

  const focusEditor = key => {
    if (!key) return
    const wrapper = document.querySelector(`[data-editor-wrapper-key="${key}"]`)
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
      <div style="max-width: 772px; margin: 30px auto; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ${finalHtml}
      </div>
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
    }, 10000) // 10 segundos
  }

  const copyHtmlToClipboard = () => {
    const textToCopy = generateFinalHtml(true)
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showFeedback.show('HTML copiado al portapapeles!', 'success'))
      .catch(() => showFeedback.show('Error al copiar HTML.', 'error'))
  }

  const generateFinalHtml = (forClipboard = false) => {
    // CORRECCIÓN: Leer el templateHtml y editableContent desde el store
    let finalHtml = editorStore.templateHtml
    let imgIndex = 0
    finalHtml = finalHtml.replace(/<img[^>]*>/g, match => {
      const key = `image_${imgIndex}`
      const newSrc = editorStore.editableContent[key] ? `src="${encodeURI(editorStore.editableContent[key])}"` : 'src=""'
      let newTag = match.replace(/src="[^"]*"/, newSrc)
      if (!forClipboard && authStore.isAdmin) {
        newTag = newTag.replace('<img', `<img data-editor-key="${key}"`)
      }
      imgIndex++
      return newTag
    })
    for (const key in editorStore.editableContent) {
      if (!key.startsWith('image_')) {
        const rawContent = editorStore.editableContent[key] || ''
        const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        if (key.includes('enlace_')) {
          finalHtml = finalHtml.replace(placeholderRegex, encodeURI(rawContent))
        } else {
          const plainText = getPlainTextFromHtml(rawContent)
          const styledHtml = rawContent.replace(/<p/g, '<p style="margin: 0;"')
          finalHtml = finalHtml.replace(new RegExp(`(alt="[^"]*){{\\s*${key}\\s*}}([^"]*")`, 'g'), `$1${plainText}$2`)
          const replacement = forClipboard ? styledHtml : `<span data-editor-key="${key}">${styledHtml}</span>`
          finalHtml = finalHtml.replace(placeholderRegex, replacement)
        }
      }
    }
    return finalHtml
  }

  // --- Ciclo de Vida ---
  onMounted(async () => {
    editorStore.resetEditorState()
    const result = await editorStore.loadAndLockEmail(uuid)

    if (!result.success) {
      if (result.isLockedError) {
        showFeedback.show(editorStore.error, 'error')
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
    if (editorStore.hasUnsavedChanges) {
      await editorStore.saveEmail(uuid)
    }
    await editorStore.unlockEmail(uuid)
    editorStore.resetEditorState()
  })
</script>

<style scoped>
  .scroll {
    max-height: 2100px;
    overflow-y: auto;
    padding-right: 10px;
  }
</style>
