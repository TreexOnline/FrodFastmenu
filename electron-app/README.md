# Electron Simple App

Projeto Electron simples que abre um site externo com funcionalidade de impressão.

## Estrutura do Projeto

```
electron-app/
├── main.js          # Processo principal
├── preload.js        # Script de preload
├── package.json      # Configurações e dependências
└── README.md         # Este arquivo
```

## Instalação e Execução

1. Instalar dependências:
```bash
npm install
```

2. Executar aplicação:
```bash
npm start
```

## Funcionalidades

- ✅ Abre site externo em janela de 1200x800
- ✅ Context isolation ativado
- ✅ Função print() disponível globalmente
- ✅ Impressão silenciosa com background
- ✅ Menu bar oculto

## Uso da Função de Impressão

No site carregado, basta chamar:
```javascript
print();
// ou
window.electronAPI.print();
```

## Configuração

Altere a URL no arquivo `main.js` na linha:
```javascript
mainWindow.loadURL('https://SEU-SITE.vercel.app');
```
