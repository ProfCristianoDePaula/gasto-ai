# Migrations SQL (Cloudflare D1)

A estrutura inicial está em `migrations/0001_init.sql`.

## Como aplicar localmente
```bash
npx wrangler d1 migrations apply gasto-db --local
```

## Como aplicar no banco remoto (produção)
1. Crie o banco D1 na sua conta Cloudflare (caso ainda não exista):
   ```bash
   npx wrangler d1 create gasto-db
   ```
2. Copie o `database_id` retornado e cole em `wrangler.jsonc` no campo `d1_databases[0].database_id`.
3. Aplique a migration remotamente:
   ```bash
   npx wrangler d1 migrations apply gasto-db --remote
   ```
