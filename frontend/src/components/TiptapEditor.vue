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
      <button @click="editor.chain().focus().toggleCode().run()" :class="{ 'is-active': editor.isActive('code') }" title="Código">&lt;/&gt;</button>
      <button @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }" title="Párrafo">P</button>
      <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" title="Encabezado 1">H1</button>
      <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" title="Encabezado 2">H2</button>
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }" title="Lista con viñetas">UL</button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }" title="Lista numerada">OL</button>
      <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }" title="Bloque de código">Code Block</button>
      <button @click="editor.chain().focus().setTextAlign('left').run()" :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }" title="Alinear Izquierda">
        <i-bi-text-left />
      </button>
      <button @click="editor.chain().focus().setTextAlign('center').run()" :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }" title="Centrar">
        <i-bi-text-center />
      </button>
      <button @click="editor.chain().focus().setTextAlign('right').run()" :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }" title="Alinear Derecha">
        <i-bi-text-right />
      </button>
      <button @click="editor.chain().focus().setHardBreak().run()" title="Salto de línea">BR</button>

      <div class="dropdown d-inline-block mx-1 border border-1 rounded">
        <button class="btn dropdown-toggle color-toggle-btn d-flex flex-column align-items-center justify-content-center" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Color del texto">
          <strong style="font-family: serif; font-size: 14px; line-height: 1">A</strong>
          <div :style="{ backgroundColor: editor.getAttributes('textStyle').color || '#000000', height: '4px', width: '14px', marginTop: '2px' }"></div>
        </button>
        <div class="dropdown-menu p-3 shadow" style="width: 270px; z-index: 1050">
          <button @click="editor.chain().focus().unsetColor().run()" class="btn btn-light btn-sm w-100 text-start mb-3 d-flex align-items-center gap-2">
            <i-bi-eraser />
            Ninguno
          </button>
          <span class="small text-muted fw-bold mb-2 d-block" style="font-size: 0.75rem">ESTÁNDAR</span>
          <div class="color-grid mb-3">
            <button v-for="color in standardColors" :key="color" @click="editor.chain().focus().setColor(color).run()" class="color-swatch" :style="{ backgroundColor: color }" :title="color"></button>
          </div>
          <hr class="dropdown-divider my-2" />
          <span class="small text-muted fw-bold mb-2 d-block" style="font-size: 0.75rem">PERSONALIZADO</span>
          <div class="d-flex align-items-center gap-2">
            <input type="color" @input="editor.chain().focus().setColor($event.target.value).run()" :value="editor.getAttributes('textStyle').color || '#000000'" class="custom-color-input" title="Añadir color personalizado" />
          </div>
        </div>
      </div>
      <div class="dropdown d-inline-block mx-1 border border-1 rounded">
        <button class="btn dropdown-toggle color-toggle-btn d-flex align-items-center justify-content-center" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Insertar Emoji">
          <span style="font-size: 16px; line-height: 1">😀</span>
        </button>
        <div class="dropdown-menu p-2 shadow" style="width: 280px; max-height: 250px; overflow-y: auto; z-index: 1050">
          <div class="emoji-grid">
            <button v-for="emoji in popularEmojis" :key="emoji" @click="editor.chain().focus().insertContent(emoji).run()" class="emoji-btn" :title="emoji">
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
      <button @click="setLink" :class="{ 'is-active': editor.isActive('link') }" title="Enlace">Link</button>
      <button v-if="editor.isActive('link')" @click="editor.chain().focus().unsetLink().run()" title="Quitar enlace">Unlink</button>
      <button @click="editor.chain().focus().undo().run()" title="Deshacer">Undo</button>
      <button @click="editor.chain().focus().redo().run()" title="Rehacer">Redo</button>
      <button v-if="showHtmlToggle" @click="onToggleHtml" :class="{ 'is-active': isHtmlMode }" title="Ver Código HTML">
        <i-bi-code-slash />
      </button>
    </div>
    <editor-content :editor="editor" class="tiptap-content" />
  </div>
