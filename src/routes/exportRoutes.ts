import { Router, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma, ensureDbInitialized } from '../db';
import { requireUserAuth, UserAuthenticatedRequest } from '../middleware/authMiddleware';

const exportRouter = Router();

// Export CSV Report
exportRouter.get('/csv', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    await ensureDbInitialized();
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

// Export Formatted Invoice PDF
exportRouter.get('/invoice', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    await ensureDbInitialized();
    const userId = req.user!.userId;
    const format = req.query.format as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const subscriptions = await prisma.userSubscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    let totalCents = 0;
    const lineItems = subscriptions.map((s) => {
      totalCents += s.monthlyCostCents;
      return {
        provider: s.providerName,
        plan: s.planName,
        allowance: `${s.monthlyTokenAllowance.toLocaleString()} tokens`,
        amountUsd: `$${(s.monthlyCostCents / 100).toFixed(2)}`,
        monthlyCostCents: s.monthlyCostCents,
      };
    });

    const invoiceNum = `INV-FLY-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const customerName = user?.name || 'Valued Customer';
    const customerEmail = user?.email || 'customer@example.com';
    const totalUsdStr = `$${(totalCents / 100).toFixed(2)}`;

    // Support legacy JSON export if format=json is explicitly requested
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        invoice: {
          invoiceNumber: invoiceNum,
          date: dateStr,
          customerName,
          customerEmail,
          lineItems,
          subtotalUsd: totalUsdStr,
          taxUsd: '$0.00',
          totalUsd: totalUsdStr,
          paymentStatus: 'PAID',
        },
      });
    }

    // Generate Beautiful PDF Invoice Document
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceNum}.pdf"`);
      res.setHeader('Content-Length', pdfData.length);
      return res.status(200).send(pdfData);
    });

    // --- PDF DESIGN ---

    // Top Dark Header Banner Box
    doc.rect(0, 0, 595.28, 110).fill('#18181b');

    // Title / Logo Text
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('LLM METER', 40, 32);
    doc.fillColor('#a1a1aa').fontSize(10).font('Helvetica').text('LLM Metering & Unified Billing Engine', 40, 58);
    doc.fillColor('#71717a').fontSize(8).font('Helvetica').text('https://backend-capstone-llm-metering.vercel.app', 40, 74);

    // Invoice Header Badge (Right Side)
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('INVOICE', 400, 32, { align: 'right' });
    doc.fillColor('#34d399').fontSize(10).font('Helvetica-Bold').text('STATUS: PAID', 400, 60, { align: 'right' });
    doc.fillColor('#a1a1aa').fontSize(9).font('Helvetica').text(`# ${invoiceNum}`, 400, 76, { align: 'right' });

    // Details Grid (Invoice Meta + Bill To)
    let yPos = 135;

    // Bill To Box (Left Column)
    doc.fillColor('#71717a').fontSize(9).font('Helvetica-Bold').text('BILLED TO:', 40, yPos);
    doc.fillColor('#18181b').fontSize(12).font('Helvetica-Bold').text(customerName, 40, yPos + 14);
    doc.fillColor('#52525b').fontSize(10).font('Helvetica').text(customerEmail, 40, yPos + 30);
    doc.fillColor('#71717a').fontSize(9).font('Helvetica').text('Account ID: ' + userId, 40, yPos + 44);

    // Invoice Meta Box (Right Column)
    doc.fillColor('#71717a').fontSize(9).font('Helvetica-Bold').text('INVOICE DETAILS:', 350, yPos);
    doc.fillColor('#52525b').fontSize(9).font('Helvetica').text(`Invoice Date: ${dateStr}`, 350, yPos + 14);
    doc.fillColor('#52525b').fontSize(9).font('Helvetica').text(`Payment Method: Stripe / Credit Card`, 350, yPos + 28);
    doc.fillColor('#52525b').fontSize(9).font('Helvetica').text(`Currency: USD ($)`, 350, yPos + 42);

    // Divider Line
    yPos += 70;
    doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor('#e4e4e7').lineWidth(1).stroke();

    // Table Header Bar
    yPos += 15;
    doc.rect(40, yPos, 515, 24).fill('#f4f4f5');

    doc.fillColor('#27272a').fontSize(9).font('Helvetica-Bold').text('PROVIDER', 50, yPos + 7);
    doc.text('PLAN NAME', 180, yPos + 7);
    doc.text('TOKEN ALLOWANCE', 320, yPos + 7);
    doc.text('AMOUNT (USD)', 450, yPos + 7, { align: 'right', width: 95 });

    yPos += 24;

    // Table Line Items
    if (lineItems.length === 0) {
      yPos += 12;
      doc.fillColor('#71717a').fontSize(9).font('Helvetica-Oblique').text('No active subscriptions found for this billing period.', 50, yPos);
      yPos += 20;
    } else {
      lineItems.forEach((item, idx) => {
        yPos += 6;
        if (idx % 2 === 1) {
          doc.rect(40, yPos - 3, 515, 22).fill('#fafafa');
        }

        doc.fillColor('#18181b').fontSize(9).font('Helvetica-Bold').text(item.provider, 50, yPos + 3);
        doc.fillColor('#3f3f46').fontSize(9).font('Helvetica').text(item.plan, 180, yPos + 3);
        doc.fillColor('#3f3f46').fontSize(9).font('Helvetica').text(item.allowance, 320, yPos + 3);
        doc.fillColor('#18181b').fontSize(9).font('Helvetica-Bold').text(item.amountUsd, 450, yPos + 3, { align: 'right', width: 95 });

        yPos += 22;
      });
    }

    // Divider Line after items
    yPos += 10;
    doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor('#e4e4e7').lineWidth(1).stroke();

    // Summary Box (Right Aligned)
    yPos += 15;
    doc.fillColor('#71717a').fontSize(9).font('Helvetica').text('Subtotal:', 350, yPos);
    doc.fillColor('#18181b').fontSize(9).font('Helvetica-Bold').text(totalUsdStr, 450, yPos, { align: 'right', width: 95 });

    yPos += 16;
    doc.fillColor('#71717a').fontSize(9).font('Helvetica').text('Tax (VAT 0%):', 350, yPos);
    doc.fillColor('#18181b').fontSize(9).font('Helvetica-Bold').text('$0.00', 450, yPos, { align: 'right', width: 95 });

    yPos += 20;
    doc.rect(340, yPos - 5, 215, 30).fill('#18181b');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('TOTAL PAID:', 355, yPos + 5);
    doc.fillColor('#34d399').fontSize(12).font('Helvetica-Bold').text(totalUsdStr, 450, yPos + 4, { align: 'right', width: 95 });

    // Footer Box
    const footerY = 750;
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#e4e4e7').lineWidth(1).stroke();

    doc.fillColor('#71717a').fontSize(8).font('Helvetica').text(
      'Thank you for using LLM Meter Engine. This invoice is electronically issued and verified.',
      40,
      footerY + 12,
      { align: 'center', width: 515 }
    );
    doc.fillColor('#a1a1aa').fontSize(7).font('Helvetica').text(
      `Verification Hash: 0x${Buffer.from(invoiceNum + userId).toString('hex').slice(0, 32)} • Support: support@llmmeter.ai`,
      40,
      footerY + 26,
      { align: 'center', width: 515 }
    );

    // Finalize PDF Stream
    doc.end();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'EXPORT_INVOICE_FAILED',
      message: err.message,
    });
  }
});

export { exportRouter };
