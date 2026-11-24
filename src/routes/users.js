import { Router } from 'express';
import Joi from 'joi';
import { prisma } from '../config/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).required(),
  role: Joi.string().valid('USER', 'ADMIN').optional(),
});

const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(1).optional(),
  role: Joi.string().valid('USER', 'ADMIN').optional(),
});

// GET /api/users — Список с пагинацией
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — Пользователь с постами (сортировка по убыванию даты)
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users — Создать пользователя
router.post('/', validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.create({
      data: req.body,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id — Обновить пользователя
router.patch('/:id', validate(updateUserSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.update({
      where: { id },
      data: req.body,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id — Удалить пользователя
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;