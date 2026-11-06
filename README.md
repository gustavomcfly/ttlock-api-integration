<h1 align="center">🔓 TestLock - Pado</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

Sistema de controle e automação para testes de fechaduras digitais baseadas no firmware TTLock (Sciener). Permite gerenciar os dispositivos, executar comandos remotos, rodar testes de ciclagem em background e realizar auditorias de qualidade com geração de relatórios.

---

## 🚀 Tecnologias

- **Frontend:** JavaScript (ES Modules), HTML5 e Tailwind CSS 4, com [Vite](https://vitejs.dev/)
- **Backend:** [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- **Banco de dados:** [PostgreSQL](https://www.postgresql.org/) (administrado via [pgAdmin](https://www.pgadmin.org/))
- **ORM:** [Prisma 7](https://www.prisma.io/) com `@prisma/adapter-pg`
- **Sessão:** JWT (`jsonwebtoken`)
- **Integração:** [TTLock Open API](https://euopen.ttlock.com/)

---

## 💻 Como Executar Localmente

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) **20.19+** (recomendado 22 LTS)
- [PostgreSQL](https://www.postgresql.org/download/) 14+ com o **pgAdmin 4** (vem no instalador)
- Git
- Um app criado na [TTLock Open Platform](https://euopen.ttlock.com/) para obter o `Client ID` e o `Client Secret`

### 2. Instalar as dependências

Na raiz do projeto:

```bash
npm run install:all
```

Instala as dependências da raiz, de `client/` e de `server/`.

### 3. Criar o banco no pgAdmin

1. Abra o pgAdmin → botão direito em **Servers → Register → Server...**
2. Aba **General:** `Name` = `Localhost`
3. Aba **Connection:** `Host` = `localhost`, `Port` = `5432`, `Username` = `postgres`, `Password` = senha definida na instalação do PostgreSQL → **Save**
4. Em **Servers → Localhost → Databases**, botão direito → **Create → Database...**
5. `Database` = `testlock_db` → **Save**

Crie apenas o banco vazio; as tabelas são geradas no passo 5.

### 4. Configurar o `server/.env`

Crie o arquivo `server/.env` (já é ignorado pelo Git):

```env
PORT=3001
TTLOCK_CLIENT_ID=seu_client_id
TTLOCK_CLIENT_SECRET=seu_client_secret
JWT_SECRET=troque_por_um_segredo_longo_e_aleatorio
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/testlock_db?schema=public"
```

- **`JWT_SECRET`:** assina a sessão do sistema. Para gerar um valor seguro:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **`DATABASE_URL`:** se a senha tiver caracteres especiais, codifique-os na URL (`@` → `%40`, `#` → `%23`).

### 5. Criar as tabelas (Prisma)

Rode **de dentro da pasta `server/`**, pois é lá que o Prisma lê o `.env`:

```bash
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
```

Para conferir, no pgAdmin vá em `testlock_db → Schemas → public → Tables` e clique em **Refresh**.

### 6. Rodar o projeto

Na raiz:

```bash
npm run dev
```

- **Frontend:** <http://localhost:5173>
- **Backend:** <http://localhost:3001>

Faça login com a mesma conta do app TTLock. No primeiro acesso o usuário é criado automaticamente no banco.

---

## 🛠️ Problemas comuns

| Erro | Solução |
| --- | --- |
| `P1000` autenticação falhou | Confira usuário/senha na `DATABASE_URL` |
| `P1001` não alcança o banco | Inicie o serviço do PostgreSQL e confirme a porta `5432` |
| `P1003` banco não existe | Crie o `testlock_db` no pgAdmin |
| `Cannot find module '.prisma/client'` | `cd server && npx prisma generate` |
| `DATABASE_URL` não encontrada | O `.env` deve estar em `server/` e os comandos Prisma devem rodar dentro de `server/` |
| `EADDRINUSE :::3001` | Libere a porta 3001 ou altere `PORT` |

---

_Desenvolvido para propósitos de pesquisa e desenvolvimento de integrações IoT e automação de controle de acessos._

---

## 📁 Estrutura do Projeto

```text
/
├── client/                         # Frontend (Vite)
│   ├── index.html                  # Ponto de entrada
│   ├── vite.config.js              # Tailwind + proxy de /api e /db para :3001
│   └── src/
│       ├── main.js                 # Navegação entre páginas
│       ├── config.js               # API_BASE (dev/prod)
│       ├── api/                    # lockApi, qualityApi, settingsApi, ...
│       ├── components/             # ActionPanel, QualityTestPanel, ReportsPanel, SettingsPanel, ...
│       ├── pages/                  # Templates HTML de cada tela
│       ├── state/                  # appState
│       └── utils/                  # http, sessão, toast, helpers
├── server/                         # Backend (Express)
│   ├── server.js                   # Entrada, montagem das rotas e listen
│   ├── prismaClient.js             # Prisma + Pool pg (adapter-pg)
│   ├── prisma.config.ts            # Config do Prisma 7 (lê DATABASE_URL do .env)
│   ├── prisma/
│   │   ├── schema.prisma           # Modelos do banco
│   │   └── migrations/             # Histórico de migrations SQL
│   ├── middleware/auth.js          # JWT: signSession / requireAuth
│   ├── routes/                     # auth, lock, passcode, rfid, fingerprint, record, quality, reports, settings
│   ├── db-routes/cyclicTestsDB.js  # /db/cyclic-tests
│   ├── services/                   # Regras de negócio e chamadas à TTLock
│   ├── utils/ttlockErrors.js       # Tradução dos erros da TTLock
│   ├── cyclicEngine.js             # Motor de ciclagem em background
│   └── .env                        # Variáveis locais (não versionado)
├── netlify/functions/api.js        # Wrapper serverless do Express
├── netlify.toml                    # Build, functions e redirects do Netlify
└── package.json                    # Scripts globais e dependências usadas pela Function
```

---

## 🔐 Segurança

- Nunca versione o `server/.env`. Se alguma credencial (`TTLOCK_CLIENT_SECRET`, `JWT_SECRET`, senha do banco) já foi exposta em um repositório, **troque-a**.
- Use um `JWT_SECRET` único e longo em cada ambiente.

---

_Desenvolvido para propósitos de pesquisa e desenvolvimento de integrações IoT e automação de controle de acessos._
