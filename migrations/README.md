# Migrations SQL (Cloudflare D1)

As migrations SQL do banco D1 (tabelas `transactions`, `budgets`, `goals` com índices por `user_id`) serão criadas na Etapa 2.

Comandos úteis do D1:
- Local: `npx wrangler d1 migrations apply gasto-db --local`
- Remoto: `npx wrangler d1 migrations apply gasto-db --remote`
