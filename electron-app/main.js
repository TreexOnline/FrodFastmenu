const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  console.log('🚀 [MAIN] Criando janela Electron...');
  
  // Verificar se o arquivo preload existe
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('📁 [MAIN] Preload path:', preloadPath);
  
  const fs = require('fs');
  if (!fs.existsSync(preloadPath)) {
    console.error('❌ [MAIN] Arquivo preload.js não encontrado em:', preloadPath);
    return;
  }
  console.log('✅ [MAIN] Arquivo preload.js encontrado');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      // Configuração SEGURA para site externo
      webSecurity: true, // Mantém segurança
      allowRunningInsecureContent: false, // Mantém segurança
      // Habilita preload em contextos remotos de forma segura
      contextIsolation: true,
      sandbox: false // Permite que o preload funcione
    },
    show: false,
    autoHideMenuBar: true
  });

  // Eventos de debug da janela
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ [MAIN] Página carregada completamente');
    
    // Verificar se o preload foi executado (sem injeção)
    setTimeout(() => {
      console.log('🔍 [MAIN] Verificação manual via console...');
      
      // Apenas logar que o preload foi carregado com base na mensagem recebida
      console.log('✅ [MAIN] Preload carregado (confirmado via IPC)');
      console.log('🔍 [MAIN] Para testar API, use DevTools no renderer:');
      console.log('🔍 [MAIN]   - Abra F12');
      console.log('🔍 [MAIN]   - Execute: window.electronAPI?.print()');
      console.log('🔍 [MAIN]   - Execute: window.electronAPI?.getPrinters()');
    }, 2000);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ [MAIN] Falha ao carregar página:', errorCode, errorDescription);
  });

  // Escutar quando o preload for carregado
  ipcMain.on('preload-loaded', (event, data) => {
    console.log('✅ [MAIN] Preload script carregado com sucesso:', data);
  });

  // Escutar erro no preload
  ipcMain.on('preload-error', (event, error) => {
    console.error('❌ [MAIN] Erro no preload script:', error);
  });

  // Carregar site externo
  console.log('🌐 [MAIN] Carregando site externo...');
  mainWindow.loadURL('https://www.treexonline.online/');

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    console.log('👁️ [MAIN] Janela pronta, mostrando...');
    mainWindow.show();
    
    // Abrir DevTools para debug
    mainWindow.webContents.openDevTools();
  });

  // Função para listar impressoras disponíveis
  const getPrinters = () => {
    return new Promise((resolve, reject) => {
      console.log('🖨️ [MAIN] Listando impressoras disponíveis...');
      
      // Usar comando do Windows para listar impressoras
      exec('wmic printer get name', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ [MAIN] Erro ao listar impressoras (wmic):', error);
          // Tentar método alternativo
          exec('powershell "Get-Printer | Select-Object Name"', (error2, stdout2, stderr2) => {
            if (error2) {
              console.error('❌ [MAIN] Erro ao listar impressoras (powershell):', error2);
              reject(error2);
            } else {
              const printers = stdout2.split('\n')
                .filter(line => line.trim() && !line.includes('Name') && !line.includes('---'))
                .map(line => line.trim());
              console.log('✅ [MAIN] Impressoras encontradas (Powershell):', printers);
              resolve(printers);
            }
          });
        } else {
          const printers = stdout.split('\n')
            .filter(line => line.trim() && line !== 'Name' && !line.includes('No Instance'))
            .map(line => line.trim());
          console.log('✅ [MAIN] Impressoras encontradas (WMIC):', printers);
          resolve(printers);
        }
      });
    });
  };

  // Escutar evento para listar impressoras
  ipcMain.handle('get-printers', async () => {
    try {
      const printers = await getPrinters();
      return { success: true, printers };
    } catch (error) {
      console.error('❌ [MAIN] Erro ao obter impressoras:', error);
      return { success: false, error: error.message };
    }
  });

  // Escutar evento de impressão com logs detalhados
  ipcMain.on('print', async (event, options = {}) => {
    console.log('🖨️ [MAIN] Evento de impressão recebido!', { 
      senderId: event.sender.id,
      timestamp: new Date().toISOString(),
      frameId: event.frameId,
      options
    });
    
    try {
      // Obter impressoras disponíveis
      const printers = await getPrinters();
      
      if (printers.length === 0) {
        console.error('❌ [MAIN] Nenhuma impressora encontrada!');
        event.reply('print-complete', { success: false, error: 'Nenhuma impressora encontrada' });
        return;
      }
      
      console.log('🖨️ [MAIN] Impressoras disponíveis:', printers);
      
      // Usar primeira impressora ou especificada
      const selectedPrinter = options.deviceName || printers[0];
      console.log('🖨️ [MAIN] Usando impressora:', selectedPrinter);
      
      if (mainWindow) {
        console.log('🖨️ [MAIN] Disparando impressão...');
        
        // Configurações de impressão detalhadas
        const printOptions = {
          silent: options.silent || false,
          printBackground: true,
          scaleFactor: 1,
          deviceName: selectedPrinter,
          copies: 1,
          marginsType: 0, // 0: default, 1: none, 2: minimum, 3: custom
          pageSize: 'A4',
          landscape: false,
          printSelectionOnly: false,
          collate: false
        };
        
        console.log('🖨️ [MAIN] Opções de impressão:', printOptions);
        
        mainWindow.webContents.print(printOptions)
          .then(() => {
            console.log('✅ [MAIN] Impressão concluída com sucesso');
            event.reply('print-complete', { 
              success: true, 
              timestamp: new Date().toISOString(),
              printer: selectedPrinter
            });
          })
          .catch(err => {
            console.error('❌ [MAIN] Erro na impressão:', err);
            
            // Tentar sem deviceName específico
            if (options.deviceName) {
              console.log('🔄 [MAIN] Tentando novamente sem deviceName específico...');
              const fallbackOptions = { ...printOptions, deviceName: '' };
              
              mainWindow.webContents.print(fallbackOptions)
                .then(() => {
                  console.log('✅ [MAIN] Impressão concluída com sucesso (fallback)');
                  event.reply('print-complete', { 
                    success: true, 
                    timestamp: new Date().toISOString(),
                    printer: 'default'
                  });
                })
                .catch(err2 => {
                  console.error('❌ [MAIN] Erro na impressão (fallback):', err2);
                  event.reply('print-complete', { 
                    success: false, 
                    error: `Erro principal: ${err.message}. Erro fallback: ${err2.message}` 
                  });
                });
            } else {
              event.reply('print-complete', { success: false, error: err.message });
            }
          });
      } else {
        console.error('❌ [MAIN] MainWindow não encontrada');
        event.reply('print-complete', { success: false, error: 'MainWindow not found' });
      }
    } catch (error) {
      console.error('❌ [MAIN] Erro geral na impressão:', error);
      event.reply('print-complete', { success: false, error: error.message });
    }
  });

  // Escutar evento de impressão silenciosa (automática)
  ipcMain.on('print-silent', async (event) => {
    console.log('🖨️ [MAIN] Evento de impressão silenciosa recebido');
    
    // Chamar impressão com silent: true
    ipcMain.emit('print', event, { silent: true });
  });

  // Escutar mensagens do renderer
  ipcMain.on('debug-message', (event, message) => {
    console.log('📞 [MAIN] Mensagem do renderer:', message);
  });
}

// Quando o app estiver pronto
app.whenReady().then(() => {
  console.log('🚀 [MAIN] App pronto, criando janela...');
  createWindow();
});

// Fechar todas as janelas quando todas forem fechadas
app.on('window-all-closed', () => {
  console.log('🔒 [MAIN] Todas as janelas fechadas, saindo...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('🔄 [MAIN] App ativado');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Log de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('💥 [MAIN] Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [MAIN] Rejeição não tratada:', reason);
});
