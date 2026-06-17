const catchAsync = fn => {
  return (req, res, next) => {
    // Ejecuta la función y si hay un error, lo pasa a next()
    fn(req, res, next).catch(next)
  }
}

module.exports = catchAsync
