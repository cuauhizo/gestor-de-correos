<template>
  <div class="tiptap-editor-wrapper">
    <div v-if="editor" class="tiptap-toolbar">
      <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }" title="Negrita">
        <strong>B</strong>
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }" title="Cursiva">
        <em>I</em>
      </button>
      <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }" title="Tachado">
        <s>S</s>
      </button>
      <button @click="editor.chain().focus().toggleCode().run()" :class="{ 'is-active': editor.isActive('code') }" title="Código">
        &lt;/&gt;
      </button>
      <button @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }" title="Párrafo">
        P
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" title="Encabezado 1">
        H1
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" title="Encabezado 2">
        H2
      </button>
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }" title="Lista con viñetas">
        UL
      </button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }" title="Lista numerada">
        OL
      </button>
      <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }" title="Bloque de código">
        Code Block
      </button>
      <button @click="editor.chain().focus().setHardBreak().run()" title="Salto de línea">
        BR
      </button>
      <button @click="setLink" :class="{ 'is-active': editor.isActive('link') }" title="Enlace">
        Link
      </button>
      <button v-if="editor.isActive('link')" @click="editor.chain().focus().unsetLink().run()" title="Quitar enlace">
        Unlink
      </button>
      <button @click="editor.chain().focus().undo().run()" title="Deshacer">
        Undo
      </button>
      <button @click="editor.chain().focus().redo().run()" title="Rehacer">
        Redo
      </button>
    </div>
    <editor-content :editor="editor" class="tiptap-content" />
  </div>
</template>

<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
// import Link from '@tiptap/extension-link'; // Importa el Link extension

const props = defineProps({
  modelValue: { // Recibe el HTML inicial del padre
    type: String,
    default: '',
  },
  placeholder: { // Opcional: para un placeholder visual
    type: String,
    default: '',
  }
});

const emit = defineEmits(['update:modelValue']); // Emite los cambios al padre

const editor = useEditor({
  content: props.modelValue, // Contenido inicial
  extensions: [
    StarterKit,
    // Elimina o comenta este bloque si no necesitas configuraciones específicas para Link
    // Link.configure({
    //   openOnClick: false,
    //   autolink: true,
    // }),
  ],
  onUpdate: ({ editor }) => {
    // Cuando el contenido del editor cambia, emitimos el HTML actualizado
    emit('update:modelValue', editor.getHTML());
  },
});

// Observa los cambios en `modelValue` del padre para actualizar el editor de TipTap
// Esto es importante si el padre actualiza el contenido de forma programática.
watch(() => props.modelValue, (newValue) => {
  // Evita un bucle infinito si el cambio proviene del propio editor
  if (newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue, false); // false para no emitir update al aplicar setContent
  }
});

// Función para manejar la inserción/edición de enlaces
const setLink = () => {
  const previousUrl = editor.value.getAttributes('link').href;
  const url = window.prompt('URL:', previousUrl);

  // cancelled
  if (url === null) {
    return;
  }

  // empty
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  // update link
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
};

// Asegúrate de destruir el editor antes de que el componente se desmonte
onBeforeUnmount(() => {
  editor.value.destroy();
});
</script>

<style scoped>
.tiptap-editor-wrapper {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden; /* Para contener la barra de herramientas y el contenido */
  background-color: #fff;
}

.tiptap-toolbar {
  padding: 8px;
  border-bottom: 1px solid #ccc;
  background-color: #f0f0f0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tiptap-toolbar button {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.9em;
  min-width: unset; /* Sobreescribe el estilo del botón global si lo tienes */
  margin: 0; /* Elimina márgenes extra si los tienes en botones globales */
  color: #333;
  transition: background-color 0.2s ease;
}

.tiptap-toolbar button:hover {
  background-color: #e0e0e0;
}

.tiptap-toolbar button.is-active {
  background-color: #cce0ff; /* Fondo azul claro para botones activos */
  color: #0056b3;
  border-color: #007bff;
}

.tiptap-content {
  padding: 10px;
  min-height: 120px; /* Altura mínima para el área de edición */
  outline: none; /* Quita el contorno por defecto al enfocar */
}

/* Estilos para el contenido de TipTap */
.tiptap-content :deep(p) {
  margin: 0 0 1em 0; /* Espaciado entre párrafos */
}

.tiptap-content :deep(ul),
.tiptap-content :deep(ol) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 1.5em;
}

.tiptap-content :deep(h1),
.tiptap-content :deep(h2) {
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.tiptap-editor-wrapper.invalid {
  border-color: #dc3545; /* Rojo */
}

</style>