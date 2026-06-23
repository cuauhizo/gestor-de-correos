import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from '../services/api'

export const useUserStore = defineStore('users', () => {
  // --- State ---
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  // --- Actions ---
  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/users')
      users.value = response.data
    } catch (err) {
      error.value = 'No se pudieron cargar los usuarios.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  async function createUser(userData) {
    try {
      const response = await axios.post('/api/users', userData)
      await fetchUsers()
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al crear usuario.' }
    }
  }

  async function updateUser(id, userData) {
    try {
      const response = await axios.put(`/api/users/${id}`, userData)
      await fetchUsers()
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al actualizar usuario.' }
    }
  }

  async function deleteUser(id) {
    try {
      const response = await axios.delete(`/api/users/${id}`)
      users.value = users.value.filter(u => u.id !== id)
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al eliminar usuario.' }
    }
  }

  // 👇 NUEVAS FUNCIONES PARA PERMISOS 👇
  async function getUserPermissions(id) {
    try {
      const response = await axios.get(`/api/users/${id}/permissions`)
      return { success: true, data: response.data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al obtener permisos.' }
    }
  }

  async function updateUserPermissions(id, permissionsData) {
    try {
      const response = await axios.put(`/api/users/${id}/permissions`, permissionsData)
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al actualizar permisos.' }
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserPermissions,
    updateUserPermissions,
  }
})
