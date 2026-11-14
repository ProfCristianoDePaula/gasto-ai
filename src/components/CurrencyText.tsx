import { formatBrlParts } from '../utils/finance';

interface CurrencyTextProps {
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  signed?: boolean;
  className?: string;
  symbolClassName?: string;
}

export function CurrencyText({
  amount,
  type = 'neutral',
  signed = false,
  className = '',
  symbolClassName = '',
}: CurrencyTextProps) {
  const { sign, symbol, value } = formatBrlParts(amount, { signed, type });

  return (
    <span className={`inline-flex items-baseline tabular-nums whitespace-nowrap ${className}`}>
      {sign && <span className="mr-1">{sign}</span>}
      <span className={`text-[0.72em] opacity-70 font-semibold mr-1 ${symbolClassName}`}>
        {symbol}
      </span>
      <span>{value}</span>
    </span>
  );
}
