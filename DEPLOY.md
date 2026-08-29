# Guia de Deploy — do zero, gratuito

Este guia assume que você nunca configurou este projeto antes e quer colocá-lo
no ar gastando **R$ 0**. Siga na ordem.

---

## 1. Supabase (banco de dados + autenticação)

### 1.1 Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (dá para usar o próprio login do Google).
2. Clique em **New project**.
3. Escolha uma organização, dê um nome ao projeto (ex: `menor-que-tres`).
4. **Database password**: gere uma senha forte e **guarde em um cofre de senhas** — você não vai precisar dela no dia a dia (o app usa a anon key), mas é a senha de acesso direto ao Postgres se um dia precisar.
5. **Region**: escolha a mais próxima dos usuários finais — para um casal no Brasil, `South America (São Paulo)` é a melhor opção de latência.
6. Clique em **Create new project** e aguarde alguns minutos até o provisionamento terminar.

### 1.2 Rodar as migrations

1. No painel do projeto, abra **SQL Editor** (ícone de terminal na barra lateral).
2. Abra cada arquivo em `supabase/migrations/` **na ordem numérica** (`0001_...sql`, `0002_...sql`, etc.), cole o conteúdo inteiro no editor e clique em **Run**. Repita para todos os 7 arquivos.
3. Confirme em **Table Editor** que as tabelas apareceram (profiles, couples, accounts, transactions, tasks, events, google_calendar_connections, etc.).
4. Confirme em **Authentication → Policies** (ou na aba "RLS" de cada tabela no Table Editor) que cada tabela mostra o cadeado verde "RLS enabled".

### 1.3 Onde encontrar URL e chave

1. Vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie **Project URL** → isso é `NEXT_PUBLIC_SUPABASE_URL`.
3. Copie a chave **anon / public** → isso é `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Nunca copie a `service_role` key para o app** — ela não é usada neste projeto e nunca deve ir para o frontend nem para variáveis `NEXT_PUBLIC_*`.

### 1.4 Configurar Auth (antes de ativar o Google — volte aqui depois do passo 2)

1. Vá em **Authentication → URL Configuration**.
2. **Site URL**: em produção, coloque a URL final do Cloudflare (ex: `https://menor-que-tres.pages.dev`) — você pode voltar e ajustar depois que souber a URL exata.
3. **Redirect URLs**: adicione tanto `http://localhost:3000/**` (dev) quanto `https://SEU-DOMINIO/**` (produção).

Deixe esta aba aberta — você vai voltar para colar o Client ID/Secret do Google no passo 3.

---

## 2. Google Cloud (login + Google Calendar)

### 2.1 Criar o projeto

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/) e crie um novo projeto (ex: `menor-que-tres`).

### 2.2 Ativar a API do Calendar

1. Menu **APIs & Services → Library**.
2. Busque por **Google Calendar API** e clique em **Enable**.

### 2.3 Configurar a OAuth consent screen

1. Menu **APIs & Services → OAuth consent screen**.
2. **User type**: escolha **External** (é o único disponível fora de uma Google Workspace, e funciona normalmente para uso pessoal enquanto o app estiver em modo de teste).
3. Preencha nome do app, e-mail de suporte e e-mail de contato do desenvolvedor.
4. Em **Scopes**, não é obrigatório adicionar nada aqui manualmente (os scopes são pedidos dinamicamente pelo código) — pode avançar.
5. Em **Test users**, adicione o e-mail do Google de cada pessoa do casal que vai usar o app. **Enquanto o app estiver em modo "Testing"**, só esses e-mails conseguem fazer login/conectar — isso é suficiente e recomendado para um app de uso pessoal (evita o processo de verificação do Google, que é para apps públicos).

### 2.4 Criar as credenciais OAuth

1. Menu **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. **Application type**: Web application.
3. **Authorized redirect URIs** — adicione **todas** estas (ajuste o domínio de produção quando você souber a URL final do Cloudflare):
   ```
   https://SEU-PROJETO.supabase.co/auth/v1/callback
   http://localhost:3000/api/google/oauth/callback
   https://SEU-DOMINIO-DE-PRODUCAO/api/google/oauth/callback
   ```
   - A primeira é para o **login** (gerenciado pelo Supabase Auth).
   - As outras duas são para a **conexão do Google Calendar** (gerenciada pelo próprio app) — uma para desenvolvimento local, outra para produção.
4. Clique em **Create**. Copie o **Client ID** e o **Client secret** exibidos — você vai usá-los em dois lugares: no `.env.local`/variáveis do Cloudflare, e no painel do Supabase (próximo passo).

### 2.5 Local vs. produção — resumo

| Ambiente | Redirect URI de Calendar | Onde configurar |
|---|---|---|
| Local | `http://localhost:3000/api/google/oauth/callback` | Google Cloud Console (passo 2.4) |
| Produção | `https://SEU-DOMINIO/api/google/oauth/callback` | Google Cloud Console (passo 2.4) — adicione assim que souber o domínio do Cloudflare |

