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
    
    // Escutar resposta da impressão
    onPrintComplete: (callback) => {
      console.log('🖨️ [PRELOAD] Configurando listener para print-complete');
      ipcRenderer.on('print-complete', (event, data) => {
        console.log('🖨️ [PRELOAD] Resposta de impressão recebida:', data);
        callback(data);
      });
    }
  });

  console.log('✅ [PRELOAD] contextBridge.exposeInMainWorld executado com sucesso');
  
  // Verificar se a API foi realmente exposta
  setTimeout(() => {
    try {
      if (typeof window !== 'undefined') {
        console.log('🔍 [PRELOAD] Verificando se window.electronAPI foi criado...');
        // Não podemos acessar window.electronAPI diretamente aqui devido ao context isolation
        console.log('✅ [PRELOAD] API exposta via contextBridge');
      }
    } catch (err) {
      console.error('❌ [PRELOAD] Erro ao verificar API:', err);
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
