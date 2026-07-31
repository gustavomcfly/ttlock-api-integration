<h1 align="center">🔓 TestLock - Pado</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

Sistema de controle e automação para testes de fechaduras digitais baseadas no firmware TTLock (Sciener). Permite a gestão completa dos dispositivos, execução de comandos remotos e rotinas de testes de estresse em hardware através de Gateways Wi-Fi.

---

## 🚀 Tecnologias Utilizadas

A arquitetura foi modernizada para suportar processamento em background e armazenamento persistente:

- **Frontend:** JavaScript (Vanilla/ES6+), HTML5, CSS3, construído e otimizado com [Vite](https://vitejs.dev/).
- **Backend:** [Node.js](https://nodejs.org/) com [Express](https://expressjs.com/) (Proxy da API TTLock e Motor de Testes).
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) para armazenamento seguro de logs, testes e configurações.
- **ORM:** [Prisma](https://www.prisma.io/) para modelagem do banco e consultas tipadas.
- **Integração:** TTLock Open API.

---

## ⚙️ Principais Funcionalidades

- **Gestão de Fechaduras:** Listagem, status de bateria e comandos remotos de abrir/travar.
- **Motor de Ciclagem (Background):** Testes de estresse de abrir/fechar rodando nativamente no backend 24/7, sem depender do navegador aberto.
- **Auditoria de Qualidade (QA):** Criação e acompanhamento de roteiros de testes detalhados com logs de execução etapa por etapa.
- **Geração de Relatórios:** Histórico de testes em banco de dados para análise de falhas.

---

## ⚙️ Como Executar

## 🛠️ Como rodar o projeto (Instalação e Setup)

Se você acabou de clonar o projeto em um **computador novo**, siga exatamente os passos abaixo para configurar o ambiente:

### 1. Pré-requisitos

Certifique-se de ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (Versão 18+ recomendada)
- [PostgreSQL](https://www.postgresql.org/) rodando localmente (ou uma URL de banco na nuvem)
- Git

### 2. Instalação das Dependências

Abra o terminal na raiz do projeto e instale todas as dependências simultaneamente (raiz, frontend e backend) usando o script automatizado:

```bash
npm run install:all
```

### 3. Configuração do Banco de Dados (Prisma)

Ainda no terminal, entre na pasta do servidor, gere o cliente do Prisma e crie as tabelas no seu banco de dados:

```bash
cd server
npx prisma generate
npx prisma db push
cd ..
```

### 4. Executando o Projeto

Com tudo configurado, volte para a raiz do projeto e inicie os servidores (Frontend e Backend subirão juntos através do _concurrently_):

```bash
npm run dev
```

- **Frontend (Vite):** Geralmente acessível em `http://localhost:5173`
- **Backend (Node.js):** Rodando em `http://localhost:3001`

---

## 📁 Estrutura do Projeto

```text
/
├── client/                 # Aplicação Frontend
│   ├── src/                # Códigos fonte (Componentes, API, Estado)
│   ├── index.html          # Ponto de entrada do Vite
│   └── vite.config.js      # Configurações do empacotador
├── server/                 # Aplicação Backend
│   ├── prisma/             # Schema do banco de dados (schema.prisma)
│   ├── db-routes/          # Rotas de comunicação com o PostgreSQL (Testes/Qualidade)
│   ├── routes/             # Rotas de Proxy para a API da TTLock
│   ├── services/           # Regras de negócio e comunicação direta (LockService, etc)
│   ├── cyclicEngine.js     # Motor autônomo para o Teste de Ciclagem (Background)
│   └── server.js           # Ponto de entrada do Express
└── package.json            # Scripts globais do projeto (npm run dev, npm run install:all)
```

_Desenvolvido para propósitos de pesquisa e desenvolvimento de integrações IoT e automação de controle de acessos._
