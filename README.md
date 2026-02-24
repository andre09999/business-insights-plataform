# 📊 Business Insights Platform

Plataforma Full Stack orientada a dados para análise, visualização e consolidação de métricas de negócio.

Projeto desenvolvido com foco em arquitetura escalável, containerização com Docker, deploy completo (frontend + backend + banco) e aplicação prática de conceitos de Business Intelligence.

---

## 🚀 Demo

🔗 [https://business-insights-plataform.netlify.app/](https://business-insights-plataform.netlify.app/)

---

## 💻 Repositório

🔗 [https://github.com/andre09999/business-insights-plataform](https://github.com/andre09999/business-insights-plataform)

---

# 🏗️ Arquitetura do Projeto

A aplicação segue arquitetura Full Stack containerizada:

* Frontend (React + TypeScript)
* Backend (Python + FastAPI)
* Banco de Dados relacional (SQL)
* Docker para orquestração
* Deploy em ambiente cloud

Fluxo da aplicação:

Frontend → API REST (FastAPI) → Banco de Dados → Processamento de métricas → Retorno para dashboard

---

# 🛠️ Stack Tecnológica

## Backend

* Python
* FastAPI
* SQLAlchemy (ou ORM equivalente)
* Arquitetura REST
* Estrutura modular (routes, services, models)

## Frontend

* React
* TypeScript
* Componentização
* Consumo de APIs REST
* Gerenciamento de estado

## Banco de Dados

* SQL (Relacional)
* Modelagem de dados
* Otimização de consultas

## DevOps / Infra

* Docker
* Docker Compose
* Deploy backend em cloud
* Deploy frontend (Netlify)

## Testes

* Testes de endpoints
* Validação de respostas da API
* Testes básicos de integração

---

# 📌 Funcionalidades

✔ Endpoint consolidado de overview
✔ KPIs estratégicos (melhor dia, pior dia, métricas agregadas)
✔ Ranking de vendedores
✔ Filtros dinâmicos por período
✔ Estrutura preparada para expansão de métricas
✔ API documentada automaticamente (Swagger / OpenAPI)
✔ Containerização completa com Docker

---

# 🐳 Execução com Docker

## Subir aplicação completa

```bash
docker-compose up --build
```

Isso irá:

* Subir backend
* Subir banco de dados
* Configurar variáveis de ambiente
* Disponibilizar API e aplicação integradas

---

# ⚙️ Execução Local (sem Docker)

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API disponível em:

```
http://localhost:8000
```

---

## Frontend

```bash
cd frontend
npm install
npm start
```

Aplicação disponível em:

```
http://localhost:3000
```

---

# 📊 Estrutura do Projeto

```
business-insights-plataform/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── tests/
│   └── main.py
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.tsx
│
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

# 📈 Conceitos Aplicados

* Clean Architecture
* Separação de responsabilidades
* Integração API ↔ Frontend
* Modelagem de dados relacional
* Sistemas orientados a métricas (Data-Driven)
* Containerização com Docker
* Deploy em ambiente cloud
* Estrutura preparada para escalabilidade

---

# 🎯 Objetivo do Projeto

Demonstrar a construção de uma plataforma completa de análise de dados, integrando backend, banco e frontend, com foco em performance, organização de código e boas práticas de engenharia de software.

Projeto criado para consolidar conhecimentos em:

* Desenvolvimento Full Stack
* Arquitetura de APIs
* Business Intelligence
* Modelagem de dados
* Containerização e deploy

---

# 👨‍💻 Autor

Andre Luis
Full Stack Developer | Python • Node.js • React • Angular • Kotlin | SQL & NoSQL | Data-Driven Systems

🔗 LinkedIn: [https://www.linkedin.com/in/devf-andre/](https://www.linkedin.com/in/devf-andre/)
🔗 GitHub: [https://github.com/andre09999](https://github.com/andre09999)

---

# 🔮 Próximas Evoluções

* Implementação de autenticação (JWT)
* Testes automatizados avançados (coverage)
* CI/CD pipeline
* Monitoramento e logs estruturados
* Cache para otimização de performance

---

## ⭐ Se este projeto foi útil, considere dar uma estrela no repositório.
