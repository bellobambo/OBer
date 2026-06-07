function sendSuccess(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, statusCode, message, errors) {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = Array.isArray(errors) ? errors : [errors];
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  sendError,
  sendSuccess,
};
