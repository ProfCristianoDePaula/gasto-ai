import type { ExpenseWithCategoryRow } from '../db/expenses';

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  image: 'Foto',
  text: 'Texto',
  voice: 'Voz',
};

function formatDateBrFromIso(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function formatCentsCsvBr(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Escapa uma célula CSV para separador `;` e protege contra formula injection no Excel.
 */
export function escapeCsvCell(raw: string | null | undefined): string {
  let value = (raw ?? '').replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@\t]/.test(value)) {
    value = `'${value}`;
  }
  if (
    value.includes(';') ||
    value.includes('"') ||
    value.includes('\n')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Gera CSV compatível com Excel brasileiro (`;` + UTF-8 BOM `\uFEFF`).
 */
export function buildExpensesCsv(rows: ExpenseWithCategoryRow[]): string {
  const header = [
    'Data',
    'Estabelecimento',
    'Categoria',
    'Valor (R$)',
    'Origem',
    'Observações',
  ].join(';');

  const lines = rows.map((row) =>
    [
      escapeCsvCell(formatDateBrFromIso(row.expense_date)),
      escapeCsvCell(row.merchant ?? 'Sem descrição'),
      escapeCsvCell(row.category_name ?? 'Sem categoria'),
      escapeCsvCell(formatCentsCsvBr(row.amount_cents)),
      escapeCsvCell(SOURCE_LABELS[row.source] ?? row.source),
      escapeCsvCell(row.notes ?? ''),
    ].join(';')
  );

  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`;
}
