const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 [PRELOAD] Preload script iniciando...');

// Tentativa de expor API com tratamento de erro
try {
  // Expor funções seguras para o renderer process
  contextBridge.exposeInMainWorld('electronAPI', {
    print: (options = {}) => {
      console.log('🖨️ [PRELOAD] Função print() chamada via contextBridge', options);
      ipcRenderer.send('print', options);
    },
    
    // Função de impressão silenciosa (automática)
    printSilent: () => {
      console.log('🖨️ [PRELOAD] Função printSilent() chamada');
      ipcRenderer.send('print-silent');
    },
    
    // Função principal para impressão via HTML capturado
    printOrder: (html) => {
      console.log('🖨️ [PRELOAD] printOrder() chamado com HTML capturado');
      console.log('📄 [PRELOAD] Tamanho do HTML:', html.length, 'caracteres');
      
      // Enviar HTML para o processo principal via IPC
      ipcRenderer.invoke('print-order', {
        html: html,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title
      }).then(result => {
        console.log('✅ [PRELOAD] Resultado da impressão:', result);
      }).catch(error => {
        console.error('❌ [PRELOAD] Erro na impressão:', error);
      });
    },
    
    // Configurar impressora
    setPrinter: async (printerName) => {
      console.log('⚙️ [PRELOAD] Configurando impressora:', printerName);
      return await ipcRenderer.invoke('set-printer', printerName);
    },
    
    // Configurar seletores de conteúdo
    setContentSelectors: async (selectors) => {
      console.log('⚙️ [PRELOAD] Configurando seletores:', selectors);
      return await ipcRenderer.invoke('set-content-selectors', selectors);
    },
    
    // Configurar modo silencioso
    setSilentMode: async (useSilent) => {
      console.log('⚙️ [PRELOAD] Configurando modo silencioso:', useSilent);
      return await ipcRenderer.invoke('set-silent-mode', useSilent);
    },
    
    // Obter configurações atuais
    getPrinterConfig: async () => {
      console.log('⚙️ [PRELOAD] Obtendo configurações da impressora');
      return await ipcRenderer.invoke('get-printer-config');
    },
    
    // Escutar eventos de impressão
    onPrintSuccess: (callback) => {
      console.log('🖨️ [PRELOAD] Configurando listener para print-success');
      ipcRenderer.on('print-success', (event, data) => {
        console.log('✅ [PRELOAD] Impressão bem-sucedida:', data);
        callback(data);
      });
    },
    
    onPrintError: (callback) => {
      console.log('❌ [PRELOAD] Configurando listener para print-error');
      ipcRenderer.on('print-error', (event, data) => {
        console.log('❌ [PRELOAD] Erro na impressão:', data);
        callback(data);
      });
    },
    
    // Listar impressoras disponíveis
    getPrinters: async () => {
      console.log('🖨️ [PRELOAD] Obtendo lista de impressoras...');
      try {
        const result = await ipcRenderer.invoke('get-printers');
        console.log('🖨️ [PRELOAD] Impressoras obtidas:', result);
        return result;
      } catch (error) {
        console.error('❌ [PRELOAD] Erro ao obter impressoras:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Função de debug para testar comunicação
    debug: (message) => {
      console.log('📞 [PRELOAD] Debug message:', message);
      ipcRenderer.send('debug-message', message);
    },
    
    // Verificar se API está disponível
    isAvailable: () => {
      console.log('✅ [PRELOAD] API disponibilidade verificada');
      return true;
    },
    
    // Função para verificar status da API
    checkStatus: () => {
      return {
        loaded: true,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    },
    
    // ========================= IMPRESSÃO CENTRALIZADA =========================
    
    // Imprimir pedido - função principal e unificada
    printOrder: async (html, orderId = null, timestamp = null) => {
      console.log('🖨️ [PRELOAD] Enviando pedido para impressão:', { orderId, contentLength: html?.length });
      try {
        const result = await ipcRenderer.invoke('print-order', { 
          html, 
          orderId: orderId || 'order_' + Date.now(),
          timestamp: timestamp || new Date().toISOString()
        });
        console.log('🖨️ [PRELOAD] Pedido enviado para fila:', result);
        return result;
      } catch (error) {
        console.error('❌ [PRELOAD] Erro ao enviar pedido:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Escutar conclusão de jobs de impressão
    onPrintJobComplete: (callback) => {
      console.log('🖨️ [PRELOAD] Configurando listener para print-job-complete');
      ipcRenderer.on('print-job-complete', (event, data) => {
        console.log('🖨️ [PRELOAD] Job de impressão concluído:', data);
        callback(data);
      });
    },
    
    // ========================= AUTO UPDATE =========================
    
    // Escutar eventos de status do auto-update
    onUpdateStatus: (callback) => {
      console.log('🔄 [PRELOAD] Configurando listener para update-status');
      ipcRenderer.on('update-status', (event, data) => {
        console.log('🔄 [PRELOAD] Status de update:', data);
        callback(data);
      });
    },
    
    // Escutar eventos de progresso do download
    onUpdateProgress: (callback) => {
      console.log('📦 [PRELOAD] Configurando listener para update-progress');
      ipcRenderer.on('update-progress', (event, data) => {
        console.log('📦 [PRELOAD] Progresso de update:', data);
        callback(data);
      });
    },
    
    // Verificar manualmente por atualizações
    checkForUpdates: () => {
      console.log('🔄 [PRELOAD] Verificando atualizações manualmente...');
      ipcRenderer.send('check-for-updates');
    },
    
    // Instalar atualização manualmente
    installUpdateNow: async () => {
      console.log('🚀 [PRELOAD] Instalando atualização solicitada...');
      return await ipcRenderer.invoke('install-update-now');
    }
  });

  console.log('✅ [PRELOAD] contextBridge.exposeInMainWorld executado com sucesso');
  
  // Criar helper global para auto-print
  setTimeout(() => {
    try {
      if (typeof window !== 'undefined') {
        // Função helper global para interceptação automática
        window.electronAutoPrint = function(html) {
          console.log('�️ [PRELOAD] Auto-print interceptado:', html?.length, 'caracteres');
          if (window.electronAPI && window.electronAPI.printOrder) {
            window.electronAPI.printOrder(html, 'auto_order_' + Date.now());
          } else {
            console.error('❌ [PRELOAD] electronAPI.printOrder não disponível');
          }
        };
        
        console.log('✅ [PRELOAD] window.electronAutoPrint criado para interceptação');
      }
    } catch (err) {
      console.error('❌ [PRELOAD] Erro ao criar helper global:', err);
    }
  }, 100);
  
} catch (error) {
  console.error('❌ [PRELOAD] Erro ao expor API via contextBridge:', error);
  ipcRenderer.send('preload-error', { error: error.message, stack: error.stack });
}

// Criar função print() global como solicitado (apenas se não existir)
try {
  if (typeof window !== 'undefined' && !window.print) {
    window.print = () => {
      console.log('🖨️ [PRELOAD] Função print() global chamada');
      ipcRenderer.send('print');
    };
    console.log('✅ [PRELOAD] Função print() global criada');
  }
} catch (err) {
  console.error('❌ [PRELOAD] Erro ao criar função print global:', err);
}

// Log final para confirmar que preload foi carregado
console.log('✅ [PRELOAD] Preload script concluído');

// Enviar mensagem para o main process confirmando carregamento
try {
  ipcRenderer.send('preload-loaded', { 
    timestamp: new Date().toISOString(),
    success: true,
    contextBridge: true
  });
} catch (err) {
  console.error('❌ [PRELOAD] Erro ao enviar preload-loaded:', err);
}
