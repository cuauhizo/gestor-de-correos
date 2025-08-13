// backend/server.js
require('dotenv').config(); // Carga las variables de entorno
const express = require('express');
const mysql = require('mysql2/promise'); // Usamos la versión de promesas para async/await
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); 
const { body, param, validationResult } = require('express-validator'); // Importar validadores
const bcrypt = require('bcryptjs'); // <-- Añade esta línea
const jwt = require('jsonwebtoken'); // <-- Añade esta línea

// NUEVA VARIABLE DE ENTORNO:
// Clave secreta para firmar los tokens JWT. DEBES CONFIGURARLA EN TU .env
// Ej: JWT_SECRET="tu_clave_secreta_aqui"
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_muy_segura';
const JWT_EXPIRES_IN = '1h'; // El token expirará en 1 hora

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Habilita el parseo de JSON en el cuerpo de las solicitudes

// Configuración de la conexión a la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_correos_tolko',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool; // Declarar el pool de conexiones

// Función para conectar a la base de datos
async function connectToDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('Conectado a la base de datos MySQL!');
        connection.release(); // Libera la conexión
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        process.exit(1); // Sale de la aplicación si no se puede conectar
    }
}

// Rutas (Endpoints API)
app.get('/', (req, res) => {
    res.send('API del Editor de Correos funcionando!');
});

// --- Nuevo Middleware de Autenticación ---
const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'No autorizado, token fallido.' });
    }
};

