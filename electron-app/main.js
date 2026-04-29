const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// Sistema de fila de impressão
const printQueue = [];
let isPrinting = false;

// Configurações de impressora
const configPath = path.join(__dirname, 'printer-config.json');
let printerConfig = {
  selectedPrinter: '',
  contentSelectors: ['.print-area', '.pedido', '.order-content', '.receipt', 'main'],
  useSilentMode: true
};

// ========================= CONFIG =========================

function loadPrinterConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      printerConfig = { ...printerConfig, ...JSON.parse(data) };
      console.log('✅ [CONFIG] Configurações carregadas:', printerConfig);
    }
  } catch (error) {
    console.warn('⚠️ [CONFIG] Erro ao carregar configurações:', error.message);
  }
}

function savePrinterConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(printerConfig, null, 2));
    console.log('✅ [CONFIG] Configurações salvas');
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao salvar configurações:', error.message);
  }
}

// ========================= PRINTERS =========================

const getPrinters = async () => {
  console.log('🖨️ [MAIN] Listando impressoras disponíveis...');

  try {
    if (mainWindow && mainWindow.webContents.getPrintersAsync) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const printerNames = printers.map(p => p.name).filter(Boolean);
      console.log('✅ [MAIN] Impressoras encontradas (API Async):', printerNames);
      return printerNames;
    }

    return new Promise((resolve, reject) => {
      exec('wmic printer get name', (error, stdout) => {
        if (error) {
          exec('powershell "Get-Printer | Select-Object Name"', (error2, stdout2) => {
            if (error2) {
              reject(error2);
            } else {
              const printers = stdout2.split('\n')
                .filter(line => line.trim() && !line.includes('Name') && !line.includes('---'))
                .map(line => line.trim());
              resolve(printers);
            }
          });
        } else {
          const printers = stdout.split('\n')
            .filter(line => line.trim() && line !== 'Name' && !line.includes('No Instance'))
            .map(line => line.trim());
          resolve(printers);
        }
      });
    });
  } catch (error) {
    console.error('❌ [MAIN] Erro geral ao listar impressoras:', error);
    return [];
  }
};

// ========================= TEMPLATE =========================

function createPrintTemplate(content, title = 'Documento') {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{box-sizing:border-box;}
body{
font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
font-size:12px;
line-height:1.4;
color:#333;
margin:0;
padding:20px;
background:white;
}
table{width:100%;border-collapse:collapse;margin-bottom:15px;}
table th,table td{border:1px solid #ddd;padding:8px;text-align:left;}
img{max-width:100%;height:auto;}
.header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #333;}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;text-align:center;font-size:10px;color:#666;}
</style>
</head>
<body>
<div class="header">
<h1>${title}</h1>
<div>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
</div>
<div class="content">${content}</div>
<div class="footer">Gerado via TreexMenu Electron App</div>
</body>
</html>`;
};

// ========================= PRINT JOB =========================

async function executePrintJob(job) {
  let selectedPrinter = '';

  try {
    const printers = await getPrinters();
    selectedPrinter = printerConfig.selectedPrinter;

    if (!selectedPrinter || !printers.includes(selectedPrinter)) {
      selectedPrinter = printers.length > 0 ? printers[0] : '';
    }

    if (!selectedPrinter) throw new Error('Nenhuma impressora disponível');

    const htmlContent = job.data.html || '<p>Conteúdo não disponível</p>';
    const printTemplate = createPrintTemplate(htmlContent, job.data.title || 'Documento');

    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        offscreen: true
      }
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(printTemplate)}`;
    await printWindow.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 300));

    const printOptions = {
      silent: true,
      printBackground: true,
      scaleFactor: 1,
      deviceName: selectedPrinter,
      copies: 1,
      marginsType: 0,
      pageSize: {
        width: 80000,
        height: 200000
      },
      landscape: false
    };

    return new Promise((resolve, reject) => {
      printWindow.webContents.print(printOptions, (success, errorType) => {
        printWindow.destroy();

        if (success) {
          if (mainWindow) {
            mainWindow.webContents.send('print-success', {
              jobId: job.id,
              printer: selectedPrinter,
              timestamp: new Date().toISOString()
            });
          }
          resolve(true);
        } else {
          reject(new Error(errorType || 'Erro desconhecido'));
        }
      });
    });

  } catch (error) {
    if (mainWindow) {
      mainWindow.webContents.send('print-error', {
        jobId: job.id,
        error: error.message,
        printer: selectedPrinter,
        timestamp: new Date().toISOString()
      });
    }
    throw error;
  }
}

async function processPrintQueue() {
  if (isPrinting || printQueue.length === 0) return;

  isPrinting = true;

  while (printQueue.length > 0) {
    const job = printQueue.shift();

    try {
      await executePrintJob(job);
    } catch (error) {
      console.error('❌ [QUEUE] Erro:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  isPrinting = false;
}

// ========================= WINDOW =========================

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  loadPrinterConfig();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: false
    }
  });

  mainWindow.loadURL('https://www.treexonline.online/');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });
}

