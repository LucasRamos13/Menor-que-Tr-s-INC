# Menor que Três

Aplicativo web privado para um casal centralizar **finanças, agenda, tarefas,
objetivos e datas importantes** em um só lugar — incluindo sincronização
bidirecional com o Google Calendar.

Pensado para duas pessoas, mas construído sobre o conceito de **casal**
(`couples`) em vez de dados presos a um único usuário, então oferecer isso a
mais de um casal no futuro é uma questão de produto, não uma reescrita.

## Funcionalidades

- 💰 **Finanças**: contas (correntes, poupança, carteira, cartão,
  investimento), transações (receita/despesa/transferência), categorias
  personalizáveis, despesas/receitas recorrentes, parcelamentos, orçamento
  mensal por categoria com barra de progresso, dashboard com saldo e
  comparação mês a mês.
- ✅ **Tarefas**: listas personalizadas, prioridade, responsável, data
  limite, filtros rápidos (hoje/atrasadas/minhas/do par), quadro com
  concluídas recolhíveis.
- 📅 **Calendário**: eventos internos (dia inteiro, local, participantes,
  visibilidade pessoal/compartilhada) com visão de mês e agenda, **+
  sincronização bidirecional com o Google Calendar** (ver
  [docs/google-calendar.md](docs/google-calendar.md)).
- 🎯 **Objetivos financeiros**: meta, progresso visual, contribuições
  registradas ao longo do tempo.
- ❤️ **Datas importantes**: aniversários, datas comemorativas, datas anuais com
  contagem regressiva.
- 👫 **Espaço do casal**: convite por código para o parceiro(a) entrar no
  mesmo espaço; dados marcados como pessoais ou compartilhados.
- 🔎 Busca global, dark mode, mensagens de erro amigáveis, confirmação antes
  de excluir, feedback visual "✓ Salvo" / "✓ Sincronizado".

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + React |
| UI | Tailwind CSS v4 + componentes próprios no estilo shadcn/ui + Lucide Icons |
| Backend / banco | Supabase (PostgreSQL + Auth + Row Level Security) |
| Login | Google OAuth via Supabase Auth (único método de login) |
| Integração externa | Google Calendar API (OAuth próprio, ver docs) |
| Deploy | Cloudflare (via `@opennextjs/cloudflare`, o caminho atual recomendado pela Cloudflare para hospedar Next.js — ver nota abaixo) |
| Testes | Vitest |

> **Nota sobre "Cloudflare Pages"**: o adaptador histórico
> `@cloudflare/next-on-pages` está em modo de manutenção; a Cloudflare hoje
> recomenda `@opennextjs/cloudflare` para hospedar aplicações Next.js
> completas (SSR + Route Handlers) tanto em projetos Pages quanto Workers.
> Este projeto usa esse caminho para manter build e deploy 100% gratuitos na
> Cloudflare — a experiência de deploy (conectar o repositório GitHub, build
> automático a cada push) é a mesma.
>
> **Limitação conhecida em Windows**: `npm run pages:build` (o comando que
> gera o bundle específico da Cloudflare via `@opennextjs/cloudflare`) tem um
> bug conhecido no Windows ao empacotar o middleware — o próprio pacote avisa
> "OpenNext is not fully compatible with Windows" e recomenda WSL/Linux/macOS.
> Isso **não afeta** `npm run build` (o build padrão do Next.js, usado para
> validar o código — funciona normalmente em qualquer sistema) nem o deploy
> real: a Cloudflare executa o build no próprio servidor (Linux), então o
> deploy via GitHub funciona independentemente do sistema operacional de quem
> desenvolve localmente. Se quiser rodar `pages:build`/`preview` localmente em
> uma máquina Windows, use o WSL com uma distribuição Linux completa (não a
> distro interna do Docker Desktop).

## Arquitetura

```
UI (app/**, components/**)
   ↓
Application Services (services/**)      ← regra de negócio + chamadas ao Supabase
   ↓
Supabase (PostgreSQL + Auth + RLS) / Google Calendar API (lib/google/**)
```

- **`src/app`** — rotas (App Router). Páginas são majoritariamente Server
  Components que buscam dados iniciais e delegam interatividade a
  componentes cliente locais (ex: `finance/accounts-manager.tsx`).
