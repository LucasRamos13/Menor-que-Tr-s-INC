# Integração com o Google Calendar

Este documento explica em detalhe como a sincronização bidirecional funciona,
suas garantias e suas limitações conhecidas.

## Por que o login e a conexão de Calendar são fluxos separados

O login do app usa o **Supabase Auth** com o provedor Google (`supabase.auth.signInWithOAuth`).
Esse fluxo cuida apenas de identidade (nome, e-mail, foto) e usa os escopos
padrão (`openid email profile`) — o mínimo necessário para autenticar.

O Supabase **não persiste nem renova automaticamente** tokens de provedores
terceiros para uso posterior em chamadas de API (o `provider_token` só existe
no momento do login). Como a sincronização de Calendar precisa de um
`refresh_token` de longa duração para funcionar dias/semanas depois sem pedir
login de novo, o app implementa seu **próprio fluxo OAuth 2.0** só para isso:

```
Usuário clica "Conectar Google Calendar"
        ↓
GET /api/google/oauth/start        → redireciona ao consentimento do Google
        ↓                            (scopes: calendar.readonly + calendar.events,
        ↓                             access_type=offline, prompt=consent)
GET /api/google/oauth/callback     → troca o code por access/refresh token
        ↓                            e salva em google_calendar_connections
Calendário pronto para sincronizar
```

Isso mantém os escopos do login mínimos e isola a permissão de Calendar como
algo **opt-in**, desconectável a qualquer momento em Configurações, sem afetar
o login.

## Escopos solicitados

| Escopo | Por quê |
|---|---|
| `https://www.googleapis.com/auth/calendar.readonly` | Necessário para listar os calendários do usuário (`calendarList.list`) e mostrar o seletor de calendários. |
| `https://www.googleapis.com/auth/calendar.events` | Necessário para ler, criar, atualizar e excluir eventos nos calendários selecionados. |

Não é solicitado o escopo `calendar` completo (que também permite alterar
configurações do calendário) nem `calendar.settings` — o app nunca precisa
disso.

## Identificadores e a tabela de vínculo

Cada evento importado ou empurrado para o Google gera uma linha em
`calendar_sync_events`, que guarda:

- `internal_event_id` → a linha correspondente em `events`
- `google_calendar_id` + `google_event_id` → identificam o evento no Google
- `google_updated_at` / `internal_updated_at` → "fotos" dos timestamps de
  cada lado, tiradas na última sincronização confirmada
- `sync_status` (`synced` | `pending` | `conflict` | `error` | `deleted`)
- `last_synced_at`, `last_error`

Essa combinação (`connection_id`, `google_calendar_id`, `google_event_id`) é
`UNIQUE` no banco — impossível criar duas linhas de vínculo para o mesmo
evento do Google, o que é a proteção estrutural contra duplicatas.

## Importação inicial

Ao conectar e selecionar calendários, a primeira sincronização busca eventos
com `timeMin` = 90 dias atrás (sem limite de futuro, usando paginação). Isso é
uma escolha deliberada: importar o histórico inteiro de um calendário do
Google (potencialmente anos) não traz valor para o caso de uso do app e
custaria tempo/memória à toa. **Limitação conhecida:** eventos passados com
mais de 90 dias não são importados automaticamente.

## Sincronização incremental (pull)

Sincronizações seguintes usam o
[`syncToken`](https://developers.google.com/calendar/api/guides/sync) retornado
pela API do Google, que é o mecanismo oficialmente recomendado para sync
incremental — a API devolve só o que mudou desde o último token, então o
custo é baixo mesmo sincronizando com frequência. Se o Google invalidar o
token (HTTP 410 Gone — acontece se ficar muito tempo sem sincronizar), o app
detecta isso e refaz automaticamente uma importação completa da janela de 90
dias, sem intervenção do usuário.

## Quando a sincronização acontece

**Não há polling em background nem webhooks/watch channels.** A sincronização
acontece:

1. **Sob demanda**, quando o usuário clica em "Sincronizar agora" em
   Configurações → Google Calendar;
2. **Imediatamente**, quando o próprio usuário cria/edita/exclui um evento
   vinculado dentro do app (push direto para a API do Google logo após salvar
   no Supabase).

**Por que não implementamos webhooks:** o Google Calendar push
notifications exige um endpoint HTTPS público e verificado, e — mais
importante — canais que expiram e precisam ser renovados periodicamente,
o que por sua vez exigiria um cron/scheduler rodando em background (Cloudflare
Cron Triggers, uma fila, etc.). Isso adicionaria peça móvel e custo de
manutenção que essa aplicação pessoal não precisa: com dois usuários e um
botão "Sincronizar agora" (mais o push imediato ao editar no app), o
comportamento percebido já é "quase em tempo real" na prática, sem a
complexidade operacional de manter canais de watch vivos.
**Limitação conhecida:** uma alteração feita diretamente no Google Calendar só
aparece no app quando alguém abre a tela de Calendário/Configurações ou
clica em sincronizar — não instantaneamente.

## Resolução de conflitos

Para cada evento vinculado, a cada sincronização o app compara 4 timestamps:
o `updated` atual do Google, o `updated_at` atual do evento local, e as duas
"fotos" tiradas na última sincronização bem-sucedida. Isso classifica a
situação em um destes casos (ver `src/services/calendar/google-mapping.ts`,
função `reconcile`, totalmente coberta por testes unitários):

| Situação | Ação |
|---|---|
| Nada mudou nos dois lados | Nada a fazer |
| Só o Google mudou | Aplica a mudança do Google localmente |
| Só o app mudou | Envia a mudança do app para o Google |
| Excluído no Google, sem mudança local | Exclui localmente |
| Excluído no Google, mas editado no app depois | **Conflito** — recria no Google a partir da versão do app (o edit não é descartado silenciosamente) |
| Excluído no app, sem mudança no Google | Exclui no Google |
| Excluído no app, mas editado no Google depois | **Conflito** — restaura localmente a partir do Google |
| Mudou nos dois lados | **Conflito** — vence quem tem o timestamp mais recente (last-write-wins) |

Todo caminho marcado como "Conflito" grava `sync_status = 'conflict'` e uma
mensagem legível em `last_error` na linha de `calendar_sync_events` — nunca
sobrescreve silenciosamente. Isso satisfaz o requisito de "detectar conflito,
evitar sobrescrita silenciosa, preferir a versão mais recente quando seguro".

## Reconexão

Se o `refresh_token` for revogado (usuário removeu o acesso em
myaccount.google.com/permissions) ou expirar, a próxima tentativa de
sincronização falha e grava `last_sync_status = 'error'` +
`last_sync_error` na conexão. A tela de Configurações → Google Calendar
mostra isso como:

```
🔴 Sincronização com Google pausada
[Reconectar conta]
```

Reconectar é literalmente refazer o fluxo de `/api/google/oauth/start`, que
sobrescreve (`upsert` por `user_id`) a linha antiga de conexão com tokens
novos.

## Outras limitações conhecidas

- Recorrência: eventos recorrentes são importados com `singleEvents=true`,
  ou seja, cada ocorrência vira um evento independente no app (mais simples
  de editar/excluir individualmente), em vez de preservar a regra RRULE
  original do Google. Editar uma ocorrência importada não edita a série no
  Google, apenas aquele evento pontual.
- A conexão é por usuário (cada pessoa do casal conecta sua própria conta
  Google), não por casal — isso é intencional, já que o token OAuth pertence
  a uma conta Google específica.
