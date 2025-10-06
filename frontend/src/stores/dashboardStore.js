import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import axios from '../services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  // --- State ---
  const totals = reactive({
    emails: 0,
    templates: 0,
    users: 0,
  })

  const recentEmails = ref([])
  const loading = ref(false)

  // --- Actions ---
  async function fetchDashboardData() {
    loading.value = true
    try {
      // Hacemos ambas peticiones en paralelo para mayor eficiencia
      const [totalsResponse, recentEmailsResponse] = await Promise.all([axios.get('/api/stats/totals'), axios.get('/api/stats/recent-emails')])

      // Asignamos los resultados al estado
      Object.assign(totals, totalsResponse.data)
      recentEmails.value = recentEmailsResponse.data
    } catch (error) {
      console.error('Error al cargar los datos del dashboard:', error)
      // Aquí podrías establecer un estado de error si lo deseas
    } finally {
      loading.value = false
    }
  }

  return {
    totals,
    recentEmails,
    loading,
    fetchDashboardData,
  }
})
