# LinkedIn Leads Kanban

Ferramenta de gestão de leads do LinkedIn com board Kanban, motor de enriquecimento de contatos e extensão Chrome para captura automática.

## Funcionalidades

- **Board Kanban** — arraste e solte leads entre colunas personalizadas
- **Extensão Chrome** — captura leads diretamente do LinkedIn
- **Motor de Enriquecimento** — descobre e-mails e telefones via múltiplas fontes:
  - Google Dork search
  - Hunter.io (padrões de e-mail por domínio)
  - ZeroBounce (validação SMTP)
  - NumLookup (detecção de WhatsApp)
  - Receita Federal (lookup por CNPJ)
- **Score de Confiança** — pontuação composta para e-mails e telefones encontrados
- **Exportação de dados** — exporte leads filtrados
- **Templates de mensagem** — gerencie modelos de abordagem

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuito)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

| Variável | Obrigatória | Onde encontrar |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Sim** | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Sim** | Supabase > Project Settings > API |
| `DATABASE_URL` | Sim (server-side) | Supabase > Project Settings > Database > URI |
| `HUNTER_API_KEY` | Não | [hunter.io](https://hunter.io) — 25 buscas/mês grátis |
| `ZEROBOUNCE_API_KEY` | Não | [zerobounce.net](https://www.zerobounce.net) — 100/mês grátis |
| `NUMLOOKUP_API_KEY` | Não | [numlookupapi.com](https://www.numlookupapi.com) |

### 3. Criar banco de dados

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`.

Isso cria as tabelas:
- `contacts` — registros de contatos
- `enrichment_logs` — histórico de enriquecimentos
- `email_candidates` — candidatos de e-mail com scores
- `phone_candidates` — candidatos de telefone com scores
- `company_searches` — histórico de buscas por empresa

### 4. Rodar o servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Extensão Chrome

1. Abra `chrome://extensions/`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação** e selecione a pasta `extension/`
4. Acesse o LinkedIn e use o ícone da extensão para capturar leads

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run start    # servidor de produção
npm run lint     # verificar lint
```

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Tailwind CSS 4** + ShadCN UI
- **Zustand** — gerenciamento de estado
- **@dnd-kit** — drag and drop
- **Anthropic SDK** — integração com Claude AI

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mah1fer/linkedin-leads-kanban&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,DATABASE_URL)

Adicione as variáveis de ambiente no painel da Vercel antes de deployar.
