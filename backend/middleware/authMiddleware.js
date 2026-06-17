const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_muy_segura'

// Middleware para verificar si el token JWT es válido y obtener la información del usuario
const protect = (req, res, next) => {
  const token = req.cookies.jwt_token

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded.user
    next()
  } catch (error) {
    // Si el token expira o falla, limpiamos la cookie por seguridad
    res.clearCookie('jwt_token')
    res.status(401).json({ message: 'No autorizado, token inválido o expirado.' })
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
