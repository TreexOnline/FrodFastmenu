import { supabase } from '@/integrations/supabase/client';

export interface Menu {
  id: string;
  name: string;
  cover_url: string | null;
  slug: string;
  is_active: boolean;
  user_id: string;
}

/**
 * Busca cardápio por slug com correspondência flexível
 * Tenta encontrar o cardápio correspondente ao subdomínio
 */
export async function getMenuBySlug(slug: string): Promise<Menu | null> {
  if (!slug) return null;

  try {
    // Primeiro: tentar busca exata pelo slug
    const { data: exactMatch } = await supabase
      .from('menus')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (exactMatch) return exactMatch;

    // Segundo: tentar busca pelo nome (case insensitive)
    // Converte o slug para formato de nome: "mascoty-lanches" -> "Mascoty Lanches"
    const nameFromSlug = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const { data: nameMatch } = await supabase
      .from('menus')
      .select('*')
      .eq('name', nameFromSlug)
      .eq('is_active', true)
      .maybeSingle();

    if (nameMatch) return nameMatch;

    // Terceiro: busca case insensitive pelo nome
    const { data: nameCaseInsensitive } = await supabase
      .from('menus')
      .select('*')
      .ilike('name', nameFromSlug)
      .eq('is_active', true)
      .maybeSingle();

    if (nameCaseInsensitive) return nameCaseInsensitive;

    // Quarto: busca parcial (se o nome contém o slug sem hifens)
    const searchTerms = slug.toLowerCase().split('-');
    for (const term of searchTerms) {
      if (term.length < 3) continue; // ignorar termos muito curtos

      const { data: partialMatch } = await supabase
        .from('menus')
        .select('*')
        .ilike('name', `%${term}%`)
        .eq('is_active', true)
        .maybeSingle();

      if (partialMatch) return partialMatch;
    }

    // Quinto: busca pelo slug original (case insensitive)
    const { data: slugCaseInsensitive } = await supabase
      .from('menus')
      .select('*')
      .ilike('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (slugCaseInsensitive) return slugCaseInsensitive;

    return null;
  } catch (error) {
    console.error('Erro ao buscar cardápio por slug:', error);
    return null;
  }
}

/**
 * Verifica se um hostname corresponde a um subdomínio válido
 */
export function isValidSubdomain(hostname: string): boolean {
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    return parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www';
  }

  const parts = hostname.split('.');
  return parts.length >= 3 && parts[0] !== 'www';
}

/**
 * Extrai o slug do hostname
 */
export function extractSlugFromHostname(hostname: string): string | null {
  if (!isValidSubdomain(hostname)) return null;

  const parts = hostname.split('.');
  const subdomain = parts[0] === 'www' ? parts[1] : parts[0];
  
  return subdomain.toLowerCase();
}
