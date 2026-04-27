/**
 * Gera slug a partir de um nome
 * Ex: "Vitinho Burguer" -> "vitinhoburguer"
 * Regras: minúsculo, sem espaços, sem acentos, sem caracteres especiais
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove caracteres especiais (mantém apenas letras e números)
    .replace(/[^\w]/g, '')
    // Remove espaços completamente
    .replace(/\s+/g, '')
    // Remove caracteres não alfanuméricos
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Atualiza cardápios existentes sem slug
 */
export async function fixExistingMenus() {
  console.log("🔧 Iniciando correção de cardápios existentes...");
  
  // Teste para MASCOTY LANCHES
  const testName = "MASCOTY LANCHES";
  const testSlug = generateSlug(testName);
  console.log(`📝 Teste: "${testName}" → "${testSlug}"`);
  
  return testSlug;
}

/**
 * Gera slug único, adicionando sufixo numérico se necessário
 */
export async function generateUniqueSlug(name: string, checkIfExists: (slug: string) => Promise<boolean>): Promise<string> {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  // Se o slug base já existe, adicionar sufixo numérico
  while (await checkIfExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
