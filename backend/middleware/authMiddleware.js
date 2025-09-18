const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_muy_segura'

// Middleware para verificar si el token JWT es válido y obtener la información del usuario
const protect = (req, res, next) => {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded.user
    next()
  } catch (error) {
    res.status(401).json({ message: 'No autorizado, token fallido.' })
  }
}

// Middleware para verificar si el usuario tiene el rol de administrador
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(403).json({ message: 'No tienes permiso de administrador para realizar esta acción.' })
  }
}

module.exports = { protect, admin }
