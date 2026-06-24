<h1 align="center">🔓 TestLock - Pado</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

Sistema de controle e automação para testes de fechaduras digitais baseadas no firmware TTLock (Sciener). Permite a gestão completa dos dispositivos, execução de comandos remotos e rotinas de testes de estresse em hardware através de Gateways Wi-Fi.

---

## 🚀 Funcionalidades

* 🔐 **Gestão Completa de Acessos:** Criação, edição e exclusão de Senhas (permanentes, temporárias, cíclicas), Cartões RFID e Biometrias diretamente pelo painel.
* ⚡ **Auditoria de Qualidade (QA):** Roteiro automatizado que testa etapa por etapa as funcionalidades da fechadura (bateria, abertura remota, injeção de credenciais, atualização de firmware).
* 🔄 **Teste de Ciclagem:** Automação de testes de estresse mecânico e de bateria, realizando comandos de abrir/fechar em loop contínuo com filas de execução.
* 🛡️ **Proxy Server de Segurança:** Backend dedicado em Node.js para ocultar o `Client Secret`, realizar bypass de CORS e orquestrar os scripts de teste.
* ⚙️ **Perfis de Teste:** Armazenamento local de parâmetros padrão (cargas de teste, tempos de delay e dados do testador) para agilizar o uso diário.

---

## 🛠️ Tecnologias

* **Frontend:** Vanilla JS (ES Modules), Vite, Tailwind CSS V4. Arquitetura leve baseada em injeção de templates HTML e manipulação direta de estado.
* **Backend:** Node.js, Express, Axios. Padrão arquitetural BFF (Backend-For-Frontend) dividindo lógica de negócios em Serviços e Rotas.

---

## ⚙️ Como Executar

**1. Pré-requisitos:**
* Node.js (v18+) instalado.
* Conta de desenvolvedor na [TTLock Open Platform](https://open.ttlock.com/).
* Fechadura TTLock pareada e conectada a um Gateway Wi-Fi.

**2. Instalação:**
Clone o repositório e instale todas as dependências da raiz, client e server de uma só vez:

```bash
git clone [https://github.com/gustavomcfly/ttlock-api-integration.git](https://github.com/gustavomcfly/ttlock-api-integration.git)
cd ttlock-api-integration
npm run install:all
```

**3. Inicie a aplicação:**
Inicie o projeto com o comando abaixo:
```bash
npm run dev
```
*Acesse a aplicação no seu navegador (geralmente em `http://localhost:5173`).*

---

## 📁 Estrutura do Projeto

```text
📦 ttlock-api-integration
├── 📂 client                 # Interface web
│   ├── 📂 src
│   │   ├── 📂 api            # Wrappers para chamadas HTTP
│   │   ├── 📂 components     # Classes controladoras da UI (Painéis)
│   │   ├── 📂 pages          # Templates em HTML puro
│   │   ├── 📂 state          # Gerenciadores de estado (Testes, Sessão, Configs)
│   │   └── 📜 main.js        # Roteamento e orquestração do frontend
│   └── 📜 vite.config.js
├── 📂 server                 # API Proxy e Orquestrador de Testes
│   ├── 📂 routes             # Endpoints expostos para o frontend
│   ├── 📂 services           # Lógica de negócios e comunicação com a TTLock
│   ├── 📜 .env               # Credenciais de desenvolvedor
│   └── 📜 server.js          # Inicialização do Express
└── 📜 package.json           # Scripts de automação (concurrently)
```

---

## 🔒 Segurança

* **Hash Local:** As senhas dos usuários são criptografadas em MD5 no lado do cliente antes de qualquer transmissão, respeitando o fluxo legado da API TTLock (OAuth2 password grant).
* **Isolamento de Credenciais:** Nunca versione seu `Client ID` e `Client Secret` no GitHub. Utilize a interface da aplicação para injetar essas informações de forma dinâmica e segura em memória durante os testes.

---
*Desenvolvido para propósitos de pesquisa e desenvolvimento de integrações IoT e automação de controle de acessos.*