// --- Nuevas Rutas de Autenticación ---
// Ruta para registrar un nuevo usuario
app.post(
    '/api/register',
    [
        body('username').notEmpty().withMessage('El nombre de usuario es requerido.'),
        body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        try {
            const [existingUser] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
            if (existingUser.length > 0) {
                return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const [result] = await pool.execute(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword]
            );
            res.status(201).json({ message: 'Usuario registrado exitosamente.' });
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    }
);

// Ruta para iniciar sesión
app.post(
    '/api/login',
    [
        body('username').notEmpty().withMessage('El nombre de usuario es requerido.'),
        body('password').notEmpty().withMessage('La contraseña es requerida.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        try {
            const [user] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
            if (user.length === 0) {
                return res.status(401).json({ message: 'Credenciales inválidas.' });
            }

            const isMatch = await bcrypt.compare(password, user[0].password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciales inválidas.' });
            }

            const token = jwt.sign({ user: { id: user[0].id, username: user[0].username, role: user[0].role } }, JWT_SECRET, {
                expiresIn: JWT_EXPIRES_IN,
            });

            res.json({
                token,
                user: {
                    id: user[0].id,
                    username: user[0].username,
                    role: user[0].role,
                },
            });
        } catch (error) {
            console.error('Error en el login:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    }
);


// // --- Proteger Rutas con el Middleware 'protect' ---
// // A continuación, un ejemplo de cómo protegerías tus rutas de creación y actualización
// // Reemplaza las rutas existentes con las siguientes:

// app.post('/api/emails-editable', protect, async (req, res) => {
//     const { template_id, initial_content } = req.body;
//     const user_id = req.user.id; // Obtenemos el ID del usuario del token
//     // ... (resto de tu lógica de validación)
//     try {
//         const [result] = await pool.execute(
//             'INSERT INTO emails_editable (uuid, template_id, content_json, user_id) VALUES (?, ?, ?, ?)',
//             [uuidv4(), template_id, JSON.stringify(initial_content), user_id] // Añadimos user_id
//         );
//         // ...
//     } catch (error) { /* ... */ }
// });

// --- Rutas para la gestión de correos editables ---
// Ruta para crear un nuevo correo editable
app.post('/api/emails-editable', protect, async (req, res) => {
    const { template_id, initial_content } = req.body;
    const user_id = req.user.id;
    const uuid = require('uuid').v4(); // Genera un UUID único

    if (!template_id || !initial_content) {
        return res.status(400).json({ message: 'Se requieren template_id y initial_content.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO emails_editable (uuid, template_id, content_json, user_id) VALUES (?, ?, ?, ?)',
            [uuid, template_id, JSON.stringify(initial_content), user_id] // Guarda el JSON como string
        );
        res.status(201).json({ uuid, id: result.insertId, message: 'Correo editable creado exitosamente.', edit_url: `/editar-correo/${uuid}` });
    } catch (error) {
        console.error('Error al crear correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear correo editable.' });
    }
});

// Ruta para obtener un correo editable por UUID (para el editor)
app.get('/api/emails-editable/:uuid', protect, async (req, res) => {
    const { uuid } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT template_id, content_json FROM emails_editable WHERE uuid = ?',
            [uuid]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Correo editable no encontrado.' });
        }

        const emailData = rows[0];
        // Asegúrate de parsear el JSON antes de enviarlo
        emailData.content_json = JSON.parse(emailData.content_json);
        res.json(emailData);

    } catch (error) {
        console.error('Error al obtener correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener correo editable.' });
    }
});

// Ruta para actualizar el contenido de un correo editable con validación
app.put(
    '/api/emails-editable/:uuid', protect,
    [
        // 2. Validar el parámetro UUID de la URL
        param('uuid').isUUID(4).withMessage('UUID de correo inválido.'),

        // 3. Validar que 'updated_content' sea un objeto y no esté vacío
        body('updated_content')
            .isObject().withMessage('El contenido actualizado debe ser un objeto.')
            .notEmpty().withMessage('El contenido actualizado no puede estar vacío.'),

        // 4. (Opcional pero recomendado) Validar campos específicos dentro de updated_content
        //    Aquí puedes añadir reglas para cada campo editable que esperas.
        //    Para los campos de texto enriquecido (TipTap), validamos que no estén vacíos.
        //    Para los campos de enlace, validamos que sean URLs válidas.

        // Ejemplo de validación para campos específicos (ajusta según tus nombres de campo):
        // body('updated_content.titulo_principal')
        //     .optional() // Permite que el campo no esté presente si no es estrictamente obligatorio
        //     .isString().withMessage('El título principal debe ser una cadena de texto.')
        //     .custom(value => {
        //         // Extrae texto plano para validar que no sea solo HTML vacío
        //         const plainText = value.replace(/<[^>]*>/g, '').trim();
        //         if (!plainText) {
        //             throw new Error('El título principal no puede estar vacío.');
        //         }
        //         return true;
        //     }),

        // body('updated_content.parrafo_principal')
        //     .optional()
        //     .isString().withMessage('El párrafo principal debe ser una cadena de texto.')
        //     .custom(value => {
        //         const plainText = value.replace(/<[^>]*>/g, '').trim();
        //         if (!plainText) {
        //             throw new Error('El párrafo principal no puede estar vacío.');
        //         }
        //         return true;
        //     }),

        // body('updated_content.enlace_promocion') // Ejemplo para un campo de enlace
        //     .optional()
        //     .isURL().withMessage('El enlace de promoción debe ser una URL válida.'),

        // Puedes replicar las validaciones .custom() e .isURL() para todos tus campos
        // de texto y enlace respectivamente, para una validación más granular.
        // Si tienes muchos campos, el bucle que ya tienes en el controlador es una buena alternativa.
    ],
    async (req, res) => {
        // 5. Recoger los resultados de la validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { uuid } = req.params;
        const { updated_content } = req.body;

        // 6. Validación adicional de contenido real para campos de texto WYSIWYG y URLs
        //    Este bucle es muy efectivo para validar todos tus campos dinámicos
        for (const key in updated_content) {
            const value = updated_content[key];

            if (key.includes('enlace_')) {
                // Validación para URLs
                try {
                    new URL(value); // Intenta crear una URL para validar el formato
                } catch (e) {
                    return res.status(400).json({ message: `El campo '${key}' debe ser una URL válida.` });
                }
            } else {
                // Validación para campos de texto WYSIWYG (que no estén vacíos de contenido real)
                // Elimina etiquetas HTML y espacios extra para obtener el texto plano
                const plainText = value.replace(/<[^>]*>/g, '').trim();
                if (!plainText) {
                    return res.status(400).json({ message: `El campo '${key}' no puede estar vacío.` });
                }
            }
        }

        try {
            const [result] = await pool.execute(
                'UPDATE emails_editable SET content_json = ? WHERE uuid = ?',
                [JSON.stringify(updated_content), uuid]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Correo editable no encontrado para actualizar.' });
            }
            res.json({ message: 'Contenido del correo editable actualizado exitosamente.' });
        } catch (error) {
            console.error('Error al actualizar correo editable:', error);
            res.status(500).json({ message: 'Error interno del servidor al actualizar correo editable.' });
        }
    }
);

// Ruta para obtener todos los correos editables
app.get('/api/emails-editable', protect, async (req, res) => {
    try {
        // const [rows] = await pool.query('SELECT uuid, template_id, content_json, created_at, updated_at FROM emails_editable');
        const [rows] = await pool.query('SELECT e.uuid, e.template_id, t.name, e.content_json, e.created_at, e.updated_at FROM emails_editable e JOIN templates t ON e.template_id = t.id');
        // Asegúrate de parsear el JSON antes de enviarlo
        const emails = rows.map(row => ({
            ...row,
            content_json: JSON.parse(row.content_json)
        }));
        // console.log(emails);
        res.json(emails);
    } catch (error) {
        console.error('Error al obtener lista de correos editables:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la lista de correos editables.' });
    }
});


// Ruta para eliminar un correo editable por UUID
app.delete('/api/emails-editable/:uuid', protect, async (req, res) => {
    const { uuid } = req.params;
    try {
        const [result] = await pool.execute(
            'DELETE FROM emails_editable WHERE uuid = ?',
            [uuid]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Correo editable no encontrado para eliminar.' });
        }
        res.json({ message: 'Correo editable eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar correo editable.' });
    }
});


