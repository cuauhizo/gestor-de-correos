// backend/server.js
require('dotenv').config(); // Carga las variables de entorno
const express = require('express');
const mysql = require('mysql2/promise'); // Usamos la versión de promesas para async/await
const cors = require('cors');

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

// --- Rutas para la gestión de correos editables ---
// Ruta para crear un nuevo correo editable
app.post('/api/emails-editable', async (req, res) => {
    const { template_id, initial_content } = req.body;
    const uuid = require('uuid').v4(); // Genera un UUID único

    if (!template_id || !initial_content) {
        return res.status(400).json({ message: 'Se requieren template_id y initial_content.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO emails_editable (uuid, template_id, content_json) VALUES (?, ?, ?)',
            [uuid, template_id, JSON.stringify(initial_content)] // Guarda el JSON como string
        );
        res.status(201).json({ uuid, id: result.insertId, message: 'Correo editable creado exitosamente.', edit_url: `/editar-correo/${uuid}` });
    } catch (error) {
        console.error('Error al crear correo editable:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear correo editable.' });
    }
});

// Ruta para obtener un correo editable por UUID (para el editor)
app.get('/api/emails-editable/:uuid', async (req, res) => {
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

// Ruta para actualizar el contenido de un correo editable
app.put('/api/emails-editable/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const { updated_content } = req.body;

    if (!updated_content) {
        return res.status(400).json({ message: 'Se requiere updated_content.' });
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
});


// Ruta para obtener el HTML de un template base
app.get('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id); // Debugging: Verifica el ID recibido
    try {
        const [rows] = await pool.execute(
            'SELECT html_content FROM templates WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Template no encontrado.' });
        }
        res.json(rows[0]); // Devuelve { html_content: '...' }
    } catch (error) {
        console.error('Error al obtener template:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener template.' });
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