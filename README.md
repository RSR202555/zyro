# Zyro - Plataforma Privada de Comunicação

Zyro é uma plataforma privada de comunicação inspirada em chats modernos, com suporte a texto, voz e compartilhamento de tela. Ele é composto por uma aplicação Web (Next.js) e uma versão Desktop (Electron), compartilhando componentes de interface e regras de negócio de forma modular.

Este repositório foi estruturado utilizando **npm workspaces** para simplificar o compartilhamento de código.

---

## Estrutura do Monorepo

```text
zyro/
├── apps/
│   ├── web/                 # Next.js 14 App (Web client)
│   └── desktop/             # Electron (Windows App)
├── packages/
│   ├── shared/              # Regras de negócio, Zustand store, Types e Supabase Client
│   └── ui/                  # Componentes reutilizáveis do Design System (Button, Input, etc.)
├── supabase/
│   └── migrations/          # Scripts SQL do banco de dados (RLS, Perfis, Canais)
└── package.json             # Configurações de workspace e scripts de execução
```

---

## Pré-requisitos

* [Node.js](https://nodejs.org/) (v18 ou superior recomendado, LTS instalada v24.19.0)
* Conta no [Supabase](https://supabase.com/) ou banco de dados Supabase local.

---

## Instalação e Configuração

### 1. Instalar Dependências

Execute na raiz do projeto para instalar as dependências de todos os pacotes e inicializar os symlinks dos workspaces:

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou copie o exemplo):

```bash
cp .env.example .env
```

Abra o arquivo `.env` (ou crie um arquivo `apps/web/.env.local`) e configure as seguintes chaves do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Configurar Banco de Dados (Supabase)

Aplique a migration inicial localizada em `supabase/migrations/20260818000000_init.sql` no seu console do Supabase (SQL Editor) ou através da CLI do Supabase. Essa migration criará:
* Tabelas: `profiles`, `communities`, `community_members`, `channels`, `invitations`, `messages`.
* Triggers: Autocriação de perfis no cadastro de usuários (`auth.users`) e inserção de membros automáticos ao criar comunidades.
* Políticas RLS (Row Level Security) para garantir privacidade total dos dados.

---

## Executando o Projeto em Desenvolvimento

Temos scripts unificados na raiz do projeto para rodar as aplicações individualmente ou juntas.

### Executar a Versão Web (Next.js)

Para iniciar o servidor de desenvolvimento web (disponível em `http://localhost:3000`):

```bash
npm run dev:web
```

### Executar a Versão Desktop (Electron)

Primeiro, certifique-se de que a aplicação Web está rodando (na porta 3000). Em seguida, abra outro terminal na raiz e execute:

```bash
npm run dev:desktop
```

---

## Compilação (Build)

Para rodar a compilação de TypeScript e build das aplicações de forma unificada:

```bash
npm run build
```
