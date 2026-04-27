/**
 * Exemplo de uso da API Electron no React
 * Componente para testar e validar a funcionalidade de impressão
 */

import React, { useState, useEffect } from 'react';

const ElectronPrintTest: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    checkElectronAPI();
  }, []);

  const checkElectronAPI = () => {
    addLog('🔍 Verificando window.electronAPI...');
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      addLog('✅ window.electronAPI detectado');
      
      if (typeof window.electronAPI.print === 'function') {
        addLog('✅ window.electronAPI.print é uma função');
        setApiStatus('available');
      } else {
        addLog('❌ window.electronAPI.print não é uma função');
        setApiStatus('unavailable');
      }
      
      if (typeof window.electronAPI.debug === 'function') {
        addLog('✅ window.electronAPI.debug disponível');
      }
      
      if (typeof window.electronAPI.checkStatus === 'function') {
        const status = window.electronAPI.checkStatus();
        addLog(`📊 Status da API: ${JSON.stringify(status)}`);
      }
    } else {
      addLog('❌ window.electronAPI não detectado');
      setApiStatus('unavailable');
    }
  };

  const testPrint = () => {
    addLog('🧪 Testando função de impressão...');
    
    try {
      if (window.electronAPI && window.electronAPI.print) {
        addLog('🖨️ Chamando window.electronAPI.print()');
        window.electronAPI.print();
        addLog('✅ Função print executada');
      } else {
        addLog('❌ API de impressão não disponível');
      }
    } catch (error) {
      addLog(`❌ Erro ao executar print: ${error}`);
    }
  };

  const testDebug = () => {
    addLog('🧪 Testando comunicação IPC...');
    
    try {
      if (window.electronAPI && window.electronAPI.debug) {
        addLog('📞 Enviando mensagem de debug');
        window.electronAPI.debug('Mensagem de teste do React!');
        addLog('✅ Mensagem de debug enviada');
      } else {
        addLog('❌ Função debug não disponível');
      }
    } catch (error) {
      addLog(`❌ Erro no debug: ${error}`);
    }
  };

  const isElectronEnvironment = () => {
    return typeof window !== 'undefined' && 
           (window.process?.type === 'renderer' || 
            navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Teste de Impressão Electron</h2>
      
      <div style={{
        padding: '10px',
        margin: '10px 0',
        borderRadius: '5px',
        backgroundColor: apiStatus === 'available' ? '#d4edda' : 
                         apiStatus === 'unavailable' ? '#f8d7da' : '#d1ecf1'
      }}>
        <strong>Status:</strong> {apiStatus === 'available' ? '✅ API Disponível' :
                                   apiStatus === 'unavailable' ? '❌ API Indisponível' :
                                   '🔍 Verificando...'}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Ambiente:</strong> {isElectronEnvironment() ? '🖥️ Electron' : '🌐 Navegador'}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkElectronAPI}
          style={{
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          1️⃣ Verificar API
        </button>
        
        <button 
          onClick={testPrint}
          disabled={apiStatus !== 'available'}
          style={{
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: apiStatus === 'available' ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: apiStatus === 'available' ? 'pointer' : 'not-allowed'
          }}
        >
          2️⃣ Testar Impressão
        </button>
        
        <button 
          onClick={testDebug}
          disabled={apiStatus !== 'available'}
          style={{
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: apiStatus === 'available' ? '#17a2b8' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: apiStatus === 'available' ? 'pointer' : 'not-allowed'
          }}
        >
          3️⃣ Testar Debug
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <h4>📊 Logs:</h4>
        {logs.length === 0 ? (
          <div>Nenhum log ainda...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ margin: '2px 0' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ElectronPrintTest;
