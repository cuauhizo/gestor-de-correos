// backend/server.js
// Archivo principal del servidor Express.js para la aplicación de gestión de correos.

// Carga las variables de entorno desde el archivo .env
require('dotenv').config();

// --- Módulos de Node.js ---
const express = require('express');
const mysql = require('mysql2/promise'); // Cliente MySQL con soporte para promesas
const cors = require('cors'); // Middleware para habilitar CORS
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos
const { body, param, validationResult } = require('express-validator'); // Para validar datos de entrada

// --- Módulos de Autenticación y Seguridad ---
const bcrypt = require('bcryptjs'); // Librería para hashear contraseñas
const jwt = require('jsonwebtoken'); // Para crear y verificar tokens JWT

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_muy_segura'; // Clave secreta para JWT
const JWT_EXPIRES_IN = '1h'; // Duración del token JWT

// --- Configuración de la Base de Datos ---
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_correos_tolko',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool; // Pool de conexiones a la base de datos

// Función para conectar a la base de datos
async function connectToDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        await pool.getConnection();
        console.log('Conectado a la base de datos MySQL!');
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        process.exit(1);
    }
}

// Rutas (Endpoints API)
app.get('/', (req, res) => {
    res.send('API del Editor de Correos funcionando!');
});

// --- Middleware Global ---
app.use(cors()); // Habilita CORS
app.use(express.json()); // Habilita el parseo de JSON

// Middleware para verificar si el token JWT es válido y obtener la información del usuario
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

// Middleware para verificar si el usuario tiene el rol de administrador
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'No tienes permiso de administrador para realizar esta acción.' });
    }
};

