# 🚀 DEPLOY WHATSAPP AUTOMÁTICO - INSTRUÇÕES COMPLETAS

## 📋 RESUMO DO QUE PRECISA SER FEITO

### ✅ JÁ FEITO:
- ✅ Código frontend criado
- ✅ Código backend criado
- ✅ Migrações SQL criadas
- ✅ Builds gerados (web + electron)

### ❌ AINDA PRECISA:
- ❌ Aplicar migrações no Supabase
- ❌ Deploy das Edge Functions
- ❌ Testar sistema completo

---

## 🗄️ PASSO 1: APLICAR MIGRAÇÕES NO SUPABASE

### Opção A: Via CLI (Recomendado)
```bash
# Navegar para pasta do projeto
cd c:/Users/Usuario/Desktop/FrodFastmenu-master/FrodFastmenu-master

# Aplicar todas as migrações
npx supabase db push
```

### Opção B: Via Dashboard Supabase
1. Acessar: https://supabase.com/dashboard
2. Selecionar seu projeto
3. Ir para: **SQL Editor** → **New query**
4. Copiar e colar o conteúdo do arquivo:
   `supabase/migrations/20260429000002_complete_whatsapp_setup.sql`
5. Clicar em **Run**

### Opção C: Arquivo por arquivo
```bash
# Aplicar remoção do Z-API
npx supabase db push --migration 20260429000000_remove_zapi_structure.sql

# Aplicar criação das tabelas novas
npx supabase db push --migration 20260429000001_create_whatsapp_auto_responder.sql

# Aplicar setup completo
npx supabase db push --migration 20260429000002_complete_whatsapp_setup.sql
```

---

## ⚡ PASSO 2: DEPLOY DAS EDGE FUNCTIONS

### Deploy via CLI (Recomendado)
```bash
# Deploy da função principal (WhatsApp + Baileys)
npx supabase functions deploy whatsapp-connect

# Deploy do WebSocket (atualizações em tempo real)
npx supabase functions deploy whatsapp-websocket

# Verificar status dos deploys
npx supabase functions list
```

### Deploy Manual (Backup)
1. Acessar: https://supabase.com/dashboard
2. Selecionar seu projeto
3. Ir para: **Edge Functions**
4. Criar função: `whatsapp-connect`
   - Colar conteúdo de: `supabase/functions/whatsapp-connect/index.ts`
5. Criar função: `whatsapp-websocket`
   - Colar conteúdo de: `supabase/functions/whatsapp-websocket/index.ts`

---

## 🧪 PASSO 3: TESTAR SISTEMA COMPLETO

### Testar Frontend
```bash
# Testar local
npm run dev

# Ou abrir o build
# electron-app/dist/TreexMenu-win32-x64/TreexMenu.exe
```

### Testar Funcionalidades
1. **Acessar aba "WhatsApp Automático"**
2. **Verificar interface nova** (deve aparecer)
3. **Clicar "Conectar WhatsApp"**
4. **Aguardar QR Code aparecer**
5. **Escanear com WhatsApp celular**
6. **Verificar status "Conectado"**
7. **Configurar mensagem automática**
8. **Testar enviando mensagem do celular**

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### Verificar Tabelas Criadas
```sql
-- Verificar se tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'whatsapp_%';
```

### Verificar Functions Deployed
```bash
npx supabase functions list
```

### Verificar Logs
```bash
# Verificar logs das functions
npx supabase functions logs whatsapp-connect
npx supabase functions logs whatsapp-websocket
```

---

## ⚠️ POSSÍVEIS ERROS E SOLUÇÕES

### Erro: "Table whatsapp_sessions doesn't exist"
**Solução:** Aplicar migrações do PASSO 1

### Erro: "Function whatsapp-connect not found"
**Solução:** Fazer deploy das Edge Functions do PASSO 2

### Erro: "WebSocket connection failed"
**Solução:** Verificar se `whatsapp-websocket` foi deployed

### Erro: "Permission denied"
**Solução:** Verificar políticas RLS nas tabelas

---

## 📱 COMO TESTAR O WHATSAPP

### 1. Conexão
- Abrir painel → WhatsApp Automático
- Clicar "Conectar WhatsApp"
- Escanear QR com celular

### 2. Configurar Mensagem
- Editar texto da mensagem de boas-vindas
- Escolher cooldown (recomendado: 24 horas)
- Ativar sistema

### 3. Testar Auto Resposta
- Enviar mensagem do celular para o WhatsApp conectado
- Aguardar resposta automática
- Verificar logs no painel

---

## 🎯 RESULTADO ESPERADO

### ✅ Se tudo funcionar:
- Interface nova aparecendo
- QR Code gerado corretamente
- Conexão estabelecida
- Auto resposta funcionando
- Status em tempo real via WebSocket

### 🔄 Se não funcionar:
- Verificar logs das Edge Functions
- Verificar se tabelas foram criadas
- Verificar se functions foram deployed
- Verificar configurações do Supabase

---

## 📞 SUPORTE

### Logs Importantes:
```bash
# Logs do backend WhatsApp
npx supabase functions logs whatsapp-connect --follow

# Logs do WebSocket
npx supabase functions logs whatsapp-websocket --follow
```

### Debug no Frontend:
- Abrir DevTools (F12)
- Verificar Console para erros
- Verificar Network para chamadas API

---

## 🚀 PRONTO PARA USAR!

Após seguir esses 3 passos, o sistema WhatsApp Automático estará 100% funcional e pronto para uso pelos seus clientes!
