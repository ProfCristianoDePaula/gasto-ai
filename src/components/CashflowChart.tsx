import { useState } from 'react';
import { ThemeMode } from '../types/finance';
import { CashflowPoint, formatBrl } from '../utils/finance';

interface CashflowChartProps {
  data: CashflowPoint[];
  theme: ThemeMode;
}

export function CashflowChart({ data, theme }: CashflowChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const width = 640;
  const height = 240;
  const padTop = 20;
  const padBottom = 34;
  const padLeft = 16;
  const padRight = 16;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const maxBar = Math.max(
    1000,
    ...data.flatMap((d) => [d.income, d.expense])
  );

  const groupWidth = chartWidth / Math.max(1, data.length);
  const barWidth = Math.min(22, groupWidth * 0.24);
  const barGap = 6;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const incomeColor = theme === 'dark' ? '#4edea3' : '#10B981';
  const expenseColor = '#6d5ef5';
  const gridColor =
    theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const labelColor = theme === 'dark' ? '#928ea1' : '#64748B';

  const activePoint = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-5 text-xs font-medium text-[#474555] dark:text-[#c8c4d7]">
          <span className="inline-flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: incomeColor }}
              aria-hidden="true"
            />
            Receitas
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: expenseColor }}
              aria-hidden="true"
            />
            Despesas
          </span>
        </div>

        <div className="min-h-[20px] text-xs tabular-nums text-[#474555] dark:text-[#c8c4d7]">
          {activePoint ? (
            <span>
              <strong className="font-semibold text-[#131b2e] dark:text-[#dae2fd]">
                {activePoint.label}
              </strong>
              {' · '}
              <span className="text-[#16A34A] dark:text-[#4edea3]">
                +{formatBrl(activePoint.income)}
              </span>
              {' · '}
              <span className="text-[#5442db] dark:text-[#c5c0ff]">
                -{formatBrl(activePoint.expense)}
              </span>
            </span>
          ) : (
            <span className="text-[#787586] dark:text-[#928ea1]">
              Passe o cursor sobre os períodos para detalhar
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 overflow-visible"
          role="img"
          aria-label="Gráfico comparativo de receitas e despesas por período"
        >
          {gridLines.map((ratio) => {
            const y = padTop + chartHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke={gridColor}
                strokeWidth="1"
              />
            );
          })}

          {data.map((point, idx) => {
            const centerX = padLeft + groupWidth * idx + groupWidth / 2;
            const incHeight = Math.max(
              point.income > 0 ? 4 : 0,
              (point.income / maxBar) * chartHeight
            );
            const expHeight = Math.max(
              point.expense > 0 ? 4 : 0,
              (point.expense / maxBar) * chartHeight
            );
            const baseY = padTop + chartHeight;
            const isHovered = activeIndex === idx;

            return (
              <g
                key={point.dateKey}
                className="cursor-pointer"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(idx)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                aria-label={`${point.label}: Receitas ${formatBrl(point.income)}, Despesas ${formatBrl(point.expense)}`}
              >
                <rect
                  x={padLeft + groupWidth * idx + 4}
                  y={padTop}
                  width={groupWidth - 8}
                  height={chartHeight}
                  rx="8"
                  fill={
                    isHovered
                      ? theme === 'dark'
                        ? 'rgba(197, 192, 255, 0.05)'
                        : 'rgba(84, 66, 219, 0.04)'
                      : 'transparent'
                  }
                />

                {/* Income Bar */}
                <rect
                  x={centerX - barWidth - barGap / 2}
                  y={baseY - incHeight}
                  width={barWidth}
                  height={incHeight}
                  rx="5"
                  fill={incomeColor}
                  opacity={activeIndex === null || isHovered ? 0.95 : 0.45}
                  className="transition-opacity duration-150"
                />

                {/* Expense Bar */}
                <rect
                  x={centerX + barGap / 2}
                  y={baseY - expHeight}
                  width={barWidth}
                  height={expHeight}
                  rx="5"
                  fill={expenseColor}
                  opacity={activeIndex === null || isHovered ? 0.95 : 0.45}
                  className="transition-opacity duration-150"
                />

                <text
                  x={centerX}
                  y={height - 10}
                  textAnchor="middle"
                  fill={
                    isHovered
                      ? theme === 'dark'
                        ? '#dae2fd'
                        : '#131b2e'
                      : labelColor
                  }
                  fontSize="11"
                  fontWeight={isHovered ? '600' : '500'}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
