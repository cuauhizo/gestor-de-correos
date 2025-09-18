// frontend/src/stores/templateStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from '../services/api'

export const useTemplateStore = defineStore('templates', () => {
  // --- State ---
  const templates = ref([])
  const loading = ref(false)
  const error = ref(null)

  // --- Actions ---
  async function fetchTemplates() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/templates')
      templates.value = response.data
    } catch (err) {
      console.error('Error al cargar templates:', err)
      error.value = 'No se pudieron cargar los templates.'
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(templateData) {
    try {
      const response = await axios.post('/api/templates', templateData)
      await fetchTemplates() // Recargamos la lista después de crear uno nuevo
      return response.data // Devolvemos la respuesta para el mensaje de éxito
    } catch (err) {
      console.error('Error al crear template:', err)
      // Pasamos el error para que el componente lo maneje
      throw err.response?.data || new Error('Error al crear el template.')
    }
  }

  async function updateTemplate(id, templateData) {
    try {
      const response = await axios.put(`/api/templates/${id}`, templateData)
      await fetchTemplates() // Recargamos la lista
      return response.data
    } catch (err) {
      console.error('Error al actualizar template:', err)
      throw err.response?.data || new Error('Error al actualizar el template.')
    }
  }

  async function deleteTemplate(id) {
    try {
      const response = await axios.delete(`/api/templates/${id}`)
      // Eliminamos el template del estado local para una UI más rápida
      templates.value = templates.value.filter(t => t.id !== id)
      return response.data
    } catch (err) {
      console.error('Error al eliminar template:', err)
      throw err.response?.data || new Error('Error al eliminar el template.')
    }
  }

  async function getTemplateContent(id) {
    try {
      const response = await axios.get(`/api/templates/${id}`)
      return response.data.html_content
    } catch (err) {
      console.error('Error al obtener contenido del template:', err)
      throw err.response?.data || new Error('Error al obtener el contenido.')
    }
  }

  // --- Exponemos el estado y las acciones ---
  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateContent,
  }
})
