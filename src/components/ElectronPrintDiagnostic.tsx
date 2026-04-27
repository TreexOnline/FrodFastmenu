/**
 * Componente React avançado para diagnóstico e teste de impressão Electron
 */

import React, { useState, useEffect } from 'react';

interface Printer {
  name: string;
  isDefault?: boolean;
}

interface PrintResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  printer?: string;
}

const ElectronPrintDiagnostic: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<PrintResult | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  useEffect(() => {
    checkAPI();
    scanPrinters();
    setupPrintListener();
  }, []);

  const checkAPI = () => {
    addLog('Verificando API Electron...');
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      addLog('window.electronAPI detectado', 'success');
      
      const methods = ['print', 'printSilent', 'getPrinters', 'debug', 'isAvailable', 'checkStatus'];
      methods.forEach(method => {
        if (typeof window.electronAPI[method] === 'function') {
          addLog(`✅ window.electronAPI.${method} disponível`, 'success');
        } else {
          addLog(`❌ window.electronAPI.${method} não disponível`, 'error');
        }
      });
    } else {
      addLog('❌ window.electronAPI não detectado', 'error');
    }
  };

  const setupPrintListener = () => {
    // Configurar listener para respostas de impressão
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onPrintComplete) {
      (window as any).electronAPI.onPrintComplete((result: PrintResult) => {
        addLog(`Resposta da impressão: ${JSON.stringify(result)}`, result.success ? 'success' : 'error');
        setLastResult(result);
        setIsPrinting(false);
      });
    }
  };

  const scanPrinters = async () => {
    setIsScanning(true);
    addLog('Escaneando impressoras disponíveis...');
    
    try {
      if ((window as any).electronAPI?.getPrinters) {
        const result = await (window as any).electronAPI.getPrinters();
        
        if (result.success) {
          const printerList = result.printers.map((name: string) => ({ name }));
          setPrinters(printerList);
          
          if (printerList.length > 0) {
            setSelectedPrinter(printerList[0].name);
            addLog(`${printerList.length} impressoras encontradas`, 'success');
            printerList.forEach(printer => {
              addLog(`  - ${printer.name}`, 'info');
            });
          } else {
            addLog('Nenhuma impressora encontrada', 'error');
          }
        } else {
          addLog(`Erro ao escanear impressoras: ${result.error}`, 'error');
        }
      } else {
        addLog('Função getPrinters não disponível', 'error');
      }
    } catch (error) {
      addLog(`Erro ao escanear impressoras: ${error}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const testPrint = async (silent: boolean = false, specificPrinter?: string) => {
    if (!(window as any).electronAPI?.print) {
      addLog('API de impressão não disponível', 'error');
      return;
    }

    setIsPrinting(true);
    addLog(`Iniciando impressão ${silent ? 'silenciosa' : 'com diálogo'}...`, 'info');

    try {
      const options = {
        silent,
        deviceName: specificPrinter || selectedPrinter
      };

      addLog(`Opções: ${JSON.stringify(options)}`, 'info');
      
      (window as any).electronAPI.print(options);
      addLog('Comando de impressão enviado', 'success');
      
    } catch (error) {
      addLog(`Erro ao enviar comando de impressão: ${error}`, 'error');
      setIsPrinting(false);
    }
  };

  const testPrintSilent = () => {
    if (!(window as any).electronAPI?.printSilent) {
      addLog('Função printSilent não disponível', 'error');
      return;
    }

    setIsPrinting(true);
    addLog('Iniciando impressão silenciosa automática...', 'info');
    
    try {
      (window as any).electronAPI.printSilent();
      addLog('Comando de impressão silenciosa enviado', 'success');
    } catch (error) {
      addLog(`Erro ao enviar comando de impressão silenciosa: ${error}`, 'error');
      setIsPrinting(false);
    }
  };

  const testDebug = () => {
    if ((window as any).electronAPI?.debug) {
      addLog('Enviando mensagem de debug...', 'info');
      (window as any).electronAPI.debug('Mensagem de teste do componente React');
    } else {
      addLog('Função debug não disponível', 'error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs limpos', 'info');
  };

  const isElectronEnvironment = () => {
    return typeof window !== 'undefined' && 
           (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔧 Diagnóstico Avançado de Impressão Electron</h2>
      
      <div style={{
        padding: '15px',
        margin: '10px 0',
        borderRadius: '8px',
        backgroundColor: isElectronEnvironment() ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isElectronEnvironment() ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <strong>Ambiente:</strong> {isElectronEnvironment() ? '🖥️ Electron' : '🌐 Navegador'}
        {isElectronEnvironment() && <span style={{ marginLeft: '10px' }}>✅ API deve estar disponível</span>}
      </div>

      {/* Seção de Impressoras */}
      <div style={{
        padding: '15px',
        margin: '10px 0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6'
      }}>
        <h3>🖨️ Impressoras Disponíveis</h3>
        
        <button 
          onClick={scanPrinters}
          disabled={isScanning}
          style={{
            padding: '8px 16px',
            margin: '5px',
            backgroundColor: isScanning ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isScanning ? 'not-allowed' : 'pointer'
          }}
        >
          {isScanning ? '🔄 Escaneando...' : '🔍 Escanear Impressoras'}
        </button>

        {printers.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <label>Selecionar impressora:</label>
            <select 
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              {printers.map(printer => (
                <option key={printer.name} value={printer.name}>
                  {printer.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {printers.length === 0 && !isScanning && (
          <div style={{ color: '#dc3545', marginTop: '10px' }}>
            Nenhuma impressora encontrada. Verifique se há impressoras instaladas no sistema.
          </div>
        )}
      </div>

      {/* Seção de Testes */}
      <div style={{
        padding: '15px',
        margin: '10px 0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6'
      }}>
        <h3>🧪 Testes de Impressão</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            onClick={() => testPrint(false)}
            disabled={isPrinting || printers.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: isPrinting || printers.length === 0 ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isPrinting || printers.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            🖨️ Imprimir (com diálogo)
          </button>
          
          <button 
            onClick={() => testPrint(true)}
            disabled={isPrinting || printers.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: isPrinting || printers.length === 0 ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isPrinting || printers.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            🔇 Imprimir (silencioso)
          </button>
          
          <button 
            onClick={testPrintSilent}
            disabled={isPrinting}
            style={{
              padding: '10px 20px',
              backgroundColor: isPrinting ? '#6c757d' : '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: isPrinting ? 'not-allowed' : 'pointer'
            }}
          >
            🤖 Imprimir Automático
          </button>
          
          <button 
            onClick={testDebug}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📞 Testar Debug
          </button>
          
          <button 
            onClick={checkAPI}
            style={{
              padding: '10px 20px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
          🔍 Verificar API
          </button>
          
          <button 
            onClick={clearLogs}
            style={{
              padding: '10px 20px',
              backgroundColor: '#343a40',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Limpar Logs
          </button>
        </div>

        {isPrinting && (
          <div style={{ marginTop: '10px', color: '#007bff' }}>
            🔄 Impressão em andamento...
          </div>
        )}

        {lastResult && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: lastResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${lastResult.success ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            <strong>Último resultado:</strong>
            <br />
            {lastResult.success ? '✅ Sucesso' : '❌ Falha'}
            {lastResult.printer && <><br />Impressora: {lastResult.printer}</>}
            {lastResult.error && <><br />Erro: {lastResult.error}</>}
            {lastResult.timestamp && <><br />Horário: {new Date(lastResult.timestamp).toLocaleString()}</>}
          </div>
        )}
      </div>

      {/* Logs */}
      <div style={{
        padding: '15px',
        margin: '10px 0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6'
      }}>
        <h3>📊 Logs do Sistema</h3>
        <div style={{
          backgroundColor: '#212529',
          color: '#f8f9fa',
          padding: '15px',
          borderRadius: '4px',
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          maxHeight: '300px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#6c757d' }}>Nenhum log ainda. Execute alguma ação para ver os logs.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ margin: '2px 0' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectronPrintDiagnostic;
