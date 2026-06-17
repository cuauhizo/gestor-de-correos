const statsService = require('../services/statsService')
const emailService = require('../services/emailService')
const catchAsync = require('../utils/catchAsync')

// GET /api/stats/totals
exports.getTotals = catchAsync(async (req, res) => {
  const totals = await statsService.getTotals()
  res.json(totals)
})

// GET /api/stats/recent-emails
exports.getRecentEmails = catchAsync(async (req, res) => {
  const allEmails = await emailService.getAllEmails()
  const recentEmails = allEmails.slice(0, 5)
  res.json(recentEmails)
})