- **`src/components`** — `ui/` (primitivos tipo shadcn — Button, Input,
  Dialog, etc., sem dependência de Radix), `layout/` (sidebar, navegação
  mobile, topbar), `shared/` (EmptyState, ConfirmDialog, CurrencyInput,
  busca global), e pastas por domínio (`finance/`, `tasks/`, `calendar/`,
  `goals/`) para diálogos de formulário reutilizados entre páginas.
- **`src/services`** — toda a lógica de negócio e acesso a dados, organizada
  por domínio (`services/finance`, `services/tasks`, `services/calendar`,
  `services/couples`). Cada função recebe um `SupabaseClient` já
  autenticado como parâmetro — funciona tanto a partir de Server Components
  quanto de código cliente, e facilita testar a lógica pura isoladamente
  (ex: `services/finance/recurrence.ts`, `services/calendar/google-mapping.ts`).
- **`src/lib`** — infraestrutura transversal: clientes Supabase
  (`lib/supabase/*`), cliente Google Calendar via `fetch` puro
  (`lib/google/*`), dinheiro em centavos (`lib/money.ts`), datas/timezone
  (`lib/dates.ts`), tradução de erros técnicos em mensagens amigáveis
  (`lib/errors.ts`).
- **`src/validation`** — schemas Zod por domínio, únicos tanto para o
  formulário quanto para o service antes de enviar ao banco.
- **`src/types/database.ts`** — tipos do banco escritos à mão espelhando as
  migrations (equivalente ao output de `supabase gen types typescript`).
- **`supabase/migrations`** — todo o schema SQL, incluindo políticas de RLS,
  numeradas e aplicadas em ordem.

Nenhuma regra de negócio fica dentro de componente React — os componentes
chamam funções de `services/*` e só cuidam de estado de UI (formulário
aberto, campo digitado, loading).

## Banco de dados

Tabelas principais (ver `supabase/migrations/*.sql` para definição completa,
incluindo índices, constraints e políticas de RLS):

`profiles`, `couples`, `couple_members`, `couple_invites`, `accounts`,
`categories`, `transactions`, `recurring_transactions`, `installments`,
`budgets`, `financial_goals`, `goal_contributions`, `task_lists`, `tasks`,
`events`, `event_participants`, `important_dates`,
`google_calendar_connections`, `google_calendar_selections`,
`calendar_sync_events`.

Regra geral de segurança: **toda tabela tem RLS habilitado** e as políticas
usam duas funções `SECURITY DEFINER` (`is_couple_member`, `get_my_couple_id`)
para checar se o usuário pertence ao casal dono da linha — nunca confiando
apenas na UI. Contas, objetivos e eventos com `visibility = 'personal'` só
ficam visíveis ao `owner_id` correspondente, mesmo dentro do mesmo casal.

Dinheiro é sempre `bigint` em **centavos** — nunca `float`/`numeric` sujeito a
erro de arredondamento (ver `src/lib/money.ts`).

## Estrutura de pastas (resumo)

```
src/
  app/                    rotas Next.js
    login/, auth/         login e callback OAuth
    onboarding/           criar/entrar em um casal
    (app)/                rotas protegidas (dashboard, finance, tasks, calendar, goals, ...)
    api/google/           rotas de OAuth + sincronização do Google Calendar
    api/search/           busca global
  components/
    ui/                   primitivos de UI
    layout/, shared/
    finance/, tasks/, calendar/, goals/
  services/
    finance/, tasks/, calendar/, couples/
  lib/
    supabase/, google/, money.ts, dates.ts, errors.ts, utils.ts
  validation/             schemas Zod
  types/database.ts
supabase/
  migrations/             schema SQL completo + RLS
  seed.sql                dados de exemplo para dev
tests/unit/               testes Vitest da lógica de negócio
docs/google-calendar.md   detalhes da sincronização
```

## Instalação local

Pré-requisitos: Node.js 20+, uma conta Supabase e um projeto no Google Cloud
(veja as seções abaixo para criar ambos do zero).

```bash
git clone https://github.com/LucasRamos13/Menor-que-Tr-s-INC.git
cd Menor-que-Tr-s-INC
npm install
cp .env.example .env.local
# preencha .env.local com suas credenciais (ver seções abaixo)
```

