/**
 * Utilitário para impressão via Electron
 * Detecta automaticamente se está rodando no Electron e chama a função de impressão
 */

export interface ElectronAPI {
  print: (options?: any) => void;
  printSilent: () => void;
  getPrinters: () => Promise<any>;
  debug: (message: string) => void;
  isAvailable: () => boolean;
  checkStatus: () => any;
  onPrintComplete: (callback: (result: any) => void) => void;
}

// Detecta se está rodando no Electron
export const isElectron = (): boolean => {
  return window.electronAPI !== undefined;
};

// Função segura para impressão
export const printOrder = async (orderId: string, customerName?: string): Promise<void> => {
  try {
    console.log('🖨️ [PRINT DEBUG] Iniciando impressão do pedido:', { orderId, customerName });
    
    // Verifica se está no Electron
    if (!isElectron()) {
      console.log('🌐 [PRINT DEBUG] Não está no Electron, ignorando impressão');
      return;
    }

    // Verifica se a função de impressão existe
    if (!window.electronAPI?.print) {
      console.error('❌ [PRINT DEBUG] Função de impressão não encontrada no Electron');
      return;
    }

    // Aguarda um pequeno delay para garantir que o conteúdo esteja renderizado
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🖨️ [PRINT DEBUG] Chamando função de impressão do Electron');
    
    // Chama a função de impressão
    window.electronAPI.print();
    
    console.log('✅ [PRINT DEBUG] Impressão disparada com sucesso');
    
  } catch (error) {
    console.error('❌ [PRINT DEBUG] Erro na impressão:', error);
  }
};

// Função para impressão de qualquer conteúdo
export const printContent = async (): Promise<void> => {
  try {
    console.log('🖨️ [PRINT DEBUG] Iniciando impressão de conteúdo');
    
    if (!isElectron()) {
      console.log('🌐 [PRINT DEBUG] Não está no Electron, ignorando impressão');
      return;
    }

    if (!window.electronAPI?.print) {
      console.error('❌ [PRINT DEBUG] Função de impressão não encontrada');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🖨️ [PRINT DEBUG] Chamando impressão de conteúdo');
    window.electronAPI.print();
    console.log('✅ [PRINT DEBUG] Impressão de conteúdo concluída');
    
  } catch (error) {
    console.error('❌ [PRINT DEBUG] Erro na impressão de conteúdo:', error);
  }
};

// Adiciona tipagem global para o window
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