O redirect de **login** (`.../auth/v1/callback`) é sempre o mesmo, porque é o
Supabase (não o seu domínio) quem recebe esse retorno — funciona igual em dev
e produção.

---

## 3. Configurar o Google OAuth dentro do Supabase

1. Volte ao painel do Supabase → **Authentication → Providers**.
2. Encontre **Google** na lista e ative o toggle.
3. Cole o **Client ID** e o **Client Secret** do passo 2.4.
4. Salve.
5. Confirme que a **Redirect URL** mostrada pelo Supabase nessa tela é exatamente a mesma que você cadastrou no Google Cloud Console (`https://SEU-PROJETO.supabase.co/auth/v1/callback`) — o Supabase mostra essa URL prontinha para copiar.

---

## 4. GitHub

O código já está (ou deve ser colocado) no repositório `Menor-que-Tr-s-INC`
da conta GitHub `LucasRamos13`.

```bash
git clone https://github.com/LucasRamos13/Menor-que-Tr-s-INC.git
cd Menor-que-Tr-s-INC
npm install
cp .env.example .env.local   # preencha com os valores dos passos 1 e 2
npm run build                # sanity check: garante que o projeto builda
```

Nunca dê `git add` em `.env.local` — o `.gitignore` já bloqueia isso, mas
sempre vale conferir com `git status` antes de commitar.

---

## 5. Cloudflare Pages

1. Crie uma conta em [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (gratuita).
2. No menu lateral, vá em **Workers & Pages → Create → Pages** (ou **Workers**, dependendo da versão do painel — a Cloudflare vem unificando os dois; procure a opção "Connect to Git" / "Import an existing Git repository").
3. **Connect to GitHub** e autorize o acesso à sua conta.
4. Selecione o repositório **`Menor-que-Tr-s-INC`**.
5. **Production branch**: `main` (ou a branch que você usa como principal).
6. **Framework preset**: selecione "Next.js" se disponível — o painel deve detectar automaticamente o uso de `@opennextjs/cloudflare`. Caso o preset automático não configure os comandos corretamente, defina manualmente:
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.open-next/assets` (o Worker em si é publicado a partir de `.open-next/worker.js`, conforme `wrangler.jsonc` — o fluxo "Workers Builds" do Cloudflare usa esse arquivo automaticamente quando presente no repositório).
7. **Environment variables** — adicione exatamente estas (mesmos valores do seu `.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   ```
8. Clique em **Save and Deploy**. Acompanhe o log do primeiro build.
   > Este build acontece nos servidores (Linux) da Cloudflare, então a
   > limitação conhecida do `@opennextjs/cloudflare` no Windows (ver README →
   > seção Stack) não é um problema aqui — ela só aparece se você tentar
   > rodar `npm run pages:build` na sua própria máquina Windows.
9. Ao terminar, a Cloudflare mostra uma URL do tipo `https://menor-que-tres.pages.dev` (ou `*.workers.dev`, dependendo do modo de deploy). Abra e confira se a tela de login aparece.
10. **Domínio próprio (opcional)**: em **Custom domains**, adicione seu domínio e siga as instruções de DNS mostradas pela Cloudflare.
11. **Importante — atualize as Redirect URLs com o domínio final**:
    - Google Cloud Console → Credentials → seu OAuth Client → adicione `https://SEU-DOMINIO-FINAL/api/google/oauth/callback` em Authorized redirect URIs (se ainda não tinha usado esse domínio exato no passo 2.4).
    - Supabase → Authentication → URL Configuration → atualize a **Site URL** e as **Redirect URLs** para o domínio final.

Cada push na branch de produção dispara um novo deploy automaticamente.

---

## 6. Checklist pós-deploy

Teste na URL de produção, idealmente com as duas contas Google do casal:

```
[ ] Login com Google funciona
[ ] Logout funciona
[ ] Criar o espaço do casal (primeira pessoa)
[ ] Segundo usuário entra com o código de convite
[ ] Criar uma transação (receita e despesa)
[ ] Criar uma tarefa e marcar como concluída
[ ] Criar um evento no calendário interno
[ ] Conectar o Google Calendar (Configurações → Google Calendar)
[ ] Selecionar um calendário e clicar em "Sincronizar agora"
[ ] Confirmar que um evento existente no Google apareceu no app
[ ] Alterar esse evento diretamente no Google Calendar, sincronizar de novo, confirmar que o app refletiu a mudança
[ ] Criar um evento no app com "Sincronizar com o Google" marcado, confirmar que apareceu no Google Calendar
[ ] Excluir um evento sincronizado no app, confirmar que sumiu do Google
[ ] Tentar acessar dados de outro casal (deve ser bloqueado pelo RLS)
```

Se algum item falhar, veja a seção **Troubleshooting** no `README.md`.