Aplique as migrations no seu projeto Supabase (SQL editor do painel, ou via
Supabase CLI — `supabase db push` — se preferir gerenciar localmente).

```bash
npm run dev
# http://localhost:3000
```

## Variáveis de ambiente

Ver [.env.example](.env.example) para a lista completa com comentários. Resumo:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Painel Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Painel Supabase → Project Settings → API → anon/public key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials |

Nunca use a **service role key** do Supabase no código do app — este projeto
não precisa dela em nenhum momento, porque todo acesso passa pela sessão do
usuário autenticado e é protegido por RLS.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região recomendada: a mais próxima dos usuários, ex. `sa-east-1` para o Brasil).
2. Rode as migrations de `supabase/migrations/` em ordem no SQL Editor do painel (ou `supabase db push` via CLI).
3. Em **Authentication → Providers → Google**, ative o provedor (veja a seção Google abaixo para as credenciais).
4. Em **Authentication → URL Configuration**, cadastre a Site URL e Redirect URLs (localhost e produção).
5. Confirme em **Database → Tables** que cada tabela mostra "RLS enabled".

Guia passo a passo completo e específico para deploy: veja o **Guia de Deploy** mais abaixo.

## Configuração do Google (login + Calendar)

Resumo rápido (passo a passo completo no Guia de Deploy):

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Calendar API**.
3. Configure a **OAuth consent screen** (modo "External" funciona para uso pessoal com usuários de teste).
4. Crie uma credencial **OAuth Client ID** do tipo "Web application".
5. Authorized redirect URIs necessários:
   - `https://<seu-projeto>.supabase.co/auth/v1/callback` (login via Supabase)
   - `http://localhost:3000/api/google/oauth/callback` (conexão de Calendar em dev)
   - `https://SEU-DOMINIO/api/google/oauth/callback` (conexão de Calendar em produção)
6. Copie o Client ID/Secret para `.env.local` **e** para o painel do Supabase (Authentication → Providers → Google).

Detalhes de escopos e por que login e Calendar usam fluxos OAuth separados:
[docs/google-calendar.md](docs/google-calendar.md).

## Rodando os testes

```bash
npm run test          # roda uma vez
npm run test:watch    # modo watch
```

Os testes cobrem a lógica de negócio pura e crítica: aritmética monetária em
centavos, geração de datas de recorrência (incluindo anos bissextos e
clamping de dia do mês), divisão de parcelamentos sem perda de centavos,
progresso de orçamento, agregações do dashboard financeiro, e — o mais
crítico — a máquina de decisão de sincronização/conflito do Google Calendar.

## Build de produção

```bash
npm run build          # build padrão do Next.js (sanity check local)
npm run pages:build    # build via @opennextjs/cloudflare, gera .open-next/
npm run preview        # build + roda localmente sob o runtime do Workers
```

## Deploy

Veja o guia completo e prático mais abaixo neste README (seção **"Guia de
Deploy Passo a Passo"**), que cobre Supabase, Google Cloud, GitHub e
Cloudflare do zero.

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Login redireciona para `/auth/auth-code-error` | Redirect URI não cadastrada no Google Cloud Console para o domínio atual, ou código de autorização expirado (tente de novo). |
| "Nenhuma conta Google conectada" ao tentar sincronizar | O usuário fez login (Supabase) mas nunca clicou em "Conectar Google Calendar" em Configurações — são fluxos diferentes, ver docs/google-calendar.md. |
| 🔴 Sincronização com Google pausada | Refresh token revogado/expirado — clique em "Reconectar conta". |
| Erro de RLS / "new row violates row-level security policy" | Geralmente falta o usuário pertencer a um casal (`couple_members`) antes de criar dados, ou tentativa de acessar dado de outro casal — funcionando como esperado. |
| Build falha no Cloudflare mencionando APIs do Node.js | Confirme que `compatibility_flags: ["nodejs_compat"]` está no `wrangler.jsonc` (já incluso neste repositório). |
| `npm run pages:build` falha localmente com `ENOENT ... open-next.config.edge.mjs` | Bug conhecido do `@opennextjs/cloudflare` ao empacotar o middleware no Windows (ver nota na seção Stack, acima). Não afeta o deploy real via Cloudflare (que builda em Linux); para reproduzir localmente, use WSL com uma distribuição Linux completa. |
