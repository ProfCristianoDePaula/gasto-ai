import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCategoryBreakdown,
  computeCashflowSeries,
  computeFinancialInsight,
  computeSummary,
  filterTransactions,
  formatBrl,
  formatBrlParts,
  parseBrlInput,
} from './finance';
import { CategoryBudget, Transaction } from '../types/finance';

const sampleTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Salário Mensal',
    amount: 8500,
    type: 'income',
    category: 'outros',
    date: '2026-11-05',
    paymentMethod: 'Conta Corrente',
  },
  {
    id: '2',
    description: 'Supermercado',
    amount: 620.5,
    type: 'expense',
    category: 'alimentacao',
    date: '2026-11-07',
    paymentMethod: 'Nubank',
  },
  {
    id: '3',
    description: 'Uber Centro',
    amount: 45,
    type: 'expense',
    category: 'transporte',
    date: '2026-11-08',
    paymentMethod: 'Cartão Crédito',
  },
  {
    id: '4',
    description: 'Curso TypeScript',
    amount: 300,
    type: 'expense',
    category: 'educacao',
    date: '2026-11-12',
    paymentMethod: 'Pix',
  },
  {
    id: '5',
    description: 'Mês Anterior',
    amount: 1000,
    type: 'expense',
    category: 'lazer',
    date: '2026-10-20',
    paymentMethod: 'Nubank',
  },
];

const sampleBudgets: CategoryBudget[] = [
  { category: 'alimentacao', limit: 1500 },
  { category: 'transporte', limit: 400 },
  { category: 'educacao', limit: 350 },
  { category: 'lazer', limit: 500 },
  { category: 'outros', limit: 600 },
];

test('parseBrlInput handles Brazilian and decimal formats and rejects invalid values', () => {
  assert.equal(parseBrlInput('145,50'), 145.5);
  assert.equal(parseBrlInput('1.234,56'), 1234.56);
  assert.equal(parseBrlInput('R$ 89,90'), 89.9);
  assert.equal(parseBrlInput('200'), 200);
  assert.equal(parseBrlInput('0'), null);
  assert.equal(parseBrlInput('0,00'), null);
  assert.equal(parseBrlInput(''), null);
  assert.equal(parseBrlInput('-50'), null);
  assert.equal(parseBrlInput('abc'), null);
});

test('formatBrlParts produces optical R$ parts and signs', () => {
  const inc = formatBrlParts(1234.56, { type: 'income' });
  assert.equal(inc.sign, '+');
  assert.equal(inc.symbol, 'R$');
  assert.equal(inc.value, '1.234,56');

  const exp = formatBrlParts(95.4, { type: 'expense' });
  assert.equal(exp.sign, '-');
  assert.equal(exp.value, '95,40');

  assert.equal(formatBrl(1234.56), 'R$ 1.234,56');
});

test('computeSummary calculates scoped month balance, income, expenses, and savings rate', () => {
  const nov = computeSummary(sampleTransactions, '2026-11');
  assert.equal(nov.income, 8500);
  assert.equal(nov.expenses, 965.5);
  assert.equal(nov.balance, 7534.5);
  assert.equal(nov.transactionCount, 4);
  assert.ok(nov.savingsRate > 88);
});

test('computeCategoryBreakdown detects warning and over-budget statuses', () => {
  const breakdown = computeCategoryBreakdown(sampleTransactions, sampleBudgets, '2026-11');
  const edu = breakdown.find((b) => b.meta.id === 'educacao');
  assert.ok(edu);
  assert.equal(edu.spent, 300);
  assert.equal(edu.limit, 350);
  assert.equal(edu.status, 'warning'); // 300 / 350 = 85.7%

  const overTx: Transaction[] = [
    ...sampleTransactions,
    {
      id: '6',
      description: 'Show e Ingressos',
      amount: 650,
      type: 'expense',
      category: 'lazer',
      date: '2026-11-14',
      paymentMethod: 'Cartão Crédito',
    },
  ];
  const insight = computeFinancialInsight(overTx, sampleBudgets, '2026-11');
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

test('computeCashflowSeries returns 6 monthly buckets with cumulative progression', () => {
  const series = computeCashflowSeries(sampleTransactions, '2026-11');
  assert.equal(series.length, 6);
  assert.equal(series[0].income, 8500);
  assert.equal(series[1].expense, 665.5);
  assert.equal(series[5].cumulative, 7534.5);
});
