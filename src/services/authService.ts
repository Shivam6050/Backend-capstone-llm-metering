import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { ENV } from '../config/env';

if (!process.env.JWT_SECRET) {
  throw new Error('[authService] FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

export interface UserPayload {
  userId: string;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function createUser(name: string, email: string, passwordPlain: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await hashPassword(passwordPlain);
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
    },
  });

  // New users start with zero subscriptions — they add their own via the dashboard
  return user;
}

export async function loginUser(email: string, passwordPlain: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isMatch = await comparePassword(passwordPlain, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  return user;
}