// --- Nuevas Rutas para la gestión de templates ---

// Modifica esta ruta para que devuelva el contenido HTML y los placeholders
app.get('/api/templates/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT html_content FROM templates WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Template no encontrado.' });
        }

        const templateHtml = rows[0].html_content;

        // --- Lógica para extraer placeholders del HTML ---
        const placeholders = [];
        const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g; // Regex para {{ placeholder_name }}
        let match;
        while ((match = regex.exec(templateHtml)) !== null) {
            // Asegurarse de no añadir duplicados
            if (!placeholders.includes(match[1])) {
                placeholders.push(match[1]);
            }
        }
        // --- Fin de la lógica de extracción ---

        res.json({ html_content: templateHtml, placeholders: placeholders }); // Ahora devuelve también los placeholders
    } catch (error) {
        console.error('Error al obtener template:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener template.' });
    }
});


// Ruta para obtener todos los templates (GET /api/templates)
app.get('/api/templates', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, created_at FROM templates');
        res.json(rows); // Devolvemos el ID, nombre y fecha de creación, no el HTML completo aquí
    } catch (error) {
        console.error('Error al obtener lista de templates:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la lista de templates.' });
    }
});

// Ruta para crear un nuevo template (POST /api/templates)
app.post(
    '/api/templates', protect,
    [
        body('name')
            .isString().withMessage('El nombre del template debe ser una cadena de texto.')
            .trim().notEmpty().withMessage('El nombre del template no puede estar vacío.')
            .isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres.'),
        body('html_content')
            .isString().withMessage('El contenido HTML debe ser una cadena de texto.')
            .notEmpty().withMessage('El contenido HTML no puede estar vacío.')
            .custom(value => { // <-- ¡NUEVA VALIDACIÓN PERSONALIZADA!
                // Regex para buscar el patrón {{ nombre_placeholder }}
                const placeholderRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
                if (!placeholderRegex.test(value)) {
                    throw new Error('El contenido HTML debe contener al menos un placeholder con el formato {{nombre_del_campo}} para ser editable.');
                }
                return true;
            }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, html_content } = req.body;
        try {
            const [existingTemplate] = await pool.execute('SELECT id FROM templates WHERE name = ?', [name]);
            if (existingTemplate.length > 0) {
                return res.status(409).json({ message: 'Ya existe un template con este nombre.' });
            }

            const [result] = await pool.execute(
                'INSERT INTO templates (name, html_content) VALUES (?, ?)',
                [name, html_content]
            );
            res.status(201).json({ id: result.insertId, name, message: 'Template creado exitosamente.' });
        } catch (error) {
            console.error('Error al crear template:', error);
            res.status(500).json({ message: 'Error interno del servidor al crear template.' });
        }
    }
);

// NUEVA RUTA: Actualizar un template existente (PUT /api/templates/:id)
app.put(
    '/api/templates/:id', protect,
    [
        body('name')
            .isString().withMessage('El nombre del template debe ser una cadena de texto.')
            .trim().notEmpty().withMessage('El nombre del template no puede estar vacío.')
            .isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres.'),
        body('html_content')
            .isString().withMessage('El contenido HTML debe ser una cadena de texto.')
            .notEmpty().withMessage('El contenido HTML no puede estar vacío.')
            .custom(value => {
                const placeholderRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
                if (!placeholderRegex.test(value)) {
                    throw new Error('El contenido HTML debe contener al menos un placeholder con el formato {{nombre_del_campo}} para ser editable.');
                }
                return true;
            }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, html_content } = req.body;

        try {
            // Opcional: Verificar si el nuevo nombre ya existe para otro ID
            const [existingName] = await pool.execute('SELECT id FROM templates WHERE name = ? AND id != ?', [name, id]);
            if (existingName.length > 0) {
                return res.status(409).json({ message: 'Ya existe otro template con este nombre.' });
            }

            const [result] = await pool.execute(
                'UPDATE templates SET name = ?, html_content = ? WHERE id = ?',
                [name, html_content, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Template no encontrado para actualizar.' });
            }
            res.json({ message: 'Template actualizado exitosamente.' });
        } catch (error) {
            console.error('Error al actualizar template:', error);
            res.status(500).json({ message: 'Error interno del servidor al actualizar template.' });
        }
    }
);

// --- NUEVA RUTA: Eliminar un template por ID (DELETE /api/templates/:id) ---
app.delete('/api/templates/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(
            'DELETE FROM templates WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Template no encontrado para eliminar.' });
        }
        res.json({ message: 'Template eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar template:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar template.' });
    }
});

// Iniciar el servidor
async function startServer() {
    await connectToDatabase();
    app.listen(port, () => {
        console.log(`Servidor backend corriendo en http://localhost:${port}`);
    });
}

startServer();