// frontend/src/stores/sectionTemplateStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from '../services/api'

export const useSectionTemplateStore = defineStore('sectionTemplates', () => {
  const sections = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchSectionTemplates() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/section-templates')
      sections.value = response.data
    } catch (err) {
      error.value = 'No se pudieron cargar las plantillas de sección.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  async function createSectionTemplate(sectionData) {
    try {
      const response = await axios.post('/api/section-templates', sectionData)
      await fetchSectionTemplates() // Recargar la lista
      return { success: true, message: 'Plantilla de sección creada exitosamente.' }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al crear la plantilla.' }
    }
  }

  async function updateSectionTemplate(id, sectionData) {
    try {
      const response = await axios.put(`/api/section-templates/${id}`, sectionData)
      await fetchSectionTemplates() // Recargar
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al actualizar.' }
    }
  }

  async function deleteSectionTemplate(id) {
    try {
      const response = await axios.delete(`/api/section-templates/${id}`)
      sections.value = sections.value.filter(s => s.id !== id)
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al eliminar.' }
    }
  }

  return {
    sections,
    loading,
    error,
    fetchSectionTemplates,
    createSectionTemplate,
    updateSectionTemplate,
    deleteSectionTemplate,
  }
})