</template>

<script setup>
  import { watch, onBeforeUnmount } from 'vue'
  import { useEditor, EditorContent } from '@tiptap/vue-3'
  import StarterKit from '@tiptap/starter-kit'
  import TextAlign from '@tiptap/extension-text-align'
  import { TextStyle } from '@tiptap/extension-text-style'
  import { Color } from '@tiptap/extension-color'

  const props = defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    showHtmlToggle: { type: Boolean, default: false },
    isHtmlMode: { type: Boolean, default: false },
  })

  const emit = defineEmits(['update:modelValue', 'toggle-html'])

  const standardColors = [
    '#000000',
    '#434343',
    '#666666',
    '#999999',
    '#b7b7b7',
    '#cccccc',
    '#d9d9d9',
    '#efefef',
    '#f3f3f3',
    '#ffffff',
    '#980000',
    '#ff0000',
    '#ff9900',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#4a86e8',
    '#0000ff',
    '#9900ff',
    '#ff00ff',
    '#e6b8af',
    '#f4cccc',
    '#fce5cd',
    '#fff2cc',
    '#d9ead3',
    '#d0e0e3',
    '#c9daf8',
    '#cfe2f3',
    '#d9d2e9',
    '#ead1dc',
    '#dd7e6b',
    '#ea9999',
    '#f9cb9c',
    '#ffe599',
    '#b6d7a8',
    '#a2c4c9',
    '#a4c2f4',
    '#9fc5e8',
    '#b4a7d6',
    '#d5a6bd',
    '#cc4125',
    '#e06666',
    '#f6b26b',
    '#ffd966',
    '#93c47d',
    '#76a5af',
    '#6d9eeb',
    '#6fa8dc',
    '#8e7cc3',
    '#c27ba0',
    '#a61c00',
    '#cc0000',
    '#e69138',
    '#f1c232',
    '#6aa84f',
    '#45818e',
    '#3c78d8',
    '#3d85c6',
    '#674ea7',
    '#a64d79',
    '#85200c',
    '#990000',
    '#b45f06',
    '#bf9000',
    '#38761d',
    '#134f5c',
    '#1155cc',
    '#0b5394',
    '#351c75',
    '#741b47',
    '#5b0f00',
    '#660000',
    '#783f04',
    '#7f6000',
    '#274e13',
    '#0c343d',
    '#1c4587',
    '#073763',
    '#20124d',
    '#4c1130',
  ]

  // Galería curada de los emojis más usados
  const popularEmojis = [
    '📌',
    '🚀',
    '😀',
    '😃',
    '😄',
    '😁',
    '😆',
    '😅',
    '😂',
    '🤣',
    '😊',
    '😇',
    '🙂',
    '🙃',
    '😉',
    '😌',
    '😍',
    '🥰',
    '😘',
    '😗',
    '😙',
    '😚',
    '😋',
    '😛',
    '😝',
    '😜',
    '🤪',
    '🤨',
    '🧐',
    '🤓',
    '😎',
    '🤩',
    '🥳',
    '😏',
    '😒',
    '😞',
    '😔',
    '😟',
    '😕',
    '🙁',
    '☹️',
    '😣',
    '😖',
    '😫',
    '😩',
    '🥺',
    '😢',
    '😭',
    '😤',
    '😠',
    '😡',
    '🤬',
    '🤯',
    '😳',
    '🥵',
    '🥶',
    '😱',
    '😨',
    '😰',
    '😥',
    '😓',
    '🤗',
    '🤔',
    '🤭',
    '🤫',
    '🤥',
    '😶',
    '😐',
    '😑',
    '😬',
    '🙄',
    '😯',
    '😦',
    '😧',
    '😮',
    '😲',
    '🥱',
    '😴',
    '🤤',
    '😪',
    '😵',
    '🤐',
    '🥴',
    '🤢',
    '🤮',
    '🤧',
    '😷',
    '🤒',
    '🤕',
    '🤑',
    '🤠',
    '😈',
    '👿',
    '👹',
    '👺',
    '🤡',
    '💩',
    '👻',
    '💀',
    '👽',
    '👾',
    '🤖',
    '🎃',
    '🎄',
    '🎆',
    '🎇',
    '🧨',
    '✨',
    '🎈',
    '🎉',
    '🎊',
    '🏆',
    '🔥',
    '💧',
    '☀️',
    '🌈',
    '🌪️',
    '🌊',
    '🍏',
    '🍎',
    '🍔',
    '🍕',
    '🌮',
    '🌯',
    '🍜',
    '🍩',
    '☕',
    '🍹',
    '👉',
    '👍',
    '👎',
    '✌️',
    '🤞',
    '🤝',
    '👏',
    '🙌',
    '👐',
    '🤲',
    '🙏',
    '💪',
  ]

  const editor = useEditor({
    content: props.modelValue,
    extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] }), TextStyle, Color],
    onUpdate: ({ editor }) => {
      emit('update:modelValue', editor.getHTML())
    },
  })

  function onToggleHtml() {
    emit('toggle-html')
  }

  watch(
    () => props.modelValue,
    newValue => {
      if (newValue !== editor.value.getHTML()) {
        editor.value.commands.setContent(newValue, false)
      }
    }
  )

  const setLink = () => {
    const previousUrl = editor.value.getAttributes('link').href
    const url = window.prompt('URL:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  onBeforeUnmount(() => {
    editor.value.destroy()
  })
