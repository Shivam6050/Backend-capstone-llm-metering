import React from 'react';
import { Globe } from 'lucide-react';

interface CurrencySelectorProps {
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
];

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currentCurrency,
  onCurrencyChange,
}) => {
  return (
    <div className="flex items-center space-x-1.5 bg-zinc-900/90 px-2.5 py-1 rounded border border-zinc-800 shadow-sm">
      <Globe className="w-3.5 h-3.5 text-zinc-400" />
      <select
        value={currentCurrency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="bg-transparent text-xs font-mono font-semibold text-zinc-200 focus:outline-none cursor-pointer"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code} className="bg-zinc-900 text-zinc-200 font-mono">
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
};
