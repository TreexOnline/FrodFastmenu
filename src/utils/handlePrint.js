/**
 * Função de impressão universal compatível com Electron e navegador
 * Detecta automaticamente o ambiente e usa o método correto
 */

// Detecta se está rodando no Electron
const isElectron = () => {
  return typeof window !== 'undefined' && 
         (window.process?.type === 'renderer' || 
          navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
};

// Função principal de impressão
const handlePrint = (options = {}) => {
  console.log('🖨️ [PRINT] Iniciando impressão...');
  console.log('🖨️ [PRINT] Ambiente:', isElectron() ? 'Electron' : 'Navegador');
  
  if (isElectron()) {
    // Ambiente Electron - usar API nativa
    console.log('🖨️ [PRINT] Usando window.electronAPI.print()');
    
    if (window.electronAPI?.print) {
      window.electronAPI.print({
        silent: options.silent || false,
        deviceName: options.deviceName || '',
        printBackground: true,
        scaleFactor: 1
      });
      return true;
    } else {
      console.error('❌ [PRINT] window.electronAPI não disponível');
      return false;
    }
  } else {
    // Ambiente navegador - usar método padrão
    console.log('🖨️ [PRINT] Usando window.print()');
    
    // Adicionar CSS de impressão se necessário
    if (options.addPrintStyles) {
      const printStyles = `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          @page {
            margin: 1cm;
          }
        }
      `;
      
      const styleElement = document.createElement('style');
      styleElement.textContent = printStyles;
      document.head.appendChild(styleElement);
      
      // Remover estilos após impressão
      setTimeout(() => {
        document.head.removeChild(styleElement);
      }, 1000);
    }
    
    // Imprimir área específica se especificada
    if (options.printArea) {
      const printContent = document.querySelector(options.printArea);
      if (printContent) {
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent.innerHTML;
        
        window.print();
        
        // Restaurar conteúdo original
        setTimeout(() => {
          document.body.innerHTML = originalContent;
        }, 1000);
        
        return true;
      }
    }
    
    // Impressão padrão
    window.print();
    return true;
  }
};

// Função para imprimir área específica
const printArea = (selector, options = {}) => {
  return handlePrint({
    ...options,
    printArea: selector,
    addPrintStyles: true
  });
};

// Função para impressão silenciosa (apenas Electron)
const printSilent = (options = {}) => {
  if (isElectron()) {
    console.log('🖨️ [PRINT] Iniciando impressão silenciosa...');
    
    if (window.electronAPI?.printSilent) {
      window.electronAPI.printSilent();
      return true;
    } else if (window.electronAPI?.print) {
      window.electronAPI.print({ silent: true, ...options });
      return true;
    } else {
      console.error('❌ [PRINT] API silenciosa não disponível');
      return false;
    }
  } else {
    console.warn('⚠️ [PRINT] Impressão silenciosa não disponível no navegador');
    return false;
  }
};

// Exportar funções
window.handlePrint = handlePrint;
window.printArea = printArea;
window.printSilent = printSilent;

// Sobrescrever funções antigas se existirem
if (typeof window.printOrder === 'function') {
  console.log('🔄 [PRINT] Substituindo função printOrder existente');
  const oldPrintOrder = window.printOrder;
  window.printOrder = handlePrint;
}

console.log('✅ [PRINT] Sistema de impressão universal carregado');
console.log('🖨️ [PRINT] Funções disponíveis:');
console.log('  - handlePrint(): Impressão universal');
console.log('  - printArea(selector): Impressão de área específica');
console.log('  - printSilent(): Impressão silenciosa (Electron)');
