import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// DEBUG: Capturar erros de frame/cross-origin
window.addEventListener('error', (event) => {
  console.error('🚨 WINDOW ERROR:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// DEBUG: Capturar erros de recursos não carregados
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', {
    reason: event.reason,
    promise: event.promise
  });
});

// DEBUG: Verificar se há tentativas de frame/cross-origin
const originalCreateObjectURL = URL.createObjectURL;
URL.createObjectURL = function(...args) {
  console.log('🔍 createObjectURL chamado:', args[0]);
  return originalCreateObjectURL.apply(this, args);
};

console.log('🚀 DEBUG MODE ATIVADO - Monitorando erros de frame/cross-origin');

createRoot(document.getElementById("root")!).render(<App />);
