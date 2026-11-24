export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Ошибка уникальности (например, дубликат email)
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: `Запись с таким полем (${err.meta?.target}) уже существует`,
    });
  }

  // Запись не найдена при обновлении/удалении или связывании
  if (err.code === 'P2025' || err.code === 'P2003') {
    return res.status(404).json({
      message: 'Связанная запись или объект не найдены',
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Внутренняя ошибка сервера',
  });
};