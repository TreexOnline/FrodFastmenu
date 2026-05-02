# FrodFast WhatsApp Engine

Backend Node.js persistente para automação de WhatsApp profissional.

## 🏗️ Arquitetura

- **Node.js + Express**: Servidor persistente
- **@whiskeysockets/baileys**: Conexão WhatsApp oficial
- **Supabase**: Banco de dados e configurações
- **QR Code persistente**: Geração e armazenamento
- **Auto-reconexão**: Recuperação automática de conexões

## 📁 Estrutura de Arquivos

```
whatsapp-engine/
├── server.js              # Servidor Express principal
├── sessionManager.js       # Gerenciamento de sessões Baileys
├── supabaseService.js      # Comunicação com Supabase
├── messageHandler.js       # Processamento de mensagens
├── routes.js              # API REST endpoints
├── package.json           # Dependências Node.js
├── .env                   # Variáveis de ambiente
├── auth_info/             # Credenciais WhatsApp (criado automaticamente)
└── README.md              # Este arquivo
```

## 🚀 Instalação e Configuração

### 1. Instalar Dependências

```bash
cd whatsapp-engine
npm install
```

### 2. Configurar Variáveis de Ambiente

Editar arquivo `.env`:

```env
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Logging
LOG_LEVEL=info
```

### 3. Iniciar Servidor

```bash
# Produção
npm start

# Desenvolvimento
npm run dev
```

## 📡 API Endpoints

### Sessões WhatsApp

- `POST /api/whatsapp/connect/:userId` - Iniciar conexão
- `GET /api/whatsapp/status/:userId` - Status da sessão
- `GET /api/whatsapp/qr/:userId` - Obter QR Code
- `POST /api/whatsapp/disconnect/:userId` - Desconectar
- `POST /api/whatsapp/reconnect/:userId` - Reconectar

### Gerenciamento

- `GET /api/whatsapp/sessions` - Listar todas as sessões
- `POST /api/whatsapp/reconnect-all` - Reconectar todas
- `POST /api/whatsapp/cleanup` - Limpar sessões antigas
- `GET /api/whatsapp/health` - Health check

### Sistema

- `GET /health` - Health check completo
- `GET /` - Informações do serviço

## 🔄 Fluxo de Funcionamento

### 1. Conexão Inicial

```
POST /api/whatsapp/connect/user123
↓
SessionManager.startSession()
↓
makeWASocket() + useMultiFileAuthState()
↓
QR Code gerado → Salvo no Supabase
↓
Usuário escaneia QR
↓
Conexão estabelecida → Status atualizado
```

### 2. Auto Resposta

```
Cliente envia mensagem
↓
Baileys recebe (messages.upsert)
↓
MessageHandler.process()
↓
Verificar auto-responder config
↓
Verificar cooldown
↓
Enviar resposta automática
↓
Logar mensagens + atualizar cooldown
```

### 3. Persistência

- **Auth State**: Salvo em `auth_info/{userId}/`
- **Status**: Sincronizado com Supabase
- **QR Code**: Base64 no Supabase
- **Logs**: Mensagens no Supabase

## 🛡️ Segurança

- **RLS Policies**: Supabase protege dados por usuário
- **JWT Auth**: Tokens válidos requeridos
- **CORS**: Origins permitidos configurados
- **Rate Limiting**: Implícito por sessão WhatsApp

## 📊 Monitoramento

### Health Check

```bash
curl http://localhost:3001/health
```

Retorna:
- Status do serviço
- Memória usage
- Sessões ativas
- Uptime

### Logs

O engine usa Pino logger com níveis:
- `info`: Operações normais
- `warn`: Recuperações
- `error`: Falhas críticas

## 🔧 Manutenção

### Limpeza Automática

- **Sessões antigas**: 7 dias sem uso
- **Auth info**: Removido automaticamente
- **Logs**: Mantidos no Supabase

### Reconexão Automática

- **Desconexões**: Detectadas automaticamente
- **Reconexão**: Exponential backoff (5 tentativas)
- **Background**: Verificação a cada 5 minutos

## 🚨 Troubleshooting

### QR Code não aparece

1. Verificar status: `GET /api/whatsapp/status/:userId`
2. Reiniciar sessão: `POST /api/whatsapp/reconnect/:userId`
3. Verificar logs do servidor

### Conexão cai frequentemente

1. Verificar estabilidade da rede
2. Aumentar keepAliveIntervalMs
3. Verificar se WhatsApp não bloqueou

### Auto resposta não funciona

1. Verificar config no Supabase
2. Verificar se `is_active = true`
3. Verificar cooldown do cliente

## 🔄 Migração do Sistema Antigo

### Desativar Edge Functions

```bash
# Remover ou desativar:
supabase/functions/whatsapp-connect
supabase/functions/whatsapp-websocket
```

### Atualizar Frontend

Substituir chamadas de:
- `supabase.functions.invoke('whatsapp-connect/...')`
- `useWhatsAppWebSocket()`

Por:
- `axios.post('http://localhost:3001/api/whatsapp/...')`
- Polling de status endpoints

### Variáveis de Ambiente

Copiar do projeto principal:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📈 Performance

### Memória

- **Sessão**: ~50MB por conexão ativa
- **Auth files**: ~1MB por usuário
- **Overhead**: ~100MB base

### Conexões Simultâneas

- **Teórico**: Ilimitado (limitado por memória)
- **Prático**: 50-100 sessões simultâneas
- **Recomendado**: 20-50 por instância

## 🚀 Deploy

### Docker (Recomendado)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2

```bash
npm install -g pm2
pm2 start server.js --name whatsapp-engine
pm2 monit
```

### Systemd

```ini
[Unit]
Description=FrodFast WhatsApp Engine
After=network.target

[Service]
Type=simple
User=whatsapp
WorkingDirectory=/opt/whatsapp-engine
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 📞 Suporte

Em caso de problemas:

1. Verificar logs do servidor
2. Testar endpoints individualmente
3. Verificar conexão com Supabase
4. Validar configurações do banco

---

**Desenvolvido por FrodFast Team** 🚀
