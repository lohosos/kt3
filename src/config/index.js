import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
};

export const prisma = new PrismaClient();