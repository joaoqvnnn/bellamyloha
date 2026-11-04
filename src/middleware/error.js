function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requisição muito grande.' });
  }
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um registro com este valor.' });
    }
  }
  res.status(err.status || 500).json({
    error: err.publicMessage || 'Erro interno. Tente novamente.',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
}

module.exports = { errorHandler, notFoundHandler };