</script>

<style scoped>
  /* Quita el overflow: hidden para que los menús desplegables se vean completos */
  .tiptap-editor-wrapper {
    border: 1px solid #ccc;
    border-radius: 4px;
    /* overflow: hidden; */
    background-color: #fff;
  }

  /* Agregamos el radio a las esquinas superiores para compensar */
  .tiptap-toolbar {
    padding: 8px;
    border-bottom: 1px solid #ccc;
    background-color: #f0f0f0;

    /* AÑADE ESTAS DOS LÍNEAS NUEVAS */
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }

  .tiptap-toolbar button {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 0.9em;
    min-width: unset;
    margin: 0;
    color: #333;
    transition: background-color 0.2s ease;
  }

  .tiptap-toolbar button:hover {
    background-color: #e0e0e0;
  }

  .tiptap-toolbar button.is-active {
    background-color: #cce0ff;
    color: #0056b3;
    border-color: #007bff;
  }

  .tiptap-content {
    padding: 10px;
    min-height: 120px;
    outline: none;
  }

  .tiptap-content :deep(p) {
    margin: 0 0 1em 0;
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
    border-color: #dc3545;
  }
  .tiptap-toolbar button svg {
    width: 1.1em;
    height: 1.1em;
    display: inline-block;
    vertical-align: middle;
  }

  /* ESTILOS COMUNES PARA DROPDOWNS */
  .color-toggle-btn {
    padding: 6px 8px !important;
    background-color: transparent !important;
    border: 1px solid transparent !important;
  }
  .color-toggle-btn:hover {
    background-color: #e0e0e0 !important;
    border-color: #ddd !important;
  }
  .color-toggle-btn::after {
    display: none;
  }

  /* ESTILOS DEL COLOR PICKER */
  .color-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
  }
  .color-swatch {
    width: 18px !important;
    height: 18px !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    border-radius: 50% !important;
    padding: 0 !important;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .color-swatch:hover {
    transform: scale(1.25);
    border-color: #000 !important;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  .custom-color-input {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 50%;
    cursor: pointer;
    background: none;
  }
  .custom-color-input::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  .custom-color-input::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
  }

  /* ESTILOS DEL EMOJI PICKER */
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }
  .emoji-btn {
    background: transparent !important;
    border: none !important;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px !important;
    border-radius: 4px !important;
    transition:
      background-color 0.1s ease,
      transform 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .emoji-btn:hover {
    background-color: #e0e0e0 !important;
    transform: scale(1.2);
    z-index: 10;
  }
</style>
