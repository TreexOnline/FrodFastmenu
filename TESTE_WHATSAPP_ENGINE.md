# 🧪 GUIA DE TESTES - WHATSAPP ENGINE

---

## 🚀 **PASSO A PASSO PARA TESTAR O SISTEMA**

---

## 📋 **PRÉ-REQUISITOS**

### **1. 🗄️ Supabase Configurado:**
- ✅ Tabelas criadas (`whatsapp_sessions`, `whatsapp_auto_messages`, `whatsapp_message_logs`)
- ✅ Variáveis de ambiente configuradas
- ✅ Permissões corretas

### **2. 🔧 Ambiente Node.js:**
- ✅ Node.js 18+ instalado
- ✅ npm funcionando

---

## 🚀 **PASSO 1 - INICIAR WHATSAPP ENGINE**

```bash
# 1. Navegar para pasta do engine
cd whatsapp-engine

# 2. Instalar dependências
npm install

# 3. Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais Supabase

# 4. Iniciar servidor
npm start
```

**✅ Resultado esperado:**
```
🚀 WhatsApp Engine Server iniciado na porta 3001
📡 API REST disponível em http://localhost:3001/api/whatsapp
🗄️ Conectado ao Supabase
📝 Log level: info
```

---

## 🔍 **PASSO 2 - TESTAR API REST**

### **2.1 Health Check:**
```bash
curl http://localhost:3001/api/whatsapp/health
```

**✅ Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123.45,
    "memory": {...},
    "activeSessions": 0,
    "connectedSessions": 0,
    "timestamp": "2026-05-02T18:22:00.000Z"
  }
}
```

### **2.2 Listar Sessões:**
```bash
curl http://localhost:3001/api/whatsapp/sessions
```

**✅ Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "sessions": [],
    "total": 0
  }
}
```

---

## 📱 **PASSO 3 - INICIAR FRONTEND**

```bash
# Em outra janela/terminal
cd src  # ou pasta raiz do projeto
npm run dev
```

**✅ Resultado esperado:**
```
🚀 Frontend rodando em http://localhost:3000
📱 WhatsApp Engine conectado em http://localhost:3001
```

---

## 🎯 **PASSO 4 - TESTAR CONEXÃO WHATSAPP**

### **4.1 Abrir Interface:**
1. Acessar `http://localhost:3000`
2. Fazer login no sistema
3. Navegar para painel WhatsApp

### **4.2 Conectar WhatsApp:**
1. Clicar botão **"Conectar WhatsApp"**
2. Aguardar QR Code aparecer
3. Escanear QR Code com celular

**✅ Status esperado:**
```
🔄 Conectando... → 📱 QR Code Disponível → ✅ Conectado com Sucesso!
```

### **4.3 Verificar Status:**
```bash
# Verificar status da sessão
curl http://localhost:3001/api/whatsapp/status/{userId}
```

**✅ Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "status": "connected",
    "phone": "5511999998888",
    "profileName": "Seu Nome",
    "qr": null
  }
}
```

---

## 🤖 **PASSO 5 - TESTAR AUTO-RESPOSTA**

### **5.1 Configurar Mensagem:**
1. No painel WhatsApp, configurar:
   - Mensagem: "Olá! Recebemos sua mensagem e já estamos processando."
   - Cooldown: 24 horas
   - Status: Ativo

2. Salvar configuração

### **5.2 Testar Mensagem:**
1. Enviar mensagem do celular para o WhatsApp conectado
2. Aguardar resposta automática

**✅ Resultado esperado:**
```
📱 Mensagem recebida do cliente
🤖 Auto-resposta enviada
📝 Log salvo no Supabase
⏰ Cooldown atualizado
```

### **5.3 Verificar Logs:**
```bash
# Verificar logs no engine
curl http://localhost:3001/api/whatsapp/sessions
```

---

## 🔍 **PASSO 6 - TESTAR FUNCIONALIDADES AVANÇADAS**

### **6.1 Testar Reconexão:**
```bash
curl -X POST http://localhost:3001/api/whatsapp/reconnect/{userId}
```

### **6.2 Testar Desconexão:**
```bash
curl -X POST http://localhost:3001/api/whatsapp/disconnect/{userId}
```

### **6.3 Testar Cleanup:**
```bash
curl -X POST http://localhost:3001/api/whatsapp/cleanup
```

---

## 🐛 **PASSO 7 - SOLUÇÃO DE PROBLEMAS**

### **❌ Problemas Comuns:**

#### **Engine não inicia:**
```bash
# Verificar logs
npm start 2>&1 | tee engine.log

# Verificar .env
cat .env
```

#### **QR Code não aparece:**
```bash
# Verificar status
curl http://localhost:3001/api/whatsapp/status/{userId}

# Verificar logs do engine
tail -f engine.log
```

#### **Auto-resposta não funciona:**
```bash
# Verificar configuração no Supabase
# Tabela: whatsapp_auto_messages
# Colunas: message_text, cooldown_hours, is_active

# Verificar logs de mensagens
# Tabela: whatsapp_message_logs
```

#### **Frontend não conecta:**
```bash
# Verificar baseURL
curl http://localhost:3001/api/whatsapp/health

# Verificar console do navegador
# F12 > Network > Verificar chamadas API
```

---

## 📊 **PASSO 8 - MONITORAMENTO**

### **8.1 Logs em Tempo Real:**
```bash
# Logs do engine
tail -f engine.log

# Logs do frontend
npm run dev 2>&1 | grep whatsapp
```

### **8.2 Status do Sistema:**
```bash
# Health check completo
curl http://localhost:3001/api/whatsapp/health | jq .

# Status de todas sessões
curl http://localhost:3001/api/whatsapp/sessions | jq .
```

---

## ✅ **CHECKLIST FINAL**

### **🎯 Testes Básicos:**
- [ ] Engine inicia sem erros
- [ ] Health check retorna 200
- [ ] Frontend conecta na API
- [ ] QR Code é gerado
- [ ] Conexão WhatsApp estabelecida
- [ ] Status atualizado em tempo real

### **🤖 Testes Auto-Resposta:**
- [ ] Configuração salva
- [ ] Mensagem recebida
- [ ] Auto-resposta enviada
- [ ] Cooldown respeitado
- [ ] Logs salvos

### **🔧 Testes Avançados:**
- [ ] Reconexão funciona
- [ ] Desconexão funciona
- [ ] Multiple sessões
- [ ] Cleanup funciona
- [ ] Monitoramento ativo

---

## 🎉 **SISTEMA PRONTO PARA PRODUÇÃO!**

**Se todos os testes passaram, seu WhatsApp Engine está 100% funcional!**

### **🚀 Próximos Passos:**
1. **Deploy em produção** - Configurar VPS
2. **Configurar domínio** - Apontar URL
3. **Monitoramento** - Logs e alertas
4. **Backup** - Sessões e configurações

**Parabéns! Sistema WhatsApp completamente reconstruído e funcionando!** 🎯
