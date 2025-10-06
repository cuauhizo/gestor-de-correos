const statsService = require('../services/statsService')
const emailService = require('../services/emailService') // Reutilizaremos para los correos recientes

// GET /api/stats/totals
exports.getTotals = async (req, res) => {
  try {
    const totals = await statsService.getTotals()
    res.json(totals)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las estadísticas.' })
  }
}

// GET /api/stats/recent-emails
exports.getRecentEmails = async (req, res) => {
  try {
    // Reutilizamos la función que ya teníamos y tomamos solo los 5 más recientes
    const allEmails = await emailService.getAllEmails()
    const recentEmails = allEmails.slice(0, 5)
    res.json(recentEmails)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los correos recientes.' })
  }
}
