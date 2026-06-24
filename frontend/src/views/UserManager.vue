<template>
  <div class="container py-4" style="max-width: 900px">
    <h1 class="card-title text-center mb-4">Gestionar Usuarios</h1>

    <div class="card p-4 mb-4">
      <h2 class="h4 text-center mb-4">{{ editingUser.id ? 'Editar Usuario' : 'Añadir Nuevo Usuario' }}</h2>
      <form @submit.prevent="handleSaveUser">
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="username" class="form-label">Nombre de Usuario:</label>
            <input type="text" id="username" v-model="editingUser.username" required class="form-control" />
          </div>
          <div class="col-md-6 mb-3">
            <label for="role" class="form-label">Rol:</label>
            <select id="role" v-model="editingUser.role" required class="form-select">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="col-12 mb-3">
            <label for="password" class="form-label">Contraseña:</label>
            <input type="password" id="password" v-model="editingUser.password" :placeholder="editingUser.id ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'" class="form-control" />
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-center mt-3">
          <button type="submit" :disabled="isSaving" class="btn btn-success">
            {{ isSaving ? 'Guardando...' : editingUser.id ? 'Actualizar Usuario' : 'Crear Usuario' }}
          </button>
          <button type="button" @click="cancelEdit" v-if="editingUser.id" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>

    <hr class="my-5" />

    <div class="card p-4">
      <h2 class="h4 text-center mb-4">Usuarios Existentes</h2>
      <div v-if="userStore.loading" class="mb-4">
        <ul class="list-group">
          <li v-for="i in 5" :key="'skel-user-' + i" class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div class="d-flex gap-2">
              <SkeletonLoader width="180px" height="31px" radius="4px" />
              <SkeletonLoader width="50px" height="15px" radius="4px" />
            </div>
            <div class="d-flex gap-2">
              <SkeletonLoader width="80px" height="31px" radius="4px" />
              <SkeletonLoader width="80px" height="31px" radius="4px" />
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="userStore.error" class="text-center text-danger">{{ userStore.error }}</div>
      <div v-else>
        <p v-if="userStore.users.length === 0" class="text-center text-secondary">No hay usuarios registrados aún.</p>
        <ul class="list-group" v-else>
          <li v-for="user in userStore.users" :key="user.id" class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div>
              <strong class="fs-5">{{ user.username }}</strong>
              <span :class="['badge', user.role === 'admin' ? 'bg-primary' : 'bg-secondary', 'ms-2']">{{ user.role }}</span>
            </div>
            <div class="d-flex gap-2">
              <button v-if="user.role !== 'admin'" @click="openPermissionsModal(user)" class="btn btn-warning btn-sm text-dark">
                <i-bi-shield-lock />
                Permisos
              </button>
              <button @click="startEdit(user)" class="btn btn-primary btn-sm">Editar</button>
              <button @click="handleDeleteUser(user.id)" class="btn btn-danger btn-sm" :disabled="authStore.user?.id === user.id">Eliminar</button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <teleport to="body">
      <div v-if="showPermissionsModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5); z-index: 1055">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title">
                Asignar Permisos a
                <span class="text-warning">{{ selectedUserForPermissions?.username }}</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closePermissionsModal"></button>
            </div>

            <div class="modal-body bg-light">
              <div v-if="isLoadingPermissions" class="text-center py-4">Cargando permisos...</div>

              <div v-else class="row g-4">
                <div class="col-md-6">
                  <div class="card h-100 shadow-sm border-primary">
                    <div class="card-header bg-primary text-white fw-bold d-flex justify-content-between align-items-center">
                      <span>Plantillas Maestras</span>
                      <span class="badge bg-light text-primary">{{ selectedTemplates.length }} / {{ templateStore.templates.length }}</span>
                    </div>

                    <div class="p-2 border-bottom bg-white sticky-top">
                      <input type="text" v-model="searchTemplate" class="form-control form-control-sm mb-2" placeholder="Buscar plantilla..." />
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="selectAllTemplates" v-model="selectAllTemplatesToggle" />
                        <label class="form-check-label fw-bold small" for="selectAllTemplates">Seleccionar todas las filtradas</label>
                      </div>
                    </div>

                    <div class="card-body" style="max-height: 400px; overflow-y: auto">
                      <p v-if="filteredTemplates.length === 0" class="text-muted small text-center my-3">No hay plantillas que coincidan con la búsqueda.</p>

                      <div class="form-check mb-2" v-for="template in filteredTemplates" :key="template.id">
                        <input class="form-check-input" type="checkbox" :value="template.id" :id="`tpl-${template.id}`" v-model="selectedTemplates" />
                        <label class="form-check-label" :for="`tpl-${template.id}`">
                          {{ template.name }}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="card h-100 shadow-sm border-success">
                    <div class="card-header bg-success text-white fw-bold d-flex justify-content-between align-items-center">
                      <span>Plantillas de Sección</span>
                      <span class="badge bg-light text-success">{{ selectedSections.length }} / {{ sectionStore.sections.length }}</span>
                    </div>

                    <div class="p-2 border-bottom bg-white sticky-top">
                      <input type="text" v-model="searchSection" class="form-control form-control-sm mb-2" placeholder="Buscar sección por nombre o clave..." />
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="selectAllSections" v-model="selectAllSectionsToggle" />
                        <label class="form-check-label fw-bold small" for="selectAllSections">Seleccionar todas las filtradas</label>
                      </div>
                    </div>

                    <div class="card-body" style="max-height: 400px; overflow-y: auto">
                      <p v-if="filteredSections.length === 0" class="text-muted small text-center my-3">No hay secciones que coincidan con la búsqueda.</p>

                      <div class="form-check mb-2" v-for="section in filteredSections" :key="section.id">
                        <input class="form-check-input" type="checkbox" :value="section.id" :id="`sec-${section.id}`" v-model="selectedSections" />
                        <label class="form-check-label" :for="`sec-${section.id}`">
                          {{ section.name }}
                          <br />
                          <small class="text-muted">{{ section.type_key }}</small>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closePermissionsModal">Cancelar</button>
              <button type="button" class="btn btn-primary px-4" @click="savePermissions" :disabled="isSavingPermissions">
                {{ isSavingPermissions ? 'Guardando...' : 'Guardar Permisos' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue' // <-- Agregamos computed
  import { useUserStore } from '../stores/userStore.js'
  import { useTemplateStore } from '../stores/templateStore.js'
  import { useSectionTemplateStore } from '../stores/sectionTemplateStore.js'
  import { useAuthStore } from '../stores/auth.js'
  import { useFeedbackStore } from '../stores/feedbackStore.js'
  import { useModalStore } from '../stores/modalStore.js'
  import SkeletonLoader from '../components/SkeletonLoader.vue'

  // --- STORES ---
  const userStore = useUserStore()
  const templateStore = useTemplateStore()
  const sectionStore = useSectionTemplateStore()
  const authStore = useAuthStore()
  const feedbackStore = useFeedbackStore()
  const modalStore = useModalStore()

  // --- LÓGICA DE USUARIOS (CREAR/EDITAR) ---
  const isSaving = ref(false)
  const editingUser = ref({ id: null, username: '', role: 'editor', password: '' })

  const resetForm = () => {
    editingUser.value = { id: null, username: '', role: 'editor', password: '' }
  }

  const handleSaveUser = async () => {
    isSaving.value = true
    const userData = { username: editingUser.value.username, role: editingUser.value.role }
    if (editingUser.value.password) userData.password = editingUser.value.password

    const result = editingUser.value.id ? await userStore.updateUser(editingUser.value.id, userData) : await userStore.createUser(userData)

    feedbackStore.show(result.message, result.success ? 'success' : 'error')
    if (result.success) resetForm()
    isSaving.value = false
  }

  const startEdit = user => {
    editingUser.value = { ...user, password: '' }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const cancelEdit = () => resetForm()

  const handleDeleteUser = id => {
    modalStore.show({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        const result = await userStore.deleteUser(id)
        feedbackStore.show(result.message, result.success ? 'success' : 'error')
      },
    })
  }

  // --- LÓGICA DE PERMISOS ---
  const showPermissionsModal = ref(false)
  const isLoadingPermissions = ref(false)
  const isSavingPermissions = ref(false)
  const selectedUserForPermissions = ref(null)

  const selectedTemplates = ref([])
  const selectedSections = ref([])

  // Variables de Búsqueda
  const searchTemplate = ref('')
  const searchSection = ref('')

  // Filtros Computados
  const filteredTemplates = computed(() => {
    if (!searchTemplate.value) return templateStore.templates
    return templateStore.templates.filter(t => t.name.toLowerCase().includes(searchTemplate.value.toLowerCase()))
  })

  const filteredSections = computed(() => {
    if (!searchSection.value) return sectionStore.sections
    return sectionStore.sections.filter(s => s.name.toLowerCase().includes(searchSection.value.toLowerCase()) || s.type_key.toLowerCase().includes(searchSection.value.toLowerCase()))
  })

  // Computados para el comportamiento inteligente de "Seleccionar Todo"
  const selectAllTemplatesToggle = computed({
    get: () => {
      // Retorna true si todos los elementos filtrados están en el arreglo selectedTemplates
      return filteredTemplates.value.length > 0 && filteredTemplates.value.every(t => selectedTemplates.value.includes(t.id))
    },
    set: value => {
      const filteredIds = filteredTemplates.value.map(t => t.id)
      if (value) {
        // Agregamos todos los IDs filtrados a la selección (evitando duplicados)
        const toAdd = filteredIds.filter(id => !selectedTemplates.value.includes(id))
        selectedTemplates.value.push(...toAdd)
      } else {
        // Removemos todos los IDs filtrados de la selección
        selectedTemplates.value = selectedTemplates.value.filter(id => !filteredIds.includes(id))
      }
    },
  })

  const selectAllSectionsToggle = computed({
    get: () => {
      return filteredSections.value.length > 0 && filteredSections.value.every(s => selectedSections.value.includes(s.id))
    },
    set: value => {
      const filteredIds = filteredSections.value.map(s => s.id)
      if (value) {
        const toAdd = filteredIds.filter(id => !selectedSections.value.includes(id))
        selectedSections.value.push(...toAdd)
      } else {
        selectedSections.value = selectedSections.value.filter(id => !filteredIds.includes(id))
      }
    },
  })

  const openPermissionsModal = async user => {
    selectedUserForPermissions.value = user
    showPermissionsModal.value = true
    isLoadingPermissions.value = true
    searchTemplate.value = ''
    searchSection.value = ''

    if (templateStore.templates.length === 0) await templateStore.fetchTemplates()
    if (sectionStore.sections.length === 0) await sectionStore.fetchSectionTemplates()

    const result = await userStore.getUserPermissions(user.id)
    if (result.success) {
      selectedTemplates.value = result.data.templates
      selectedSections.value = result.data.sections
    } else {
      feedbackStore.show(result.message, 'error')
    }

    isLoadingPermissions.value = false
  }

  const closePermissionsModal = () => {
    showPermissionsModal.value = false
    selectedUserForPermissions.value = null
    selectedTemplates.value = []
    selectedSections.value = []
    searchTemplate.value = ''
    searchSection.value = ''
  }

  const savePermissions = async () => {
    isSavingPermissions.value = true
    const result = await userStore.updateUserPermissions(selectedUserForPermissions.value.id, {
      templates: selectedTemplates.value,
      sections: selectedSections.value,
    })

    feedbackStore.show(result.message, result.success ? 'success' : 'error')
    if (result.success) {
      closePermissionsModal()
    }
    isSavingPermissions.value = false
  }

  onMounted(() => {
    userStore.fetchUsers()
  })
</script>
