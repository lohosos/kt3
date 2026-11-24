import { Router } from 'express';
import Joi from 'joi';
import { prisma } from '../config/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Валидация согласно заданию: title обязательный, authorId обязательный и числовой
const createPostSchema = Joi.object({
  title: Joi.string().min(1).required(),
  content: Joi.string().allow('', null).optional(),
  published: Joi.boolean().optional(),
  authorId: Joi.number().integer().required(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1).optional(),
  content: Joi.string().allow('', null).optional(),
  published: Joi.boolean().optional(),
  authorId: Joi.number().integer().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

// GET /api/posts — Список с фильтрацией и пагинацией
router.get('/', async (req, res, next) => {
  try {
    const { search, published, authorId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive', // Примечание: в SQLite Prisma игнорирует или не поддерживает mode: 'insensitive' в некоторых версиях — см. комментарий ниже
      };
    }

    if (published !== undefined) {
      where.published = published === 'true';
    }

    if (authorId !== undefined) {
      where.authorId = parseInt(authorId);
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: true,
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      data: posts,
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

// GET /api/posts/:id — Пост с автором и тегами
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        tags: true,
      },
    });

    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
});

// POST /api/posts — Создать пост с тегами через connectOrCreate
router.post('/', validate(createPostSchema), async (req, res, next) => {
  try {
    const { title, content, published, authorId, tags = [] } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        authorId,
        tags: {
          connectOrCreate: tags.map((tagName) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      },
      include: {
        author: true,
        tags: true,
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/posts/:id — Обновить пост
router.patch('/:id', validate(updatePostSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content, published, authorId, tags } = req.body;

    const data = { title, content, published, authorId };

    if (tags) {
      data.tags = {
        set: [], // Очищаем старые связи
        connectOrCreate: tags.map((tagName) => ({
          where: { name: tagName },
          create: { name: tagName },
        })),
      };
    }

    const post = await prisma.post.update({
      where: { id },
      data,
      include: {
        author: true,
        tags: true,
      },
    });

    res.json(post);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id — Удалить пост
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.post.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;