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
    
    // Injetar script para interceptar completamente window.open e window.print
    setTimeout(() => {
      console.log('� [MAIN] Injetando script de interceptação de impressão...');
      
      mainWindow.webContents.executeJavaScript(`
        (function() {
          console.log('🔧 [INJECT] Iniciando interceptação completa...');
          
          // Sobrescrever window.open completamente
          const originalOpen = window.open;
          window.open = function(url, name, specs) {
            console.log('🚫 [INJECT] window.open interceptado:', { url, name, specs });
            
            // Criar janela fake que não faz nada
            const fakeWindow = {
              print: function() {
                console.log('🖨️ [INJECT] Print interceptado via fake window');
                // Capturar HTML e enviar para Electron
                const html = document.documentElement.outerHTML;
                window.electronAPI?.printOrder(html);
              },
              close: function() {
                console.log('🚫 [INJECT] Window close interceptado');
              },
              focus: function() {
                console.log('🚫 [INJECT] Window focus interceptado');
              },
              document: document
            };
            
            return fakeWindow;
          };
          
          // Sobrescrever window.print completamente
          const originalPrint = window.print;
          window.print = function() {
            console.log('�️ [INJECT] window.print interceptado diretamente');
            
            // Capturar HTML e enviar para Electron
            const html = document.documentElement.outerHTML;
            window.electronAPI?.printOrder(html);
            
            return false; // Prevenir comportamento padrão
          };
          
          // Interceptar tentativas de impressão via document.execCommand
          const originalExecCommand = document.execCommand;
          document.execCommand = function(command, ...args) {
            if (command === 'print') {
              console.log('�️ [INJECT] document.execCommand print interceptado');
              const html = document.documentElement.outerHTML;
              window.electronAPI?.printOrder(html);
              return true;
            }
            return originalExecCommand.apply(this, [command, ...args]);
          };
          
          // Interceptar eventos de teclado Ctrl+P
          document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
              console.log('�️ [INJECT] Ctrl+P interceptado');
              e.preventDefault();
              e.stopPropagation();
              
              const html = document.documentElement.outerHTML;
              window.electronAPI?.printOrder(html);
            }
          }, true);
          
          // Adicionar listener para qualquer botão de impressão
          document.addEventListener('click', function(e) {
            const target = e.target;
            const text = target.textContent?.toLowerCase() || '';
            const ariaLabel = target.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text.includes('imprimir') || text.includes('print') || 
                ariaLabel.includes('imprimir') || ariaLabel.includes('print')) {
              console.log('�️ [INJECT] Botão de impressão detectado:', target);
              
              setTimeout(() => {
                const html = document.documentElement.outerHTML;
                window.electronAPI?.printOrder(html);
              }, 100);
            }
          }, true);
          
          console.log('✅ [INJECT] Interceptação completa instalada');
          return true;
        })();
      `).then(() => {
        console.log('✅ [MAIN] Script de interceptação injetado com sucesso');
      }).catch(err => {
        console.error('❌ [MAIN] Erro ao injetar script:', err);
      });
    }, 3000);
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

  // Escutar evento de impressão via HTML capturado
  ipcMain.handle('print-order', async (event, data) => {
    console.log('🖨️ [MAIN] print-order recebido:', { 
      htmlLength: data.html?.length, 
      url: data.url, 
      title: data.title,
      timestamp: data.timestamp 
    });
    
    try {
      // Criar janela oculta para impressão
      const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false
        }
      });
      
      console.log('🖨️ [MAIN] Janela de impressão criada');
      
      // Carregar HTML capturado via data URL
      const htmlContent = data.html || '<html><body><p>Conteúdo não disponível</p></body></html>';
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      
      await printWindow.loadURL(dataUrl);
      console.log('✅ [MAIN] HTML carregado na janela de impressão');
      
      // Aguardar carregamento completo
      await new Promise((resolve) => {
        printWindow.webContents.once('did-finish-load', resolve);
      });
      
      console.log('🖨️ [MAIN] Iniciando impressão...');
      
      // Obter impressoras disponíveis
      const printers = await getPrinters();
      const selectedPrinter = printers.length > 0 ? printers[0] : '';
      
      // Configurações de impressão
      const printOptions = {
        silent: false, // Mostrar diálogo para debug
        printBackground: true,
        scaleFactor: 1,
        deviceName: selectedPrinter,
        copies: 1,
        marginsType: 0,
        pageSize: 'A4',
        landscape: false
      };
      
      console.log('🖨️ [MAIN] Opções de impressão:', printOptions);
      
      // Executar impressão
      await printWindow.webContents.print(printOptions);
      
      console.log('✅ [MAIN] Impressão concluída com sucesso');
      
      // Fechar janela após impressão
      printWindow.close();
      
      return { 
        success: true, 
        timestamp: new Date().toISOString(),
        printer: selectedPrinter,
        htmlLength: htmlContent.length
      };
      
    } catch (error) {
      console.error('❌ [MAIN] Erro na impressão via print-order:', error);
      
      // Tentar fallback: imprimir na janela principal
      try {
        console.log('🔄 [MAIN] Tentando fallback na janela principal...');
        
        const printers = await getPrinters();
        const selectedPrinter = printers.length > 0 ? printers[0] : '';
        
        await mainWindow.webContents.print({
          silent: false,
          printBackground: true,
          deviceName: selectedPrinter
        });
        
        console.log('✅ [MAIN] Fallback executado com sucesso');
        
        return { 
          success: true, 
          fallback: true,
          timestamp: new Date().toISOString(),
          printer: selectedPrinter
        };
      } catch (fallbackError) {
        console.error('❌ [MAIN] Erro no fallback:', fallbackError);
        throw new Error(`Erro principal: ${error.message}. Erro fallback: ${fallbackError.message}`);
      }
    }
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
