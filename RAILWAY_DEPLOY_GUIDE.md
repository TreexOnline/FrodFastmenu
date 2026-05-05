# 🚀 **RAILWAY DEPLOY GUIDE - WHATSAPP ENGINE**

---

## 📋 **OVERVIEW**

Este guia explica como fazer deploy do módulo WhatsApp refatorado no Railway, totalmente cloud-ready e multi-tenant.

---

## 🏗️ **ARQUITETURA REFACTORADA**

### **✅ Mudanças Aplicadas:**

#### **1. Server-Ready Structure:**
- **Novo entry point:** `index.js` (substituindo `server.js`)
- **Porta dinâmica:** `process.env.PORT` (Railway define automaticamente)
- **Bind externo:** `0.0.0.0` para aceitar conexões externas
- **Graceful shutdown:** Implementado para Railway

#### **2. Cloud Configuration:**
- **Environment variables:** Configuradas para Railway
- **Auth storage:** Pasta configurável via `AUTH_DATA_PATH`
- **Multi-tenant:** Suporte a múltiplos restaurantes
- **Production ready:** Logs estruturados e health checks

#### **3. Railway Integration:**
- **railway.json:** Configuração de deploy
- **.env.railway:** Variáveis de ambiente para produção
- **package.json:** Atualizado com scripts Railway
- **Health checks:** Endpoints para monitoring

---

## 🔧 **ESTRUTURA DE ARQUIVOS**

### **📁 Arquivos Criados/Modificados:**

```
whatsapp-engine/
├── index.js                 # NOVO - Entry point Railway-ready
├── railway.json            # NOVO - Configuração Railway
├── .env.railway            # NOVO - Environment production
├── package.json            # MODIFICADO - Scripts Railway
├── sessionManager.js       # MODIFICADO - Multi-tenant + cloud
├── routes.js               # Mantido - API endpoints
├── supabaseService.js      # Mantido - Integração DB
└── messageHandler.js       # Mantido - Processamento mensagens
```

---

## 🚀 **PASSO A PASSO DEPLOY**

### **✅ 1. Preparar Repositório:**

#### **Garantir que está no branch correto:**
```bash
git checkout master
git pull origin master
```

#### **Verificar arquivos Railway:**
```bash
# Deve existir:
ls whatsapp-engine/index.js
ls whatsapp-engine/railway.json
ls whatsapp-engine/.env.railway
```

---

### **✅ 2. Configurar Railway:**

