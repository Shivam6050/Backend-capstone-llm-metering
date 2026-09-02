export interface ExhaustionPrediction {
  subscriptionId: string;
  providerName: string;
  monthlyTokenAllowance: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentUtilized: number;
  dailyVelocityTokens: number;
  estimatedDaysRemaining: number | null; // null if velocity is 0
  predictedExhaustionDate: string | null;
  alertLevel: 'NORMAL' | 'WARNING_80' | 'CRITICAL_90' | 'EXHAUSTED_100';
  recommendation: string;
}

export function predictQuotaExhaustion(
  subscriptionId: string,
  providerName: string,
  monthlyTokenAllowance: number,
  tokensUsed: number,
  daysElapsed: number = 10
): ExhaustionPrediction {
  const safeDaysElapsed = Math.max(1, daysElapsed);
  const dailyVelocityTokens = Math.round(tokensUsed / safeDaysElapsed);
  const tokensRemaining = Math.max(0, monthlyTokenAllowance - tokensUsed);
  const percentUtilized = Math.min(100, Math.round((tokensUsed / monthlyTokenAllowance) * 100));

  let estimatedDaysRemaining: number | null = null;
  let predictedExhaustionDate: string | null = null;

  if (dailyVelocityTokens > 0) {
    estimatedDaysRemaining = Math.ceil(tokensRemaining / dailyVelocityTokens);
    const date = new Date();
    date.setDate(date.getDate() + estimatedDaysRemaining);
    predictedExhaustionDate = date.toLocaleDateString();
  }

  let alertLevel: ExhaustionPrediction['alertLevel'] = 'NORMAL';
  let recommendation = 'Usage is within normal limits.';

  if (percentUtilized >= 100) {
    alertLevel = 'EXHAUSTED_100';
    recommendation = 'Monthly quota has been 100% exhausted. Upgrade tier or wait for billing cycle reset.';
  } else if (percentUtilized >= 90) {
    alertLevel = 'CRITICAL_90';
    recommendation = `CRITICAL: 90% of quota used. Estimated depletion in ${estimatedDaysRemaining || '<1'} days.`;
  } else if (percentUtilized >= 80) {
    alertLevel = 'WARNING_80';
    recommendation = `WARNING: 80% of quota used. At current velocity, quota will exhaust in ~${estimatedDaysRemaining} days.`;
  }

  return {
    subscriptionId,
    providerName,
    monthlyTokenAllowance,
    tokensUsed,
    tokensRemaining,
    percentUtilized,
    dailyVelocityTokens,
    estimatedDaysRemaining,
    predictedExhaustionDate,
    alertLevel,
    recommendation,
  };
}
