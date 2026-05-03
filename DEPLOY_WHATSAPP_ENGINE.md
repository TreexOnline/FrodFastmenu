# 🚀 Deploy WhatsApp Engine - Guia Completo

## 📋 **PRÉ-REQUISITOS**

### **Servidor (VPS/Dedicado):**
- **Node.js 18+** instalado
- **Porta 3001** liberada no firewall
- **IP público** fixo ou dinâmico
- **PM2** para gerenciamento de processo

---

## 🔧 **PASSO 1: CONFIGURAR SERVIDOR**

### **1.1 Acessar Servidor:**
```bash
# SSH para o servidor
ssh root@SEU-SERVIDOR-IP

# Atualizar sistema
apt update && apt upgrade -y
```

### **1.2 Instalar Node.js:**
```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### **1.3 Instalar PM2:**
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalação
pm2 --version
```

---

## 📦 **PASSO 2: DEPLOY WHATSAPP ENGINE**

### **2.1 Clonar Repositório:**
```bash
# Criar pasta do projeto
mkdir /opt/whatsapp-engine
cd /opt/whatsapp-engine

# Clonar repositório Web SaaS (contém o whatsapp-engine)
git clone https://github.com/TreexOnline/FrodFastmenu.git .

# Entrar na pasta do engine
cd whatsapp-engine
```

### **2.2 Configurar Variáveis de Ambiente:**
```bash
# Editar arquivo .env
nano .env
```

**Configurar .env:**
```env
# WhatsApp Engine Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://www.treexonline.online,https://treexonline.online,http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://ansxttqnhpmktxogvtki.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc3h0dHFuaHBta3R4b2d2dGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Nzk5MzEsImV4cCI6MjA5MjU1NTkzMX0.CbrjbtJZsF5ebF6DURr9UyUTUU1yzFqstd9v7wDhxyI
SUPABASE_SERVICE_ROLE_KEY=SUA-CHAVE-SERVICE-ROLE

# Logging
LOG_LEVEL=info
```

### **2.3 Instalar Dependências:**
```bash
# Instalar dependências
npm install

# Verificar instalação
npm list
```

---

## 🚀 **PASSO 3: INICIAR SERVIÇO**

### **3.1 Iniciar com PM2:**
```bash
# Iniciar WhatsApp Engine
pm2 start server.js --name "whatsapp-engine"

# Verificar status
pm2 status

# Verificar logs
pm2 logs whatsapp-engine
```

### **3.2 Configurar PM2 para Reinício Automático:**
```bash
# Salvar configuração atual
pm2 save

# Configurar startup automático
pm2 startup

# Executar comando gerado pelo PM2
# Ex: env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

---

## 🔥 **PASSO 4: CONFIGURAR FIREWALL**

### **4.1 Liberar Porta:**
```bash
# Se usando UFW
ufw allow 3001
ufw reload

# Se usando iptables
iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
iptables-save
```

### **4.2 Verificar Acesso:**
```bash
# Testar localmente
curl http://localhost:3001/api/whatsapp/health

# Testar externamente
curl http://SEU-SERVIDOR-IP:3001/api/whatsapp/health
```

---

## 🌐 **PASSO 5: CONFIGURAR FRONTEND**

### **5.1 Atualizar Variável de Ambiente:**
```bash
# No projeto frontend (Vercel)
# Configurar variável de ambiente:
VITE_WHATSAPP_API_URL=http://SEU-SERVIDOR-IP:3001
```

### **5.2 Deploy no Vercel:**
```bash
# Fazer push das alterações
git add .
git commit -m "feat: configure WhatsApp Engine production URL"
git push origin master
```

---

## 🔧 **PASSO 6: CONFIGURAR DOMÍNIO (OPCIONAL)**

### **6.1 Configurar DNS:**
```
# No seu provedor de DNS
api.whatsapp-engine.com -> A -> SEU-SERVIDOR-IP
```

### **6.2 Configurar Nginx (Opcional):**
```bash
# Instalar Nginx
apt install nginx

