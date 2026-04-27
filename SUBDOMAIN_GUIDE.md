# Guia de Subdomínios - TreexMenu

## Visão Geral

O sistema agora suporta subdomínios dinâmicos para cardápios, permitindo que cada restaurante tenha seu próprio endereço personalizado.

## Como Funciona

### 1. Estrutura de Subdomínios

- **Produção**: `restaurant-name.treexonline.online`
- **Desenvolvimento**: `restaurant-name.localhost:8081`

### 2. Lógica de Correspondência

O sistema busca o cardápio correspondente usando múltiplas estratégias:

1. **Busca Exata**: Procura pelo slug exato no banco
2. **Nome Formatado**: Converte "restaurant-name" → "Restaurant Name" e busca
3. **Case Insensitive**: Busca pelo nome ignorando maiúsculas/minúsculas
4. **Busca Parcial**: Procura por termos individuais no nome
5. **Slug Case Insensitive**: Busca pelo slug ignorando case

### 3. Exemplos de Correspondência

| Subdomínio | Nome no Banco | Resultado |
|------------|---------------|-----------|
| `mascoty-lanches` | "Mascoty Lanches" | ✅ Encontrado |
| `restaurante-abc` | "Restaurante ABC" | ✅ Encontrado |
| `pizzaria-do-joao` | "Pizzaria do João" | ✅ Encontrado |
| `burger-house` | "Burger House" | ✅ Encontrado |
| `inexistente` | (não existe) | ❌ Erro 404 |

## Configuração

### DNS (Produção)

Configure um wildcard DNS:
```
*.treexonline.online.  IN  A  SEU_IP_DO_SERVIDOR
```

### Vercel

Adicione o domínio wildcard nas configurações da Vercel.

## Fluxo do Usuário

1. **Acesso**: Cliente acessa `restaurant-name.treexonline.online`
2. **Detecção**: Sistema extrai "restaurant-name" do subdomínio
3. **Busca**: Procura cardápio correspondente no banco
4. **Redirecionamento**: Se encontrado, redireciona para `/menu/slug-correto`
5. **Erro**: Se não encontrado, mostra página de "Cardápio não encontrado"

## Páginas de Erro

### Cardápio Não Encontrado
- Mostra mensagem amigável
- Exibe o nome buscado
- Oferece link para voltar ao site principal

### Carregando
- Spinner animado
- Mensagem "Carregando cardápio..."
- Experiência de loading profissional

## Testes Locais

### Configurar Hosts (Windows)

Edite `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1   test-restaurant.localhost
```

### Acessar Local

```
http://test-restaurant.localhost:8081
```

## Boas Práticas

### Nomes de Cardápios

1. **Use slugs amigáveis**: `restaurant-name` em vez de `restaurant_name_123`
2. **Seja consistente**: Se o nome é "Mascoty Lanches", use `mascoty-lanches`
3. **Evite caracteres especiais**: Use apenas letras, números e hifens

### SEO

- Subdomínios são indexáveis pelo Google
- Cada restaurante tem seu próprio "site"
- URLs limpas e profissionais

## Troubleshooting

### Erro 404

1. Verifique se o cardápio existe no banco
2. Confirme se `is_active = true`
3. Teste diferentes variações do nome

### Não Redireciona

1. Verifique configuração de DNS
2. Confirme se o wildcard está ativo
3. Teste com ferramentas online (nslookup)

### Problemas de Case

O sistema é case insensitive, mas recomenda-se:
- Nomes: "Mascoty Lanches"
- Slugs: "mascoty-lanches"
- URLs: minúsculas

## Exemplo Prático

### Criar Novo Cardápio

1. **Nome**: "Santa Pizza"
2. **Slug**: "santa-pizza" (gerado automaticamente)
3. **Acesso**: `santa-pizza.treexonline.online`

### Resultado

- Cliente acessa `santa-pizza.treexonline.online`
- Sistema encontra "Santa Pizza" no banco
- Redireciona para `/menu/santa-pizza`
- Cardápio carrega normalmente

## Compatibilidade

- ✅ Funciona em localhost
- ✅ Funciona em produção (Vercel)
- ✅ Mantém rotas existentes (`/menu/:slug`)
- ✅ SEO friendly
- ✅ Mobile first
