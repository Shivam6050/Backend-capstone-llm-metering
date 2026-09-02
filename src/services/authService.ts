import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { ENV } from '../config/env';

const JWT_SECRET: string = process.env.JWT_SECRET || 'flyrank_default_jwt_secret_key_change_in_production_2026';
if (!process.env.JWT_SECRET) {
  console.warn('[authService] WARNING: JWT_SECRET environment variable is not set. Using default fallback key.');
}
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
    const error: any = new Error('An account with this email already exists. Please sign in instead.');
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
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
    const error: any = new Error('User does not exist. Please sign up first.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const isMatch = await comparePassword(passwordPlain, user.passwordHash);
  if (!isMatch) {
    const error: any = new Error('Incorrect password. Please check your password and try again.');
    error.code = 'INCORRECT_PASSWORD';
    throw error;
  }

  return user;
}