// Middleware para verificar si un correo está bloqueado por otro usuario
const checkLock = async (req, res, next) => {
    const { uuid } = req.params;
    const currentUserId = req.user.id;
    try {
        const [rows] = await pool.execute(
            'SELECT is_locked, locked_by_user_id FROM emails_editable WHERE uuid = ?',
            [uuid]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Correo no encontrado.' });
        }
        const email = rows[0];
        if (email.is_locked && email.locked_by_user_id !== currentUserId) {
            const [userRows] = await pool.execute('SELECT username FROM users WHERE id = ?', [email.locked_by_user_id]);
            const lockedByUsername = userRows.length > 0 ? userRows[0].username : 'otro usuario';
            return res.status(409).json({ message: `Este correo está siendo editado por ${lockedByUsername}.` });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar el bloqueo.' });
    }
};

// Función auxiliar para validar el contenido de texto enriquecido (WYSIWYG)
const validateRichContent = (value) => {
    const plainText = value.replace(/<[^>]*>/g, '').trim();
    if (!plainText) {
        throw new Error('El contenido no puede estar vacío.');
    }
    return true;
};

// --- Rutas de Autenticación (Públicas) ---
// Ruta para registrar un nuevo usuario
app.post('/api/register', [
    body('username').notEmpty().withMessage('El nombre de usuario es requerido.'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
        const [existingUser] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) return res.status(409).json({ message: 'El nombre de usuario ya existe.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para iniciar sesión
app.post('/api/login', [
    body('username').notEmpty().withMessage('El nombre de usuario es requerido.'),
    body('password').notEmpty().withMessage('La contraseña es requerida.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
        const [user] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (user.length === 0) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const isMatch = await bcrypt.compare(password, user[0].password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const token = jwt.sign({ user: { id: user[0].id, username: user[0].username, role: user[0].role } }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ token, user: { id: user[0].id, username: user[0].username, role: user[0].role } });
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- Rutas de Gestión de Correos Editables (Protegidas) ---
// Ruta para obtener todos los correos editables con información de usuarios
app.get('/api/emails-editable', protect, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                e.uuid,
                e.template_id,
                t.name as template_name,
                e.created_at,
                e.updated_at,
                uc.username AS creator_username,
                um.username AS last_modifier_username
            FROM emails_editable e
            LEFT JOIN templates t ON e.template_id = t.id
            LEFT JOIN users uc ON e.user_id = uc.id
            LEFT JOIN users um ON e.last_modified_by = um.id
            ORDER BY e.updated_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener lista de correos editables:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para crear un nuevo correo editable
app.post('/api/emails-editable', protect, [
    body('template_id').notEmpty().withMessage('El ID del template es requerido.'),
    body('initial_content').isObject().notEmpty().withMessage('El contenido inicial es requerido.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { template_id, initial_content } = req.body;
    const user_id = req.user.id;
    const uuid = uuidv4();

    try {
        for (const key in initial_content) {
            const value = initial_content[key];
            if (key.includes('enlace_')) {
                try { new URL(value); } catch (e) { return res.status(400).json({ message: `El campo '${key}' debe ser una URL válida.` }); }
            } else {
                validateRichContent(value);
            }
        }
        await pool.execute(
            'INSERT INTO emails_editable (uuid, template_id, content_json, user_id, is_locked, locked_by_user_id) VALUES (?, ?, ?, ?, 1, ?)',
            [uuid, template_id, JSON.stringify(initial_content), user_id, user_id]
        );
        res.status(201).json({ uuid, message: 'Correo editable creado y bloqueado exitosamente.' });
    } catch (error) {
        console.error('Error al crear correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para obtener un correo editable por UUID
app.get('/api/emails-editable/:uuid', protect, async (req, res) => {
    const { uuid } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT e.template_id, t.name AS template_name, e.content_json, e.is_locked, e.locked_by_user_id FROM emails_editable e JOIN templates t ON e.template_id = t.id WHERE e.uuid = ?',
            [uuid]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Correo editable no encontrado.' });
        const emailData = rows[0];
        emailData.content_json = JSON.parse(emailData.content_json);
        res.json(emailData);
    } catch (error) {
        console.error('Error al obtener correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para actualizar el contenido de un correo editable
app.put('/api/emails-editable/:uuid', protect, [
    param('uuid').isUUID(4).withMessage('UUID de correo inválido.'),
    body('updated_content').isObject().notEmpty().withMessage('El contenido es requerido.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { uuid } = req.params;
    const { updated_content } = req.body;
    const user_id = req.user.id;

    try {
        for (const key in updated_content) {
            const value = updated_content[key];
            if (key.includes('enlace_')) {
                try { new URL(value); } catch (e) { return res.status(400).json({ message: `El campo '${key}' debe ser una URL válida.` }); }
            } else {
                validateRichContent(value);
            }
        }
        const [emailRows] = await pool.execute('SELECT locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid]);
        if (emailRows.length === 0 || emailRows[0].locked_by_user_id !== user_id) {
            return res.status(403).json({ message: 'No tienes el bloqueo para guardar este correo.' });
        }
        await pool.execute('UPDATE emails_editable SET content_json = ?, last_modified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?', [JSON.stringify(updated_content), user_id, uuid]);
        res.json({ message: 'Contenido del correo editable actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA MODIFICADA ---
// Ruta para eliminar un correo editable por UUID
app.delete('/api/emails-editable/:uuid', protect, async (req, res) => {
    const { uuid } = req.params;
    const currentUserId = req.user.id;

    try {
        // Primero, verifica el estado de bloqueo del correo
        const [emailRows] = await pool.execute('SELECT is_locked, locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid]);

        if (emailRows.length === 0) {
            return res.status(404).json({ message: 'Correo editable no encontrado.' });
        }

        const email = emailRows[0];

        // Si el correo está bloqueado por OTRO usuario, impide la eliminación
        if (email.is_locked && email.locked_by_user_id !== currentUserId) {
            const [userRows] = await pool.execute('SELECT username FROM users WHERE id = ?', [email.locked_by_user_id]);
            const lockedByUsername = userRows.length > 0 ? userRows[0].username : 'otro usuario';
            return res.status(409).json({ message: `Este correo está siendo editado por ${lockedByUsername} y no se puede eliminar.` });
        }

        // Si no está bloqueado, o está bloqueado por el mismo usuario, permite la eliminación
        const [result] = await pool.execute('DELETE FROM emails_editable WHERE uuid = ?', [uuid]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Correo no encontrado para eliminar.' });
        }
        res.json({ message: 'Correo eliminado exitosamente.' });

    } catch (error) {
        console.error('Error al eliminar correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// Rutas para bloqueo y desbloqueo de edición
app.post('/api/emails-editable/:uuid/lock', protect, async (req, res) => {
    const { uuid } = req.params;
    const currentUserId = req.user.id;
    try {
        const [emailRows] = await pool.execute('SELECT is_locked, locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid]);
        if (emailRows.length === 0) return res.status(404).json({ message: 'Correo no encontrado.' });
        const email = emailRows[0];
        if (email.is_locked && email.locked_by_user_id !== currentUserId) {
            const [userRows] = await pool.execute('SELECT username FROM users WHERE id = ?', [email.locked_by_user_id]);
            const lockedByUsername = userRows.length > 0 ? userRows[0].username : 'otro usuario';
            return res.status(409).json({ message: `Este correo ya está bloqueado por ${lockedByUsername}.` });
        }
        await pool.execute('UPDATE emails_editable SET is_locked = 1, locked_by_user_id = ? WHERE uuid = ?', [currentUserId, uuid]);
        res.status(200).json({ message: 'Correo bloqueado para edición.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al bloquear el correo.' });
    }
});

app.post('/api/emails-editable/:uuid/unlock', protect, async (req, res) => {
    const { uuid } = req.params;
    const currentUserId = req.user.id;
    try {
        const [emailRows] = await pool.execute('SELECT locked_by_user_id FROM emails_editable WHERE uuid = ?', [uuid]);
        if (emailRows.length === 0) return res.status(404).json({ message: 'Correo no encontrado.' });
        const email = emailRows[0];
        if (email.locked_by_user_id === currentUserId) {
            await pool.execute('UPDATE emails_editable SET is_locked = 0, locked_by_user_id = NULL WHERE uuid = ?', [uuid]);
            res.status(200).json({ message: 'Correo desbloqueado.' });
        } else {
            res.status(403).json({ message: 'No tienes permiso para desbloquear este correo.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al desbloquear el correo.' });
    }
});

// --- Rutas de Gestión de Templates ---
// Ruta para obtener todos los templates (pública)
app.get('/api/templates', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, created_at FROM templates');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener lista de templates:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para obtener un template por ID y sus placeholders (protegida)
app.get('/api/templates/:id', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute('SELECT html_content FROM templates WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Template no encontrado.' });
        const templateHtml = rows[0].html_content;
        const placeholders = [];
        const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
        let match;
        while ((match = regex.exec(templateHtml)) !== null) {
            if (!placeholders.includes(match[1])) placeholders.push(match[1]);
        }
        res.json({ html_content: templateHtml, placeholders: placeholders });
    } catch (error) {
        console.error('Error al obtener template:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para crear un nuevo template (protegida por admin)
app.post('/api/templates', protect, admin, [
    body('name').isString().trim().notEmpty().isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres.'),
    body('html_content').isString().notEmpty().custom(value => {
        const placeholderRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
        if (!placeholderRegex.test(value)) throw new Error('Debe contener al menos un placeholder con el formato {{nombre_del_campo}}.');
        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, html_content } = req.body;
    const user_id = req.user.id;
    try {
        const [existingTemplate] = await pool.execute('SELECT id FROM templates WHERE name = ?', [name]);
        if (existingTemplate.length > 0) return res.status(409).json({ message: 'Ya existe un template con este nombre.' });
        await pool.execute('INSERT INTO templates (name, html_content, user_id) VALUES (?, ?, ?)', [name, html_content, user_id]);
        res.status(201).json({ message: 'Template creado exitosamente.' });
    } catch (error) {
        console.error('Error al crear template:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para actualizar un template existente (protegida por admin)
app.put('/api/templates/:id', protect, admin, [
    param('id').isInt().withMessage('ID de template inválido.'),
    body('name').isString().trim().notEmpty().isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres.'),
    body('html_content').isString().notEmpty().custom(value => {
        const placeholderRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
        if (!placeholderRegex.test(value)) throw new Error('Debe contener al menos un placeholder con el formato {{nombre_del_campo}}.');
        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, html_content } = req.body;

    try {
        const [existingName] = await pool.execute('SELECT id FROM templates WHERE name = ? AND id != ?', [name, id]);
        if (existingName.length > 0) return res.status(409).json({ message: 'Ya existe otro template con este nombre.' });

        const [result] = await pool.execute('UPDATE templates SET name = ?, html_content = ? WHERE id = ?', [name, html_content, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Template no encontrado para actualizar.' });
        res.json({ message: 'Template actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar template:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para eliminar un template por ID (protegida por admin)
app.delete('/api/templates/:id', protect, admin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM templates WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Template no encontrado para eliminar.' });
        res.json({ message: 'Template eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar template:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Conectar a la base de datos e iniciar el servidor
async function startServer() {
    try {
        pool = await mysql.createPool(dbConfig);
        console.log('Conectado a la base de datos MySQL!');
        app.listen(port, () => {
            console.log(`Servidor backend corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        process.exit(1);
    }
}
startServer();