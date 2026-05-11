import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export const useClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    setCopied(false);
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Código copiado!');
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        toast.error('Não foi possível copiar o código. Copie manualmente.');
      }
      
      document.body.removeChild(textArea);
    }
  }, []);

  return {
    copied,
    copyToClipboard
  };
};
