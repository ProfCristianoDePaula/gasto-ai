import { Hono } from 'hono';
import { DEFAULT_TIMEZONE } from '../config';
import { getDashboardData } from '../db';
import { AppError } from '../errors';
import type { HonoAppEnv } from '../types';
import {
  getCurrentMonthInTimezone,
  MonthKeySchema,
} from '../utils/validation';

export function registerDashboardRoutes(app: Hono<HonoAppEnv>) {
  /**
   * GET /api/dashboard?month=YYYY-MM — Retorna indicadores calculados em SQL agregado.
   */
  app.get('/api/dashboard', async (c) => {
    const userId = c.get('userId');
    const timezone = c.env?.APP_TIMEZONE || DEFAULT_TIMEZONE;
    const rawMonth = c.req.query('month');

    let month: string;
    if (!rawMonth) {
      month = getCurrentMonthInTimezone(timezone);
    } else {
      const parsed = MonthKeySchema.safeParse(rawMonth);
      if (!parsed.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          parsed.error.issues[0]?.message ?? 'Mês inválido. Use YYYY-MM.'
        );
      }
      month = parsed.data;
    }

    const dashboard = await getDashboardData(c.env.DB, userId, month);
    return c.json(dashboard);
  });
}
