import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from '../services/authService';

export interface UserAuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function requireUserAuth(req: UserAuthenticatedRequest, res: Response, next: NextFunction) {
  // Extract token from HttpOnly cookie or Authorization header
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in to access your dashboard.',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Your session has expired or is invalid. Please sign in again.',
    });
  }

  req.user = payload;
  next();
}
