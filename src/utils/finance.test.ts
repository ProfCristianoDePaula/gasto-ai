import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCategoryBreakdown,
  computeCashflowSeries,
  computeFinancialInsight,
  computeSummary,
  filterTransactions,
  formatCents,
  formatCentsParts,
  formatDateBr,
  parseBrlInputToCents,
} from './finance';
import { CategoryBudget, Transaction } from '../types/finance';

const sampleTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Salário Mensal',
    amountCents: 850000,
    type: 'income',
    category: 'outros',
    date: '2026-11-05',
    paymentMethod: 'Conta Corrente',
  },
  {
    id: '2',
    description: 'Supermercado',
    amountCents: 62050,
    type: 'expense',
    category: 'alimentacao',
    date: '2026-11-07',
    paymentMethod: 'Nubank',
  },
  {
    id: '3',
    description: 'Uber Centro',
    amountCents: 4500,
    type: 'expense',
    category: 'transporte',
    date: '2026-11-08',
    paymentMethod: 'Cartão Crédito',
  },
  {
    id: '4',
    description: 'Curso TypeScript',
    amountCents: 30000,
    type: 'expense',
    category: 'educacao',
    date: '2026-11-12',
    paymentMethod: 'Pix',
  },
  {
    id: '5',
    description: 'Mês Anterior',
    amountCents: 100000,
    type: 'expense',
    category: 'lazer',
    date: '2026-10-20',
    paymentMethod: 'Nubank',
  },
];

const sampleBudgets: CategoryBudget[] = [
  { category: 'alimentacao', limitCents: 150000 },
  { category: 'transporte', limitCents: 40000 },
  { category: 'educacao', limitCents: 35000 },
  { category: 'lazer', limitCents: 50000 },
  { category: 'outros', limitCents: 60000 },
];

test('parseBrlInputToCents parses BRL to integer centavos and rejects invalid values', () => {
  assert.equal(parseBrlInputToCents('145,50'), 14550);
  assert.equal(parseBrlInputToCents('1.234,56'), 123456);
  assert.equal(parseBrlInputToCents('R$ 89,90'), 8990);
  assert.equal(parseBrlInputToCents('200'), 20000);
  assert.equal(parseBrlInputToCents('0'), null);
  assert.equal(parseBrlInputToCents('0,00'), null);
  assert.equal(parseBrlInputToCents(''), null);
  assert.equal(parseBrlInputToCents('-50'), null);
  assert.equal(parseBrlInputToCents('abc'), null);
});

test('formatCentsParts produces optical R$ parts from integer centavos', () => {
  const inc = formatCentsParts(123456, { type: 'income' });
  assert.equal(inc.sign, '+');
  assert.equal(inc.symbol, 'R$');
  assert.equal(inc.value, '1.234,56');

  const exp = formatCentsParts(9540, { type: 'expense' });
  assert.equal(exp.sign, '-');
  assert.equal(exp.value, '95,40');

  assert.equal(formatCents(123456), 'R$ 1.234,56');
  assert.equal(formatDateBr('2026-11-14'), '14/11/2026');
});

test('computeSummary calculates exact integer centavos totals without float drift', () => {
  const nov = computeSummary(sampleTransactions, '2026-11');
  assert.equal(nov.incomeCents, 850000);
  assert.equal(nov.expensesCents, 96550);
  assert.equal(nov.balanceCents, 753450);
  assert.equal(nov.transactionCount, 4);
  assert.ok(nov.savingsRate > 88);
});

test('computeCategoryBreakdown detects warning and over-budget statuses', () => {
  const breakdown = computeCategoryBreakdown(sampleTransactions, sampleBudgets, '2026-11');
  const edu = breakdown.find((b) => b.meta.id === 'educacao');
  assert.ok(edu);
  assert.equal(edu.spentCents, 30000);
  assert.equal(edu.limitCents, 35000);
  assert.equal(edu.status, 'warning');

  const overTx: Transaction[] = [
    ...sampleTransactions,
    {
      id: '6',
      description: 'Show e Ingressos',
      amountCents: 65000,
      type: 'expense',
      category: 'lazer',
      date: '2026-11-14',
      paymentMethod: 'Cartão Crédito',
    },
  ];
  const insight = computeFinancialInsight(overTx, sampleBudgets, '2026-11');
  assert.ok(insight);
  assert.equal(insight.tone, 'alert');
  assert.equal(insight.category, 'lazer');
});

test('filterTransactions filters by search, category, type, and monthKey', () => {
  const byCat = filterTransactions(sampleTransactions, {
    search: '',
    category: 'alimentacao',
    type: 'all',
    monthKey: '2026-11',
  });
  assert.equal(byCat.length, 1);
  assert.equal(byCat[0].description, 'Supermercado');

  const bySearch = filterTransactions(sampleTransactions, {
    search: 'uber',
    category: 'all',
    type: 'expense',
    monthKey: '2026-11',
  });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, '3');
});

test('computeCashflowSeries returns 6 monthly buckets in centavos', () => {
  const series = computeCashflowSeries(sampleTransactions, '2026-11');
  assert.equal(series.length, 6);
  assert.equal(series[0].incomeCents, 850000);
  assert.equal(series[1].expenseCents, 66550);
  assert.equal(series[5].cumulativeCents, 753450);
});
