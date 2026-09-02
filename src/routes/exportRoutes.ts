import { Router, Response } from 'express';
import { prisma } from '../db';
import { requireUserAuth, UserAuthenticatedRequest } from '../middleware/authMiddleware';

const exportRouter = Router();

// Export CSV Report
exportRouter.get('/csv', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = [
      ['Subscription ID', 'Provider Name', 'Plan Name', 'Monthly Cost ($USD)', 'Allowance (Tokens)', 'Tokens Used', 'Tokens Remaining', 'Utilized (%)', 'Renewal Date'].join(','),
    ];

    for (const sub of subscriptions) {
      const remaining = Math.max(0, sub.monthlyTokenAllowance - sub.tokensUsed);
      const percent = Math.min(100, Math.round((sub.tokensUsed / sub.monthlyTokenAllowance) * 100));
      const costUsd = (sub.monthlyCostCents / 100).toFixed(2);

      csvRows.push([
        `"${sub.id}"`,
        `"${sub.providerName}"`,
        `"${sub.planName}"`,
        costUsd,
        sub.monthlyTokenAllowance,
        sub.tokensUsed,
        remaining,
        `${percent}%`,
        `"${sub.renewalDate.toISOString().split('T')[0]}"`,
      ].join(','));
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ai_subscriptions_report_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'EXPORT_CSV_FAILED',
      message: err.message,
    });
  }
});

// Export Formatted Invoice
exportRouter.get('/invoice', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const subscriptions = await prisma.userSubscription.findMany({ where: { userId } });

    let totalCents = 0;
    const lineItems = subscriptions.map((s) => {
      totalCents += s.monthlyCostCents;
      return {
        provider: s.providerName,
        plan: s.planName,
        allowance: `${s.monthlyTokenAllowance.toLocaleString()} tokens`,
        amountUsd: `$${(s.monthlyCostCents / 100).toFixed(2)}`,
      };
    });

    const invoice = {
      invoiceNumber: `INV-FLY-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString(),
      customerName: user?.name || 'Valued Customer',
      customerEmail: user?.email,
      lineItems,
      subtotalUsd: `$${(totalCents / 100).toFixed(2)}`,
      taxUsd: '$0.00',
      totalUsd: `$${(totalCents / 100).toFixed(2)}`,
      paymentStatus: 'PAID',
    };

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'EXPORT_INVOICE_FAILED',
      message: err.message,
    });
  }
});

export { exportRouter };
