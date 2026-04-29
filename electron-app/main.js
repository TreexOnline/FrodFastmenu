const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// Sistema de fila de impressão (CRÍTICO para restaurante)
const printQueue = [];
let isPrinting = false;

// Configurações de impressora
const configPath = path.join(__dirname, 'printer-config.json');
let printerConfig = {
  selectedPrinter: '',
  contentSelectors: ['.print-area', '.pedido', '.order-content', '.receipt', 'main'],
  useSilentMode: true
};

// Carregar configurações salvas
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

// Salvar configurações
function savePrinterConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(printerConfig, null, 2));
    console.log('✅ [CONFIG] Configurações salvas');
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao salvar configurações:', error.message);
  }
}

// Processar fila de impressão
async function processPrintQueue() {
  if (isPrinting || printQueue.length === 0) {
    return;
  }

  isPrinting = true;
  console.log('🖨️ [QUEUE] Processando fila, itens:', printQueue.length);

  while (printQueue.length > 0) {
    const job = printQueue.shift();
    console.log('🖨️ [QUEUE] Processando job:', job.id);
    
    try {
      await executePrintJob(job);
      console.log('✅ [QUEUE] Job concluído:', job.id);
    } catch (error) {
      console.error('❌ [QUEUE] Erro no job:', job.id, error.message);
      
      // Notificar erro para o renderer
      if (mainWindow) {
        mainWindow.webContents.send('print-error', {
          jobId: job.id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Pequeno delay entre impressões para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  isPrinting = false;
  console.log('✅ [QUEUE] Fila processada');
}

// Executar job de impressão
async function executePrintJob(job) {
  console.log('🖨️ [JOB] Executando job:', job.id);
  
  // ✅ selectedPrinter global na função (escopo correto)
  let selectedPrinter = '';
  
  try {
    // Obter impressoras disponíveis
    const printers = await getPrinters();
    console.log('🖨️ [JOB] Impressoras disponíveis:', printers);
    
    // Selecionar impressora (configurada ou primeira disponível)
    selectedPrinter = printerConfig.selectedPrinter;
    if (!selectedPrinter || !printers.includes(selectedPrinter)) {
      selectedPrinter = printers.length > 0 ? printers[0] : '';
      console.log('🖨️ [JOB] Usando primeira impressora disponível:', selectedPrinter);
    } else {
      console.log('🖨️ [JOB] Usando impressora configurada:', selectedPrinter);
    }
    
    // 🔴 VALIDAÇÃO OBRIGATÓRIA - Impressora deve existir
    if (!selectedPrinter) {
      console.error('❌ [JOB] Nenhuma impressora disponível para impressão PDV');
      throw new Error('Nenhuma impressora disponível');
    }
    
    // ✅ DEBUG OBRIGATÓRIO - Verificar nomes EXATOS
    console.log('🖨️ [DEBUG] Impressoras encontradas:', printers.map(p => `"${p}"`));
    console.log('🖨️ [DEBUG] Impressora selecionada:', `"${selectedPrinter}"`);
    console.log('🖨️ [JOB] Impressora validada para PDV:', selectedPrinter);
    
    // Criar template HTML
    const htmlContent = job.data.html || '<p>Conteúdo não disponível</p>';
    const printTemplate = createPrintTemplate(htmlContent, job.data.title || 'Documento');
    
    console.log('📄 [JOB] Template HTML criado, tamanho:', printTemplate.length, 'caracteres');
    
    // Criar janela oculta para impressão (100% invisível)
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false, // 🔴 OBRIGATÓRIO - janela 100% oculta
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        offscreen: true // 🔴 MELHOR - renderização offscreen
      }
    });
    
    console.log('🖨️ [JOB] Janela de impressão criada');
    
    // Carregar HTML com encoding UTF-8 correto
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(printTemplate)}`;
    
    await printWindow.loadURL(dataUrl);
    console.log('✅ [JOB] HTML carregado na janela de impressão');
    
    // ✅ ESPERA GARANTIDA - did-finish-load pode não disparar com dataURL
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 🔴 Garantir que janela está 100% oculta
    printWindow.once('ready-to-show', () => {
      printWindow.hide();
    });
    
    console.log('🖨️ [JOB] Iniciando impressão...');
    
    // Configurações de impressão (100% SILENCIOSO - PDV MODE)
    const printOptions = {
      silent: true, // 🔴 OBRIGATÓRIO - nunca mostrar diálogo
      printBackground: true,
      scaleFactor: 1,
      deviceName: selectedPrinter,
      copies: 1,
      marginsType: 0,
      pageSize: {
        width: 80000,  // ✅ 80mm - impressora térmica
        height: 200000 // ✅ grande o suficiente para cupom
      },
      landscape: false
    };
    
    console.log('🖨️ [JOB] Enviando para impressora (PDV MODE):', selectedPrinter);
    console.log('🖨️ [JOB] Opções de impressão:', printOptions);
    
    // 🚫 PROIBIDO: Qualquer fallback visual
    // 🚫 PROIBIDO: silent: false
    // 🚫 PROIBIDO: abrir janelas
    
    // Executar impressão 100% silenciosa com callback
    return new Promise((resolve, reject) => {
      printWindow.webContents.print(printOptions, (success, errorType) => {
        // Limpar janela imediatamente (não esperar)
        printWindow.removeAllListeners();
        printWindow.destroy();
        
        if (success) {
          console.log('✅ [JOB] Impressão PDV concluída com sucesso');
          
          // Notificar sucesso
          if (mainWindow) {
            mainWindow.webContents.send('print-success', {
              jobId: job.id,
              printer: selectedPrinter,
              timestamp: new Date().toISOString(),
              silent: true
            });
          }
          
          resolve({ 
            success: true, 
            timestamp: new Date().toISOString(),
            printer: selectedPrinter,
            contentLength: htmlContent.length,
            silent: true
          });
        } else {
          console.error('❌ [JOB] Erro na impressão PDV:', errorType);
          
          // � NÃO TENTAR FALLBACK VISUAL
          // Em PDV real, se falhar, apenas reportar erro
          
          if (mainWindow) {
            mainWindow.webContents.send('print-error', {
              jobId: job.id,
              error: errorType || 'Erro desconhecido na impressão',
              printer: selectedPrinter,
              timestamp: new Date().toISOString()
            });
          }
          
          reject(new Error(`Erro na impressão PDV: ${errorType}`));
        }
      });
    });
    
  } catch (error) {
    console.error('❌ [JOB] Erro geral na impressão:', error.message);
    
    // � PROIBIDO: Fallback visual em PDV
    // Em PDV real, se falhar, apenas reportar erro
    
    if (mainWindow) {
      mainWindow.webContents.send('print-error', {
        jobId: job.id,
        error: error.message,
        printer: selectedPrinter,
        timestamp: new Date().toISOString()
      });
    }
    
    throw new Error(`Erro na impressão PDV: ${error.message}`);
  }
}

function createWindow() {
  console.log('🚀 [MAIN] Criando janela Electron...');
  
  // Verificar se o arquivo preload existe
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('📁 [MAIN] Preload path:', preloadPath);
  
  if (!fs.existsSync(preloadPath)) {
    console.error('❌ [MAIN] Arquivo preload.js não encontrado em:', preloadPath);
    return;
  }
  console.log('✅ [MAIN] Arquivo preload.js encontrado');
  
  // Carregar configurações ao iniciar
  loadPrinterConfig();
  
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
      console.log('🔧 [MAIN] Injetando script de interceptação de impressão v3.0...');
      
      mainWindow.webContents.executeJavaScript(`
        (function() {
          console.log('🔧 [INJECT] Iniciando interceptação completa v3.0...');
          
          // Configurações de seletores (virão do main process)
          const contentSelectors = ${JSON.stringify(printerConfig.contentSelectors)};
          
          // Função melhorada para capturar conteúdo com seletores configuráveis
          const captureContent = () => {
            let content = '';
            
            // Tentar cada seletor configurado
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                console.log('🎯 [INJECT] Área de impressão encontrada com seletor:', selector);
                content = element.innerHTML;
                break;
              }
            }
            
            // Fallback para body se nenhum seletor funcionar
            if (!content) {
              console.log('📄 [INJECT] Usando body.innerHTML como fallback');
              content = document.body.innerHTML;
            }
            
            console.log('📊 [INJECT] Conteúdo capturado:', content.length, 'caracteres');
            return content;
          };
          
          // Sobrescrever window.open completamente
          const originalOpen = window.open;
          window.open = function(url, name, specs) {
            console.log('🚫 [INJECT] window.open interceptado:', { url, name, specs });
            
            // Criar janela fake que não faz nada
            const fakeWindow = {
              print: function() {
                console.log('🖨️ [INJECT] Print interceptado via fake window');
                const content = captureContent();
                window.electronAPI?.printOrder(content);
              },
              close: function() {
                console.log('🚫 [INJECT] Window close interceptado');
              },
              focus: function() {
                console.log('🚫 [INJECT] Window focus interceptado');
              },
              document: document,
              location: { href: window.location.href }
            };
            
            return fakeWindow;
          };
          
          // Sobrescrever window.print completamente
          const originalPrint = window.print;
          window.print = function() {
            console.log('🖨️ [INJECT] window.print interceptado diretamente');
            
            const content = captureContent();
            window.electronAPI?.printOrder(content);
            
            return false; // Prevenir comportamento padrão
          };
          
          // Interceptar tentativas de impressão via document.execCommand
          const originalExecCommand = document.execCommand;
          document.execCommand = function(command, ...args) {
            if (command === 'print') {
              console.log('🖨️ [INJECT] document.execCommand print interceptado');
              const content = captureContent();
              window.electronAPI?.printOrder(content);
              return true;
            }
            return originalExecCommand.apply(this, [command, ...args]);
          };
          
          // Múltiplas camadas para interceptar Ctrl+P
          const interceptCtrlP = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
              console.log('🖨️ [INJECT] Ctrl+P interceptado');
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              
              const content = captureContent();
              window.electronAPI?.printOrder(content);
              return false;
            }
          };
          
          document.addEventListener('keydown', interceptCtrlP, true);
          document.addEventListener('keypress', interceptCtrlP, true);
          document.addEventListener('keyup', interceptCtrlP, true);
          
          // Adicionar listener para qualquer botão de impressão
          document.addEventListener('click', function(e) {
            const target = e.target;
            const text = target.textContent?.toLowerCase() || '';
            const ariaLabel = target.getAttribute('aria-label')?.toLowerCase() || '';
            const className = target.className?.toLowerCase() || '';
            const role = target.getAttribute('role')?.toLowerCase() || '';
            
            if (text.includes('imprimir') || text.includes('print') || 
                ariaLabel.includes('imprimir') || ariaLabel.includes('print') ||
                className.includes('print') || className.includes('imprimir') ||
                role.includes('print')) {
              console.log('🖨️ [INJECT] Botão de impressão detectado:', target);
              
              setTimeout(() => {
                const content = captureContent();
                window.electronAPI?.printOrder(content);
              }, 100);
            }
          }, true);
          
          // Interceptar qualquer chamada de impressão via MutationObserver
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) { // Element node
                    const hasPrintAttr = node.getAttribute('onclick')?.includes('print') ||
                                      node.getAttribute('data-print') ||
                                      node.className?.includes('print');
                    
                    if (hasPrintAttr) {
                      console.log('🖨️ [INJECT] Elemento de impressão dinâmico detectado:', node);
                      node.addEventListener('click', () => {
                        const content = captureContent();
                        window.electronAPI?.printOrder(content);
                      });
                    }
                  }
                });
              }
            });
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          console.log('✅ [INJECT] Interceptação completa v3.0 instalada');
          return true;
        })();
      `).then(() => {
        console.log('✅ [MAIN] Script de interceptação v3.0 injetado com sucesso');
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

  // Função para listar impressoras disponíveis (API moderna)
  const getPrinters = async () => {
    console.log('🖨️ [MAIN] Listando impressoras disponíveis...');
    
    try {
      // API moderna do Electron
      if (mainWindow && mainWindow.webContents.getPrintersAsync) {
        const printers = await mainWindow.webContents.getPrintersAsync();
        const printerNames = printers.map(p => p.name).filter(Boolean);
        console.log('✅ [MAIN] Impressoras encontradas (API Async):', printerNames);
        return printerNames;
      }
      
      // Fallback: método antigo
      console.warn('⚠️ [MAIN] API Async não disponível, usando fallback...');
      return new Promise((resolve, reject) => {
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
    } catch (error) {
      console.error('❌ [MAIN] Erro geral ao listar impressoras:', error);
      return [];
    }
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

  // Template HTML para impressão
  const createPrintTemplate = (content, title = 'Documento') => {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    @media print {
      body {
        padding: 10px;
      }
      
      .no-print {
        display: none !important;
      }
      
      @page {
        margin: 1cm;
        size: A4;
      }
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 0;
      margin-bottom: 10px;
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    table th,
    table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    table th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="date">${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
  </div>
  
  <div class="content">
    ${content}
  </div>
  
  <div class="footer">
    Gerado via TreexMenu Electron App
  </div>
</body>
</html>`;
  };

  // Escutar evento de impressão via HTML capturado (com fila)
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

  // Configurar impressora
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

  // Configurar seletores de conteúdo
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

  // Configurar modo silencioso
  ipcMain.handle('set-silent-mode', async (event, useSilent) => {
    console.log('⚙️ [CONFIG] Configurando modo silencioso:', useSilent);
    
    printerConfig.useSilentMode = Boolean(useSilent);
    savePrinterConfig();
    console.log('✅ [CONFIG] Modo silencioso configurado');
    return { success: true, useSilent: printerConfig.useSilentMode };
  });

  // Obter configurações atuais
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

  // Escutar mensagens do renderer
  ipcMain.on('debug-message', (event, message) => {
    console.log('📞 [MAIN] Mensagem do renderer:', message);
  });

  // Sistema de Auto-Update
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

}

console.log('🚀 [MAIN] Iniciando app FrodFast com Auto-Update...');