import { z } from 'zod';
import { decodeExpenseCursor, type ListExpensesFilter } from '../db/expenses';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function isValidIsoDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d
  );
}

export function getCurrentMonthInTimezone(timeZone = 'America/Sao_Paulo'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

export const IsoDateSchema = z
  .string()
  .trim()
  .refine(isValidIsoDate, { message: 'Data inválida. Use o formato YYYY-MM-DD.' });

export const MonthKeySchema = z
  .string()
  .trim()
  .regex(MONTH_REGEX, { message: 'Mês inválido. Use o formato YYYY-MM.' });

export const CreateExpenseSchema = z.object({
  amountCents: z
    .number()
    .int('O valor deve ser um número inteiro em centavos.')
    .positive('O valor deve ser maior que zero.')
    .max(100_000_000_00, 'Valor acima do limite permitido.'),
  expenseDate: IsoDateSchema,
  merchant: z
    .string()
    .trim()
    .min(1, 'Informe o estabelecimento ou descrição.')
    .max(160, 'Descrição muito longa (máximo 160 caracteres).'),
  categoryId: z.string().trim().min(1).nullable().optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres.')
    .nullable()
    .optional(),
  source: z.enum(['image', 'text', 'voice', 'manual']).default('manual'),
});

export const UpdateExpenseSchema = z
  .object({
    amountCents: z
      .number()
      .int('O valor deve ser um número inteiro em centavos.')
      .positive('O valor deve ser maior que zero.')
      .max(100_000_000_00, 'Valor acima do limite permitido.')
      .optional(),
    expenseDate: IsoDateSchema.optional(),
    merchant: z
      .string()
      .trim()
      .min(1, 'Informe o estabelecimento ou descrição.')
      .max(160, 'Descrição muito longa (máximo 160 caracteres).')
      .optional(),
    categoryId: z.string().trim().min(1).nullable().optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Observações devem ter no máximo 500 caracteres.')
      .nullable()
      .optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

const OptionalIntSchema = z
  .string()
  .trim()
  .optional()
  .transform((val, ctx) => {
    if (!val) return undefined;
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Valor monetário de filtro inválido.',
      });
      return z.NEVER;
    }
    return n;
  });

export const ExpensesQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v === 'all' || MONTH_REGEX.test(v), {
      message: 'Parâmetro month inválido.',
    }),
  from: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidIsoDate(v), {
      message: 'Parâmetro from inválido.',
    }),
  to: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidIsoDate(v), {
      message: 'Parâmetro to inválido.',
    }),
  category: z.string().trim().optional(),
  q: z.string().trim().max(120).optional(),
  min: OptionalIntSchema,
  max: OptionalIntSchema,
  cursor: z.string().trim().optional(),
  limit: z
    .string()
    .trim()
    .optional()
    .transform((val, ctx) => {
      if (!val) return 20;
      const n = Number(val);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Parâmetro limit deve estar entre 1 e 100.',
        });
        return z.NEVER;
      }
      return n;
    }),
});

export function parseExpensesFilterQuery(
  rawQuery: Record<string, string | undefined>
): { ok: true; filter: ListExpensesFilter } | { ok: false; message: string } {
  const parsed = ExpensesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Filtros de consulta inválidos.',
    };
  }

  let decodedCursor: ReturnType<typeof decodeExpenseCursor> | undefined;
  if (parsed.data.cursor) {
    const decoded = decodeExpenseCursor(parsed.data.cursor);
    if (!decoded) {
      return { ok: false, message: 'Cursor de paginação inválido.' };
    }
    decodedCursor = decoded;
  }

  return {
    ok: true,
    filter: {
      month: parsed.data.month || undefined,
      from: parsed.data.from || undefined,
      to: parsed.data.to || undefined,
      categoryId:
        parsed.data.category && parsed.data.category !== 'all'
          ? parsed.data.category
          : undefined,
      search: parsed.data.q || undefined,
      minCents: parsed.data.min,
      maxCents: parsed.data.max,
      cursor: decodedCursor ?? undefined,
      limit: parsed.data.limit,
    },
  };
}

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.')
    .max(40, 'O nome da categoria deve ter no máximo 40 caracteres.'),
  icon: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Ícone inválido.')
    .default('tag'),
  color: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, 'Informe uma cor hexadecimal válida (ex: #6D5EF5).'),
});

export const UpdateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.')
      .max(40, 'O nome da categoria deve ter no máximo 40 caracteres.')
      .optional(),
    icon: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9-]+$/, 'Ícone inválido.')
      .optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Informe uma cor hexadecimal válida.')
      .optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Informe ao menos um campo para atualizar a categoria.',
  });

export const UpsertBudgetSchema = z.object({
  categoryId: z.string().trim().min(1).nullable(),
  amountCents: z
    .number()
    .int('O orçamento deve ser um valor inteiro em centavos.')
    .min(0, 'O orçamento não pode ser negativo.')
    .max(100_000_000_00, 'Valor acima do limite permitido.'),
});
