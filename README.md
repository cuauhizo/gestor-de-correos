# 📧 Gestor de Correos Modulares

Este es un proyecto full-stack diseñado para la creación y gestión de correos electrónicos de manera modular. Permite a los administradores definir plantillas y bloques de sección reutilizables, y a los editores construir correos personalizados añadiendo, eliminando y reordenando estos bloques.

## ✨ Características Principales

- **Editor Modular de Bloques:** Construye correos dinámicamente añadiendo, eliminando y reordenando secciones.
- **Biblioteca Global de Secciones:** Los administradores pueden crear y gestionar una biblioteca de bloques de contenido reutilizables.
- **Previsualización en Tiempo Real:** Visualiza cómo se verá el correo final mientras editas, con interactividad para cambiar imágenes y enfocar texto.
- **Gestión de Roles:** Sistema de autenticación con roles de `administrador` y `editor`.
- **Paneles de Administración:** Interfaces completas para gestionar Usuarios, Templates Maestros y Plantillas de Sección.
- **Autoguardado y Bloqueo:** Sistema de autoguardado para no perder cambios y bloqueo de correos para evitar ediciones simultáneas.
- **Flujo de Trabajo Profesional:** Uso de Pug para la creación de templates y un flujo de desarrollo/producción basado en variables de entorno.

## 🚀 Pila Tecnológica (Tech Stack)

### **Backend**

- **Node.js** con **Express.js** para el servidor API REST.
- **MySQL** como base de datos.
- **JWT (JSON Web Tokens)** para la autenticación.
- **bcrypt.js** para el hashing de contraseñas.
- Arquitectura de **Rutas, Controladores y Servicios** para una organización escalable.

### **Frontend**

- **Vue 3** con la **Composition API** y `<script setup>`.
- **Vite** como herramienta de construcción.
- **Pinia** para la gestión de estado centralizado.
- **Vue Router** para el enrutamiento.
- **Bootstrap 5** para los estilos.
- **unplugin-icons** para la carga eficiente de iconos SVG.

## 🛠️ Instalación y Puesta en Marcha Local

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### **Prerrequisitos**

- **Node.js** (v18 o superior).
- Un servidor de **MySQL** en funcionamiento.

### **1. Configuración Inicial**

1.  **Clona el repositorio:**

    ```bash
    git clone [https://github.com/tu-usuario/gestor-de-correos.git](https://github.com/tu-usuario/gestor-de-correos.git)
    cd gestor-de-correos
    ```

2.  **Base de Datos:**
    - Crea una nueva base de datos en tu servidor MySQL (ej. `gestor_correos_db`).
    - Importa el archivo `bd_correos_tolko.sql` en tu nueva base de datos. Esto creará las tablas y algunos datos iniciales.

### **2. Configuración del Backend**

1.  **Navega a la carpeta del backend e instala las dependencias:**

    ```bash
    cd backend
    npm install
    ```

2.  **Crea el archivo de entorno `.env`:**

    - Crea un archivo llamado `.env` en la raíz de la carpeta `backend`.
    - Copia y pega el siguiente contenido, ajustando los valores de tu base de datos:

    ```env
    # Configuración de la Base de Datos
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=tu_contraseña_de_mysql
    DB_NAME=gestor_correos_db

    # Puerto para el servidor backend
    PORT=3000

    # Clave secreta para JWT (usa una frase larga y segura)
    JWT_SECRET=tu_clave_secreta_para_jwt
    ```

3.  **Inicia el servidor de backend:**
    ```bash
    npm run dev
    ```
    El servidor debería estar corriendo en `http://localhost:3000`.

### **3. Configuración del Frontend**

1.  **Abre una nueva terminal**, navega a la carpeta del frontend e instala las dependencias:

    ```bash
    cd frontend
    npm install
    ```

2.  **Crea el archivo de entorno de desarrollo `.env.development`:**

    - Crea un archivo llamado `.env.development` en la raíz de la carpeta `frontend`.
    - Pega el siguiente contenido. Apunta a tu servidor de backend local.

    ```env
    VITE_API_URL=http://localhost:3000
    ```

3.  **Inicia el servidor de desarrollo del frontend:**
    ```bash
    npm run dev
    ```
    La aplicación debería estar disponible en `http://localhost:5173` (o el puerto que indique Vite).

¡Y listo! Ya tienes el entorno de desarrollo completo funcionando en tu máquina.

## 🔮 Posibles Mejoras a Futuro

- **Subida de Imágenes:** Integrar `multer` para permitir la subida de archivos de imagen directamente desde el editor.
- **Enviar Correo de Prueba:** Usar `Nodemailer` para añadir una función que envíe el correo renderizado a una dirección de email.
- **Arrastrar y Soltar (Drag and Drop):** Implementar `VueDraggable` en el editor para reordenar las secciones de forma más intuitiva.
- **"Skeletons" de Carga:** Mejorar la UI de carga con componentes esqueleto.
