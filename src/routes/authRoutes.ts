import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma, ensureDbInitialized } from '../db';
import { createUser, loginUser, generateToken, hashPassword } from '../services/authService';
import { validateRequest } from '../middleware/validate';
import { sendPasswordResetEmail } from '../services/emailService';
import { requireUserAuth, UserAuthenticatedRequest } from '../middleware/authMiddleware';

const authRouter = Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Sign Up
authRouter.post('/signup', validateRequest(signupSchema), async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    await ensureDbInitialized();
    const { name, email, password } = req.body;
    const user = await createUser(name, email, password);
    const tokenPayload = { userId: user.id, name: user.name, email: user.email };
    const token = generateToken(tokenPayload);

    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: 'SIGNUP_FAILED',
      message: err.message,
    });
  }
});

// Login
authRouter.post('/login', validateRequest(loginSchema), async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    await ensureDbInitialized();
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    const tokenPayload = { userId: user.id, name: user.name, email: user.email };
    const token = generateToken(tokenPayload);

    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'LOGIN_FAILED',
      message: err.message,
    });
  }
});

// Forgot Password
authRouter.post('/forgot-password', validateRequest(forgotPasswordSchema), async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body;

    // Always respond the same way regardless of whether user exists (prevent user enumeration)
    const GENERIC_RESPONSE = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    // Send email (or log to console in development — never returned in JSON response)
    await sendPasswordResetEmail({
      toEmail: user.email,
      toName: user.name,
      resetToken,
    });

    // SECURITY: Token is NEVER returned in the API response
    return res.status(200).json(GENERIC_RESPONSE);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'FORGOT_PASSWORD_FAILED',
      message: err.message,
    });
  }
});

// Reset Password
authRouter.post('/reset-password', validateRequest(resetPasswordSchema), async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired password reset token.',
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'RESET_PASSWORD_FAILED',
      message: err.message,
    });
  }
});

// Logout
authRouter.post('/logout', (req: UserAuthenticatedRequest, res: Response) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  return res.status(200).json({
    success: true,
    message: 'Signed out successfully',
  });
});

// Get Current Logged In User
authRouter.get('/me', requireUserAuth, (req: UserAuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

// ─── GDPR: Delete Account (Right to Erasure) ────────────────────────────────
// Permanently deletes the user's account and ALL associated data.
// Requires the user to be authenticated and confirm their password.
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm account deletion'),
});

authRouter.delete('/account', requireUserAuth, validateRequest(deleteAccountSchema), async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    // Fetch user to verify password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'Account not found.' });
    }

    // Verify password before deletion — prevents accidental or unauthorized deletion
    const { comparePassword } = await import('../services/authService');
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Incorrect password. Account deletion cancelled.',
      });
    }

    // Atomically delete all user data (GDPR Article 17 — Right to Erasure)
    await prisma.$transaction([
      prisma.usageEvent.deleteMany({ where: { tenantId: userId } }),
      prisma.userSubscription.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    // Clear auth cookie
    res.clearCookie('token', COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'DELETE_ACCOUNT_FAILED',
      message: err.message,
    });
  }
});

export { authRouter };