// ========================= IPC EVENTS =========================

ipcMain.handle('get-printers', async () => {
  try {
    const printers = await getPrinters();
    return { success: true, printers };
  } catch (error) {
    console.error('❌ [MAIN] Erro ao obter impressoras:', error);
    return { success: false, error: error.message };
  }
});

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

ipcMain.on('print-silent', async (event) => {
  console.log('🖨️ [MAIN] Evento de impressão silenciosa recebido');
  
  // Chamar impressão com silent: true
  ipcMain.emit('print', event, { silent: true });
});

ipcMain.handle('print-order', async (event, data) => {
  console.log('🖨️ [MAIN] print-order recebido:', { 
    contentLength: data.html?.length, 
    url: data.url, 
    title: data.title,
    timestamp: data.timestamp 
  });
  
  // Criar job e adicionar à fila
  const jobId = 'print_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const job = {
    id: jobId,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  printQueue.push(job);
  console.log('🖨️ [QUEUE] Job adicionado à fila:', jobId, 'Fila:', printQueue.length);
  
  // Processar fila imediatamente
  processPrintQueue();
  
  // Retornar ID do job para acompanhamento
  return { 
    success: true, 
    jobId: jobId,
    queuePosition: printQueue.length,
    timestamp: new Date().toISOString()
  };
});

ipcMain.handle('set-printer', async (event, printerName) => {
  console.log('⚙️ [CONFIG] Configurando impressora:', printerName);
  
  const printers = await getPrinters();
  if (printerName && printers.includes(printerName)) {
    printerConfig.selectedPrinter = printerName;
    savePrinterConfig();
    console.log('✅ [CONFIG] Impressora configurada com sucesso');
    return { success: true, printer: printerName };
  } else {
    console.error('❌ [CONFIG] Impressora não encontrada:', printerName);
    return { success: false, error: 'Impressora não encontrada', availablePrinters: printers };
  }
});

ipcMain.handle('set-content-selectors', async (event, selectors) => {
  console.log('⚙️ [CONFIG] Configurando seletores:', selectors);
  
  if (Array.isArray(selectors) && selectors.length > 0) {
    printerConfig.contentSelectors = selectors;
    savePrinterConfig();
    console.log('✅ [CONFIG] Seletores configurados com sucesso');
    return { success: true, selectors: selectors };
  } else {
    console.error('❌ [CONFIG] Seletores inválidos');
    return { success: false, error: 'Seletores inválidos' };
  }
});

ipcMain.handle('set-silent-mode', async (event, useSilent) => {
  console.log('⚙️ [CONFIG] Configurando modo silencioso:', useSilent);
  
  printerConfig.useSilentMode = Boolean(useSilent);
  savePrinterConfig();
  console.log('✅ [CONFIG] Modo silencioso configurado');
  return { success: true, useSilent: printerConfig.useSilentMode };
});

ipcMain.handle('get-printer-config', async () => {
  const printers = await getPrinters();
  return {
    config: printerConfig,
    availablePrinters: printers,
    queueStatus: {
      length: printQueue.length,
      isPrinting: isPrinting
    }
  };
});

ipcMain.on('debug-message', (event, message) => {
  console.log('📞 [MAIN] Mensagem do renderer:', message);
});

// ========================= AUTO UPDATE =========================

function setupAutoUpdater() {
  console.log('🔄 [UPDATE] Configurando auto-updater...');
  
  // Configurar servidor de updates
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'VictorTreex',
    repo: 'app-FrodFast-eletron'
  });
  
  // Eventos do auto-updater
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 [UPDATE] Verificando atualizações...');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'checking' });
    }
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('⬇️ [UPDATE] Atualização disponível:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { 
        status: 'available', 
        version: info.version,
        releaseNotes: info.releaseNotes 
      });
    }
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ [UPDATE] App está atualizado. Versão:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { 
        status: 'not-available', 
        version: info.version 
      });
    }
  });
  
  autoUpdater.on('error', (err) => {
    console.error('❌ [UPDATE] Erro no update:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { 
        status: 'error', 
        error: err.message 
      });
    }
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "📦 [UPDATE] Baixando atualização: ";
    log_message += Math.round(progressObj.percent) + "%";
    log_message += " (" + progressObj.transferred + "/" + progressObj.total + ")";
    console.log(log_message);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('🚀 [UPDATE] Atualização baixada! Reiniciando app...');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { 
        status: 'downloaded',
        version: info.version
      });
    }
    
    // Reiniciar e instalar após 3 segundos
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 3000);
  });
}

// Quando o app estiver pronto
app.whenReady().then(() => {
  console.log('🚀 [MAIN] App pronto, criando janela...');
  
  // Configurar auto-updater
  setupAutoUpdater();
  
  // Criar janela principal
  createWindow();
  
  // Verificar atualizações após 5 segundos
  setTimeout(() => {
    console.log('🔄 [UPDATE] Iniciando verificação de atualizações...');
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
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