<h1 align="center">🔓 TestLock - Pado</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Status-Em_Desenvolvimento-success?style=for-the-badge" alt="Status" />
</p>

> **TestLock - Pado: Integração das APIs da TTLock** > Este projeto é um sistema de controle e automação para testes de fechaduras digitais que utilizam o firmware TTLock (Sciener). Ele permite a gestão de dispositivos, comandos remotos e geração de relatórios técnicos através das APIs abertas da plataforma.

---

## 📑 Índice
- [Recursos Principais](#-recursos-principais)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Execução](#-instalação-e-execução)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Segurança](#-segurança)

---

## 🚀 Recursos Principais

* 🔐 **Autenticação Segura:** Fluxo de login em duas etapas isolando as credenciais de usuário (MD5 local) das credenciais de desenvolvedor (Client ID/Secret).
* 📡 **Gestão de Dispositivos:** Listagem em tempo real de todas as fechaduras vinculadas à conta, exibindo status de bateria (nível de carga elétrica) e IDs únicos.
* ⚡ **Operações Remotas:** Seleção interativa e capacidade de enviar comandos de destrancamento (Remote Unlock) de forma instantânea através de Gateways Wi-Fi.
* 🛡️ **Proxy Server Integrado:** Backend dedicado em Node.js para contornar bloqueios de CORS e manter o *Client Secret* e fluxos de token ocultos do navegador.

---

## 🏗️ Arquitetura do Sistema

A aplicação foi dividida em duas camadas principais (Client e Server) para garantir segurança e escalabilidade:

1. **Frontend (Client):** Interface modular em Vanilla JS (ES Modules), gerenciamento de estado de sessão e renderização dinâmica no DOM.
2. **Backend Proxy (Server):** Node.js com Express. Intercepta os comandos do frontend, formata as requisições no padrão exigido pela TTLock (`application/x-www-form-urlencoded`) e se comunica com o endpoint global `https://api.sciener.com`.

**Principais Dependências:**
`express` | `cors` | `axios` | `blueimp-md5` | `dotenv`

---

## ⚙️ Pré-requisitos

Antes de começar, certifique-se de ter o seguinte em sua máquina:
* [Node.js](https://nodejs.org/) (v18 ou superior recomendado).
* Uma conta de desenvolvedor aprovada na [TTLock Open Platform](https://open.ttlock.com/).
* Pelo menos uma fechadura TTLock pareada à sua conta de testes e conectada a um Gateway Wi-Fi (necessário para comandos remotos).

---

## 🛠️ Instalação e Execução

**1. Clone o repositório:**
```bash
git clone [https://github.com/gustavomcfly/ttlock-api-integration.git](https://github.com/gustavomcfly/ttlock-api-integration.git)
cd ttlock-api-integration
```

**2. Instale as dependências:**
Na raiz do projeto, execute o script configurado para instalar todas as bibliotecas necessárias de uma só vez:
```bash
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
├── 📂 client               # Frontend da aplicação
│   ├── 📂 src              # Código-fonte
│   │   ├── 📂 api          # Client HTTP (apiClient.js)
│   │   ├── 📂 components   # Componentes visuais (DeviceTable.js)
│   │   ├── 📂 utils        # Helpers e gerenciamento de sessão
│   │   ├── 📜 main.js      # Ponto de entrada e lógica principal
│   │   └── 📜 style.css    # Estilos globais
│   ├── 📜 index.html       # Estrutura base da interface web
│   └── 📜 package.json     # Dependências específicas do frontend
├── 📂 server               # Backend Proxy Server (Node.js)
│   ├── 📂 routes           # Endpoints da API local (api.routes.js)
│   ├── 📂 services         # Integração direta via Axios (ttlock.service.js)
│   ├── 📜 .env             # Variáveis de ambiente (não versionado)
│   ├── 📜 server.js        # Inicialização do Express Proxy
│   └── 📜 package.json     # Dependências específicas do backend
├── 📜 .gitignore           # Arquivos e pastas ignorados pelo Git (ex: node_modules)
└── 📜 package.json         # Configurações globais e scripts da raiz
```

---

## 🔒 Segurança

* **Hash Local:** As senhas dos usuários são criptografadas em MD5 no lado do cliente antes de qualquer transmissão, respeitando o fluxo legado da API TTLock (OAuth2 password grant).
* **Isolamento de Credenciais:** Nunca versione seu `Client ID` e `Client Secret` no GitHub. Utilize a interface da aplicação para injetar essas informações de forma dinâmica e segura em memória durante os testes.

---
*Desenvolvido para propósitos de pesquisa e desenvolvimento de integrações IoT e automação de controle de acessos.*
