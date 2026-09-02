import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/security';
import { getTenantMonthlyUsage, getMultiProviderUsage } from '../services/quotaService';

const usageRouter = Router();

async function handleGetUsage(req: AuthenticatedRequest, res: Response) {
  const tenantId = (req.query.tenantId || req.tenantId || req.headers['x-tenant-id']) as string;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_TENANT_ID',
      message: 'tenantId is required either as a query parameter (e.g. ?tenantId=tenant_free) or X-Tenant-ID header.',
    });
  }

  try {
    const summary = await getTenantMonthlyUsage(tenantId);
    return res.status(200).json({
      success: true,
      tenantId: summary.tenantId,
      plan: summary.plan,
      status: summary.status,
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
      used: summary.used,
      limits: summary.limits,
      cost: summary.cost,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      error: 'TENANT_NOT_FOUND',
      message: error.message,
    });
  }
}

async function handleGetMultiProviderUsage(req: AuthenticatedRequest, res: Response) {
  const tenantId = (req.query.tenantId || req.tenantId || req.headers['x-tenant-id']) as string;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_TENANT_ID',
      message: 'tenantId is required.',
    });
  }

  try {
    const multiSummary = await getMultiProviderUsage(tenantId);
    return res.status(200).json({
      success: true,
      ...multiSummary,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      error: 'TENANT_NOT_FOUND',
      message: error.message,
    });
  }
}

// Support both /api/v1/usage and /usage
usageRouter.get('/api/v1/usage', handleGetUsage);
usageRouter.get('/usage', handleGetUsage);

// Support multi-provider usage endpoint
usageRouter.get('/api/v1/providers/usage', handleGetMultiProviderUsage);
usageRouter.get('/providers/usage', handleGetMultiProviderUsage);

export { usageRouter };