#### **A. Criar Novo Projeto Railway:**
1. Acessar [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Selecionar repositório `TreexOnline/FrodFastmenu`
4. Configurar root directory: `whatsapp-engine`

#### **B. Configurar Environment Variables:**
```bash
# No dashboard Railway, adicionar variáveis:
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://www.treexonline.online
ALLOWED_ORIGINS=https://www.treexonline.online,https://treexonline.online
SUPABASE_URL=https://ansxttqnhpmktxogvtki.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LOG_LEVEL=info
AUTH_DATA_PATH=/tmp/auth_info  # Para Railway
```

---

### **✅ 3. Deploy Automático:**

#### **Railway irá:**
1. **Detectar** `railway.json` automaticamente
2. **Instalar** dependências do `package.json`
3. **Iniciar** com `npm start` (aponta para `index.js`)
4. **Expor** porta definida pelo Railway
5. **Configurar** health checks

#### **Verificar deploy:**
```bash
# Logs no dashboard Railway
# Deve mostrar:
✅ Starting FrodFast WhatsApp Engine - Railway Ready...
🌍 Environment: production
🔗 Port: 3001
🌐 Frontend URL: https://www.treexonline.online
✅ WhatsApp Engine started successfully on port 3001
🚀 Railway Ready - Multi-tenant WhatsApp Engine
```

---

## 🌐 **CONFIGURAÇÃO DE URLs**

### **✅ URL Railway:**
- **Backend:** `https://whatsmotor-production.up.railway.app`
- **API:** `https://whatsmotor-production.up.railway.app/api/whatsapp`
- **Health:** `https://whatsmotor-production.up.railway.app/health`

### **✅ Frontend Integration:**
```json
{
  "env": {
    "VITE_WHATSAPP_API_URL": "https://whatsmotor-production.up.railway.app"
  }
}
```

---

## 🏢 **MULTI-TENANT ARCHITECTURE**

### **✅ Como Funciona:**

#### **1. Isolamento por Restaurante:**
```javascript
// Cada restaurante tem seu próprio userId
// Ex: restaurante-123, restaurante-456, etc.

POST /api/whatsapp/connect/restaurante-123
POST /api/whatsapp/connect/restaurante-456
```

#### **2. Sessões Independentes:**
```javascript
// SessionManager gerencia múltiplas sessões
this.sessions = new Map(); // userId -> session data

// Cada sessão tem:
- Socket WhatsApp independente
- QR Code próprio
- Status individual
- Auto-resposta configurável
```

#### **3. Database Multi-tenant:**
```sql
-- Tabela whatsapp_sessions
user_id TEXT NOT NULL,  -- ID do restaurante
session_name TEXT DEFAULT 'default',
status TEXT NOT NULL,
phone_number TEXT,
profile_name TEXT,
qr_code TEXT,
-- Campos de controle
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id, session_name)
```

---

## 🔍 **TESTES DE INTEGRAÇÃO**

### **✅ 1. Health Check:**
```bash
curl https://whatsmotor-production.up.railway.app/health

# Response esperado:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 3600,
    "memory": {
      "used": 45,
      "total": 128
    },
    "sessions": 0,
    "environment": "production"
  }
}
```

### **✅ 2. Conexão WhatsApp:**
```bash
# Iniciar sessão para restaurante
curl -X POST https://whatsmotor-production.up.railway.app/api/v1/whatsapp/connect/restaurante-123

# Verificar status
curl https://whatsmotor-production.up.railway.app/api/v1/whatsapp/status/restaurante-123
```

### **✅ 3. Multi-tenant Test:**
```bash
# Conectar múltiplos restaurantes
curl -X POST /api/v1/whatsapp/connect/restaurante-123
curl -X POST /api/v1/whatsapp/connect/restaurante-456
curl -X POST /api/v1/whatsapp/connect/restaurante-789
curl -X POST /api/whatsapp/connect/restaurante-456
curl -X POST /api/whatsapp/connect/restaurante-789

# Verificar todas as sessões
curl /api/whatsapp/sessions
```

---

## 🛡️ **SEGURANÇA E MONITORING**

### **✅ Security Features:**
- **CORS:** Configurado para frontend domains apenas
- **Validation:** userId obrigatório em rotas críticas
- **Logging:** IP + User tracking
- **Error Handling:** Respostas padronizadas

### **✅ Monitoring:**
- **Health Checks:** `/health` endpoint
- **Structured Logs:** Pino logger
- **Session Tracking:** Contagem de sessões ativas
- **Memory Monitoring:** Uso de memória em tempo real

---

## 🔄 **CI/CD INTEGRATION**

### **✅ Deploy Automático:**
```yaml
# railway.json já configura deploy automático
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **✅ Workflow:**
1. **Push** para branch `master`
2. **Railway** detecta mudanças automaticamente
3. **Build** e **deploy** iniciados
4. **Health checks** validam deploy
5. **URL** atualizada automaticamente

---

## 📊 **PERFORMANCE E ESCALABILIDADE**

### **✅ Otimizações Aplicadas:**
- **Singleton SessionManager:** Uma instância global
- **Memory Management:** Cleanup periódico
- **Connection Pooling:** Reuso de conexões Supabase
- **Graceful Shutdown:** Sem perda de dados

### **✅ Escalabilidade:**
- **Horizontal:** Múltiplas instâncias Railway
- **Vertical:** Auto-scaling baseado em uso
- **Multi-tenant:** Suporte a N restaurantes
- **Stateless:** Design para cloud scaling

---

## 🚨 **TROUBLESHOOTING**

### **❌ Common Issues:**

#### **1. Deploy Falha:**
```bash
# Verificar logs Railway
# Possíveis causas:
- Arquivo index.js não encontrado
- Dependências faltando
- Environment variables incorretas
```

#### **2. Conexão WhatsApp Falha:**
```bash
# Verificar:
- Supabase connection
- Auth data path permissions
- QR Code generation
- Baileys version compatibility
```

#### **3. CORS Issues:**
```bash
# Verificar ALLOWED_ORIGINS
- Incluir frontend URL
- Verificar protocolo (http/https)
- Testar com curl
```

---

## 🎯 **NEXT STEPS**

### **✅ Pós-Deploy:**

#### **1. Testar Integração:**
- Frontend se conectando ao backend Railway
- QR Code funcionando para múltiplos restaurantes
- Auto-resposta configurável por restaurante

#### **2. Monitoring Setup:**
- Configurar UptimeRobot para health checks
- Setar alerts para erros
- Monitorar uso de memória

#### **3. Performance Tuning:**
- Analisar logs de performance
- Otimizar cleanup intervals
- Configurar auto-scaling

---

## 🎉 **RESUMO**

### **✅ Módulo WhatsApp Railway-Ready:**

#### **🏗️ Arquitetura:**
- **Cloud-native:** Configurado para Railway
- **Multi-tenant:** Suporte a múltiplos restaurantes
- **Production-ready:** Health checks, logging, monitoring
- **Scalable:** Design para crescimento horizontal

#### **🚀 Deploy:**
- **Automático:** CI/CD via Railway
- **Zero-downtime:** Graceful shutdown
- **Environment isolado:** Variáveis configuradas
- **Health monitoring:** Endpoints de verificação

#### **🛡️ Segurança:**
- **CORS configurado:** Frontend domains apenas
- **Input validation:** userId obrigatório
- **Error handling:** Respostas padronizadas
- **Audit logging:** IP + User tracking

---

## 🎯 **PRONTO PARA PRODUÇÃO!**

**Módulo WhatsApp refatorado e pronto para deploy no Railway!**

**Arquitetura cloud-ready, multi-tenant e production-ready!** 🚀
