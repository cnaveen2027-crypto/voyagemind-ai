import { CurrencyCode } from '../types/travel';

const SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  JPY: '¥',
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const symbol = SYMBOLS[currency] || '₹';
  const rounded = Math.round(Number(amount) || 0);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return `${symbol}${rounded.toLocaleString(locale)}`;
}
