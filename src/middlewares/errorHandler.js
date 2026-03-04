export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log for development
  console.error(`[Error Handler]: ${err.stack}`.red || err.stack);

  // Sequelize Unique Constraint Error (e.g., Duplicate Email)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Default Server Error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};