# Configurar virtual host
nano /etc/nginx/sites-available/whatsapp-engine
```

**Configuração Nginx:**
```nginx
server {
    listen 80;
    server_name api.whatsapp-engine.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **6.3 Ativar Site:**
```bash
# Ativar site
ln -s /etc/nginx/sites-available/whatsapp-engine /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

---

## 📊 **PASSO 7: MONITORAMENTO**

### **7.1 Verificar Logs:**
```bash
# Logs em tempo real
pm2 logs whatsapp-engine --lines 100

# Logs de erro
pm2 logs whatsapp-engine --err

# Status detalhado
pm2 monit
```

### **7.2 Health Check:**
```bash
# Verificar saúde do serviço
curl http://localhost:3001/api/whatsapp/health

# Verificar seções ativas
curl http://localhost:3001/api/whatsapp/sessions
```

---

## 🔄 **PASSO 8: ATUALIZAÇÕES**

### **8.1 Atualizar Código:**
```bash
# Entrar na pasta do projeto
cd /opt/whatsapp-engine/whatsapp-engine

# Puxar atualizações
git pull origin master

# Reinstalar dependências (se necessário)
npm install

# Reiniciar serviço
pm2 restart whatsapp-engine
```

### **8.2 Script de Deploy Automático:**
```bash
# Criar script de deploy
nano /opt/deploy-whatsapp.sh
```

**Script de Deploy:**
```bash
#!/bin/bash
cd /opt/whatsapp-engine/whatsapp-engine
git pull origin master
npm install
pm2 restart whatsapp-engine
echo "WhatsApp Engine atualizado com sucesso!"
```

```bash
# Tornar executável
chmod +x /opt/deploy-whatsapp.sh
```

---

## 🚨 **TROUBLESHOOTING**

### **Problemas Comuns:**

#### **1. Porta Bloqueada:**
```bash
# Verificar se porta está aberta
netstat -tlnp | grep :3001

# Verificar firewall
ufw status
iptables -L
```

#### **2. CORS Error:**
```bash
# Verificar configuração CORS no .env
cat .env | grep ALLOWED_ORIGINS

# Reiniciar serviço após alteração
pm2 restart whatsapp-engine
```

#### **3. Serviço Não Inicia:**
```bash
# Verificar logs de erro
pm2 logs whatsapp-engine --err

# Verificar dependências
npm list

# Iniciar manualmente para debug
node server.js
```

#### **4. Conexão Supabase:**
```bash
# Testar conexão com Supabase
curl -H "apikey: SUA-ANON-KEY" \
     https://ansxttqnhpmktxogvtki.supabase.co/rest/v1/
```

---

## 📞 **SUPORTE**

### **Logs Importantes:**
- **PM2:** `pm2 logs whatsapp-engine`
- **Nginx:** `/var/log/nginx/error.log`
- **System:** `/var/log/syslog`

### **Comandos Úteis:**
```bash
# Reiniciar tudo
pm2 restart all

# Verificar uso de memória
pm2 monit

# Remover processo
pm2 delete whatsapp-engine

# Verificar porta
ss -tlnp | grep :3001
```

---

## ✅ **VERIFICAÇÃO FINAL**

### **Teste Completo:**
```bash
# 1. Health check
curl http://SEU-SERVIDOR-IP:3001/api/whatsapp/health

# 2. CORS test
curl -H "Origin: https://www.treexonline.online" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://SEU-SERVIDOR-IP:3001/api/whatsapp/health

# 3. Frontend test
# Acessar https://www.treexonline.online e testar WhatsApp
```

---

## 🎉 **SISTEMA PRONTO!**

Após seguir esses passos, o WhatsApp Engine estará:

✅ **Online** no servidor  
✅ **Acessível** via IP público  
✅ **Integrado** com frontend Vercel  
✅ **Monitorado** pelo PM2  
✅ **Seguro** com CORS configurado  

**O sistema WhatsApp estará funcionando em produção!** 🚀
