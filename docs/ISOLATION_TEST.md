# Prova de Isolamento Multi-Tenant (Usuário A vs. Usuário B)

O Gastô garante isolamento estrito por usuário em três camadas:

1. **Autenticação no Worker (`/worker/middleware/auth.ts`)**: toda rota `/api/*` (exceto `/api/health`) valida o JWT Bearer do Supabase com `jose` (JWKS ou `SUPABASE_JWT_SECRET`), checando assinatura, `issuer`, `exp` e `sub`. O `userId` injetado no contexto vem exclusivamente do claim `sub` assinado — parâmetros ou corpos enviados pelo cliente nunca definem `user_id`.
2. **Consultas no D1 (`/worker/db/*.ts`)**: todas as queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) filtram explicitamente por `WHERE user_id = ?` usando *prepared statements*.
3. **Bucket R2 privado (`RECEIPTS`)**: ao executar `DELETE /api/me/data`, apenas as `image_key` vinculadas às despesas do `userId` autenticado e o prefixo `${userId}/` são removidos.

---

## 1. Teste Automatizado (SQLite + Hono + JWT reais)

Execute a suíte de testes de autenticação e isolamento:

```bash
npx tsx --test worker/middleware/auth.test.ts worker/isolation.test.ts
```

O teste `worker/isolation.test.ts` executa `/migrations/0001_init.sql` em SQLite real, assina dois JWTs distintos (`user-a-uuid` e `user-b-uuid`) e comprova que:
- Requisições sem token ou com token inválido retornam `401` genérico;
- `GET /api/me` cria 5 categorias padrão separadas para cada `user_id`;
- O usuário B não consegue ler, alterar nem excluir despesas, orçamentos ou regras do usuário A;
- `DELETE /api/me/data` com o token do usuário B exige a confirmação `"EXCLUIR MEUS DADOS"`, remove apenas os registros e objetos R2 do usuário B e mantém intactos 100% dos dados e arquivos do usuário A.

---

## 2. Verificação Manual Ponta a Ponta (Dois Usuários Reais)

1. Crie dois usuários no Supabase Auth (`usuarioA@teste.com` e `usuarioB@teste.com`) pela tela **Criar conta** em `/login`.
2. Obtenha o `access_token` de cada usuário (ex.: via resposta de `/auth/v1/token?grant_type=password` no DevTools ou `curl`):
   ```bash
   TOKEN_A="..."
   TOKEN_B="..."
   ```
3. Chame `GET /api/me` para ambos:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN_A" http://localhost:3000/api/me
   curl -s -H "Authorization: Bearer $TOKEN_B" http://localhost:3000/api/me
   ```
4. Insira uma despesa de teste diretamente no D1 para o `user.id` de A (ou via UI nas etapas seguintes) e verifique via D1 local que há dois `user_id` distintos:
   ```bash
   npx wrangler d1 execute gasto-db --local --command \
     "SELECT user_id, COUNT(*) AS categorias FROM categories GROUP BY user_id;"
   ```
5. Execute `DELETE /api/me/data` autenticado como **Usuário B** (primeiro sem confirmação para comprovar `400`, depois com `"EXCLUIR MEUS DADOS"`):
   ```bash
   curl -i -X DELETE http://localhost:3000/api/me/data \
     -H "Authorization: Bearer $TOKEN_B" \
     -H "Content-Type: application/json" \
     -d '{"confirmation":"EXCLUIR MEUS DADOS"}'
   ```
6. Confirme no D1 que os dados do **Usuário A** permaneceram intactos:
   ```bash
   npx wrangler d1 execute gasto-db --local --command \
     "SELECT user_id, COUNT(*) AS despesas FROM expenses GROUP BY user_id;"
   ```
