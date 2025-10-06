const express = require('express')
const router = express.Router()
const statsController = require('../controllers/statsController')
const { protect } = require('../middleware/authMiddleware')

// Todas las rutas de estadísticas requieren estar autenticado
router.use(protect)

router.get('/totals', statsController.getTotals)
router.get('/recent-emails', statsController.getRecentEmails)

module.exports = router
