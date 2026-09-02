export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY';

export interface CurrencyRate {
  code: CurrencyCode;
  symbol: string;
  rateToUsd: number; // multiplier from USD
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyRate> = {
  USD: { code: 'USD', symbol: '$', rateToUsd: 1.0 },
  EUR: { code: 'EUR', symbol: '€', rateToUsd: 0.92 },
  GBP: { code: 'GBP', symbol: '£', rateToUsd: 0.79 },
  INR: { code: 'INR', symbol: '₹', rateToUsd: 83.2 },
  JPY: { code: 'JPY', symbol: '¥', rateToUsd: 155.5 },
};

export function convertUsdToCurrency(amountUsd: number, targetCurrency: CurrencyCode = 'USD'): {
  amount: number;
  formatted: string;
  currency: CurrencyCode;
  symbol: string;
} {
  const curr = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES.USD;
  const convertedAmount = amountUsd * curr.rateToUsd;

  let formatted = '';
  if (targetCurrency === 'JPY') {
    formatted = `${curr.symbol}${Math.round(convertedAmount).toLocaleString()}`;
  } else if (targetCurrency === 'INR') {
    formatted = `${curr.symbol}${convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    formatted = `${curr.symbol}${convertedAmount.toFixed(2)}`;
  }

  return {
    amount: convertedAmount,
    formatted,
    currency: curr.code,
    symbol: curr.symbol,
  };
}
