import { useMemo } from 'react';

/**
 * Hook para extrair subdomínio do hostname atual
 * Funciona em localhost e produção
 * NÃO trata domínio principal como subdomínio
 */
export const useSubdomain = () => {
  const subdomain = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    const hostname = window.location.hostname;
    
    // Em desenvolvimento: localhost com subdomínio (ex: mascotylanches.localhost:3000)
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      // Só é subdomínio se tiver mais de 1 parte e a primeira não for 'localhost' ou 'www'
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www') {
        return parts[0];
      }
      return null;
    }
    
    // Em produção: validar se é realmente subdomínio
    const parts = hostname.split('.');
    
    // Domínios principais conhecidos (SEM subdomínio)
    const mainDomains = ['treexonline.online', 'treexmenu.app'];
    
    // Se o hostname exato é um domínio principal → NÃO é subdomínio
    if (mainDomains.includes(hostname)) {
      return { subdomain: null, isSubdomain: false, hostname };
    }
    
    // Se começa com www. + domínio principal → NÃO é subdomínio
    if (hostname.startsWith('www.') && mainDomains.includes(hostname.substring(4))) {
      return null;
    }
    
    // Verificar se tem estrutura de subdomínio válido
    // Ex: mascotylanches.treexonline.online (3+ partes)
    if (parts.length >= 3) {
      const potentialSubdomain = parts[0];
      const domain = parts.slice(1).join('.');
      
      // Ignorar www no início
      if (potentialSubdomain === 'www' && parts.length >= 4) {
        const realSubdomain = parts[1];
        const realDomain = parts.slice(2).join('.');
        
        // Verificar se o domínio restante é um domínio principal conhecido
        if (mainDomains.includes(realDomain)) {
          return realSubdomain;
        }
      }
      
      // Verificar se o domínio é um domínio principal conhecido
      if (mainDomains.includes(domain)) {
        return potentialSubdomain;
      }
    }
    
    return null;
  }, []);

  // Normalizar o slug: converter para formato válido
  const normalizedSlug = useMemo(() => {
    if (!subdomain) return null;
    
    // Converter para minúsculas e substituir hifens por espaços para busca
    const searchSlug = (subdomain as string).toLowerCase().replace(/-/g, ' ');
    
    // Manter o original para exibição
    const displaySlug = subdomain;
    
    return {
      original: displaySlug,
      search: searchSlug,
      url: (subdomain as string).toLowerCase() // para URLs consistentes
    };
  }, [subdomain]);

  return {
    subdomain,
    slug: normalizedSlug,
    isSubdomain: !!subdomain
  };
};
