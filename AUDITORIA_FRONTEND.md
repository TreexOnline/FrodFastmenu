# AUDITORIA ESTRUTURAL COMPLETA DO FRONTEND
# Mapeamento de Queries Supabase e Schema Esperado

## 1. ARQUIVOS DO FRONTEND QUE FAZEM CHAMADAS SUPABASE

### 1.1. Pages Principais

#### **PublicMenu.tsx**
```typescript
// Linha 155: Carrega produtos do menu
supabase.from("products").select("*").eq("menu_id", m.id).eq("is_available", true).order("position")

// Linha 156: Configurações do menu
supabase.from("menu_settings").select("*").eq("menu_id", m.id).maybeSingle()

// Linha 157: Categorias do menu
supabase.from("categories").select("*").eq("menu_id", m.id).order("position")

// Linha 242: Add-ons de produtos
supabase.from("product_addons").select("*").in("group_id", productGroupIds).eq("is_available", true).order("position")

// Linha 245: Opções da biblioteca de add-ons
supabase.from("addon_library_options").select("*").in("library_group_id", libraryGroupIds).eq("is_available", true).order("position")

// Linha 233: Grupos de add-ons de produtos
supabase.from("product_addon_groups").select("*").eq("product_id", productId).order("position")
```

#### **DashboardLayout.tsx**
```typescript
// Linha 31: Perfil do usuário
supabase.from("profiles").select("restaurant_name").eq("id", user.id).maybeSingle()

// Linha 34: Verificação de role admin
supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
```

#### **Settings.tsx**
```typescript
// Linha 58: Perfil completo
supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

// Linha 113: Atualização do perfil
supabase.from("profiles").update(payload).eq("id", user.id)
```

#### **Sales.tsx**
```typescript
// Linha 34: Pedidos do usuário
supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })

// Linha 35: Itens dos pedidos
supabase.from("order_items").select("*, orders!inner(user_id)").eq("orders.user_id", user.id)

// Linha 41: Atualização de status
supabase.from("orders").update({ status: "cancelled" }).in("id", staleIds)

// Linha 75: Atualização de status individual
supabase.from("orders").update({ status }).eq("id", id)

// Linha 84: Exclusão de pedido
supabase.from("orders").delete().eq("id", deleteId)

// Linha 93: Cardápios do usuário
supabase.from("menus").select("id").eq("user_id", user.id).limit(1)

// Linha 96: Produtos para demo
supabase.from("products").select("id, name, price").eq("menu_id", menuId).limit(8)

// Linha 114: Criação de pedido
supabase.from("orders").insert({...})

// Linha 129: Inserção de itens do pedido
supabase.from("order_items").insert(chosen.map(...))
```

#### **Orders.tsx**
```typescript
// Linha 111: Pedidos do usuário
supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })

// Linha 112: Itens dos pedidos com join
supabase.from("order_items").select("*, orders!inner(user_id)").eq("orders.user_id", user.id)

// Linha 114: Configurações do menu
supabase.from("menu_settings").select("menu_id,auto_print,print_split_by_category,display_name,menus(name,user_id)")
```

#### **MenusList.tsx**
```typescript
// Linha 106: Cardápios do usuário
supabase.from("menus").select("id,name,cover_url,is_active,slug").eq("user_id", user.id).order("created_at", { ascending: false })

// Linha 146: Criação de cardápio
supabase.from("menus").insert({ user_id: user.id, name: newName.trim(), ... })

// Linha 172: Exclusão de cardápio
supabase.from("menus").delete().eq("id", id)

// Linha 178: Ativação/desativação
supabase.from("menus").update({ is_active: !m.is_active }).eq("id", m.id)

// Linha 161: Criação de settings
supabase.from("menu_settings").insert({ menu_id: data.id, user_id: user.id })
```

#### **MenuEditor.tsx**
```typescript
// Linha 165: Cardápio específico
supabase.from("menus").select("*").eq("id", menuId).maybeSingle()

// Linha 166: Produtos do cardápio
supabase.from("products").select("*").eq("menu_id", menuId).order("position")

// Linha 305: Atualização de produto
supabase.from("products").update(payload).eq("id", editingProduct.id)

// Linha 307: Inserção de produto
supabase.from("products").insert(payload)

// Linha 322: Exclusão de produto
supabase.from("products").delete().eq("id", id)
```

#### **WhatsApp.tsx**
```typescript
// Linha 170: Mensagens automáticas
supabase.from("whatsapp_auto_messages" as any).select("*").eq("user_id", user.id).maybeSingle()

// Linha 285: Upsert de mensagens
supabase.from("whatsapp_auto_messages").upsert({ user_id: user?.id, ... })
```

#### **Inventory.tsx**
```typescript
// Linha 414: Atualização de item de estoque
supabase.from("inventory_items").update(payload).eq("id", editing.id)

// Linha 418: Inserção de item de estoque
supabase.from("inventory_items").insert(payload)
```

#### **AddonLibrary.tsx**
```typescript
// Linha 119: Exclusão de grupo de add-on
supabase.from("addon_library_groups").delete().eq("id", id)

// Linha 168: Exclusão de opção de add-on
supabase.from("addon_library_options").delete().eq("id", optionId)
```

## 2. TABELAS ESPERADAS PELO FRONTEND

### 2.1. Tabelas Principais

#### **profiles**
- **Colunas esperadas:** id, email, full_name, restaurant_name, whatsapp_number, current_plan, plan_active, plan_expires_at, plan_type, trial_started_at, trial_ends_at, whatsapp_addon_active, whatsapp_addon_expires_at, signup_ip, created_at, updated_at

#### **menus**
- **Colunas esperadas:** id, user_id, name, cover_url, is_active, slug, created_at, updated_at

#### **products**
- **Colunas esperadas:** id, menu_id, name, description, price, position, is_available, category_id, image_url, created_at, updated_at

#### **categories**
- **Colunas esperadas:** id, menu_id, store_id, name, position, created_at, updated_at

#### **menu_settings**
- **Colunas esperadas:** id, menu_id, user_id, auto_print, print_split_by_category, display_name, created_at, updated_at

#### **orders**
- **Colunas esperadas:** id, user_id, menu_id, customer_name, customer_phone, customer_email, total_amount, status, created_at, updated_at

#### **order_items**
- **Colunas esperadas:** id, order_id, product_id, quantity, price_at_time, created_at, updated_at

#### **product_addon_groups**
- **Colunas esperadas:** id, product_id, name, position, is_required, max_selections, selection_type, created_at, updated_at

#### **product_addons**
- **Colunas esperadas:** id, group_id, library_group_id, name, price, position, is_available, created_at, updated_at

#### **addon_library_groups**
- **Colunas esperadas:** id, user_id, name, position, is_required, max_selections, selection_type, created_at, updated_at

#### **addon_library_options**
- **Colunas esperadas:** id, library_group_id, name, price, position, is_available, created_at, updated_at

#### **whatsapp_auto_messages**
- **Colunas esperadas:** id, user_id, message_template, cooldown_minutes, is_active, created_at, updated_at

#### **inventory_items**
- **Colunas esperadas:** id, user_id, name, description, quantity, kind, created_at, updated_at

#### **user_roles**
- **Colunas esperadas:** id, user_id, role, permissions, created_at, updated_at

## 3. INCONSISTÊNCIAS CRÍTICAS IDENTIFICADAS

### 3.1. Problemas de Schema

#### **❌ whatsapp_auto_messages vs whatsapp_auto_responder**
- **Frontend espera:** `whatsapp_auto_messages`
- **Banco tem:** `whatsapp_auto_responder`
- **Impacto:** WhatsApp não funciona

#### **❌ Relacionamento products vs menu_items**
- **Frontend usa:** `products.menu_id` e `products.category_id`
- **Banco tem:** `menu_items.category_id` (relacionamento diferente)
- **Impacto:** Sistema de produtos quebrado

#### **❌ Colunas faltantes em products**
- **Frontend espera:** `is_available`, `category_id`
- **Banco pode não ter:** Essas colunas
- **Impacto:** Produtos não funcionam corretamente

### 3.2. Problemas de RLS

#### **❌ Tabelas sem policies de SELECT**
- `products` - Sem policy pública de leitura
- `product_addon_groups` - Sem policy pública de leitura
- `product_addons` - Sem policy pública de leitura
- `categories` - Sem policy pública de leitura
- `menu_items` - Sem policy pública de leitura

### 3.3. Problemas de Relacionamento

#### **❌ order_items com join incorreto**
```typescript
// Frontend usa:
supabase.from("order_items").select("*, orders!inner(user_id)").eq("orders.user_id", user.id)

// Mas deveria usar:
supabase.from("order_items").select("*").eq("order_id", orderId)
```

## 4. ESTRUTURA REAL DO BANCO VS ESPERADA

### 4.1. Tabelas que Existem vs Frontend Espera

| Tabela | Existe no Banco | Frontend Espera | Status |
|--------|------------------|----------------|--------|
| profiles | ✅ | profiles | ✅ |
| user_roles | ✅ | user_roles | ✅ |
| menus | ✅ | menus | ✅ |
| products | ✅ | products | ⚠️ |
| categories | ✅ | categories | ⚠️ |
| menu_settings | ✅ | menu_settings | ✅ |
| orders | ✅ | orders | ✅ |
| order_items | ✅ | order_items | ⚠️ |
| product_addon_groups | ✅ | product_addon_groups | ⚠️ |
| product_addons | ✅ | product_addons | ⚠️ |
| addon_library_groups | ✅ | addon_library_groups | ✅ |
| addon_library_options | ✅ | addon_library_options | ✅ |
| whatsapp_auto_responder | ✅ | whatsapp_auto_messages | ❌ |
| whatsapp_sessions | ✅ | whatsapp_sessions | ⚠️ |
| inventory_items | ✅ | inventory_items | ✅ |

### 4.2. Legendas
- ✅ **OK**: Tabela existe e frontend espera corretamente
- ⚠️ **ATENÇÃO**: Tabela existe mas pode ter diferenças de schema
- ❌ **CRÍTICO**: Tabela existe com nome diferente do esperado

## 5. DIAGNÓSTICO DOS ERROS 400/404

### 5.1. Erro 404 em /rest/v1/menus
- **Causa provável:** RLS bloqueando SELECT na tabela `menus`
- **Solução:** Criar policy pública de SELECT para `menus`

### 5.2. Erro 400 em /rest/v1/profiles
- **Causa provável:** Frontend selecionando colunas que não existem em `profiles`
- **Colunas problemáticas:** `trial_started_at`, `trial_ends_at`, `whatsapp_addon_active`
- **Solução:** Verificar schema real da tabela `profiles`

### 5.3. Erro 400 em /rest/v1/orders
- **Causa provável:** RLS bloqueando SELECT em `orders` ou `order_items`
- **Solução:** Criar policies públicas de SELECT para essas tabelas

## 6. RECOMENDAÇÕES

### 6.1. Imediatas (Emergencia)
1. **Criar policies públicas de SELECT** para todas as tabelas de catálogo:
   ```sql
   CREATE POLICY "Allow public select" ON public.products FOR SELECT USING (true);
   CREATE POLICY "Allow public select" ON public.categories FOR SELECT USING (true);
   CREATE POLICY "Allow public select" ON public.menu_items FOR SELECT USING (true);
   ```

2. **Corrigir nome da tabela WhatsApp:**
   ```sql
   ALTER TABLE whatsapp_auto_responder RENAME TO whatsapp_auto_messages;
   ```

3. **Verificar colunas da tabela profiles:**
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
   ```

### 6.2. Estruturais (Futuro)
1. **Migrar frontend para usar `menu_items`** em vez de `products`
2. **Padronizar relacionamentos** entre tabelas
3. **Criar schema documentation** atualizado

## 7. CONCLUSÃO

O frontend foi construído para um schema de banco de dados diferente do atual. As principais inconsistências são:

1. **Nome da tabela WhatsApp** (`whatsapp_auto_responder` vs `whatsapp_auto_messages`)
2. **Falta de policies públicas** de SELECT para tabelas de catálogo
3. **Possíveis diferenças de colunas** em tabelas como `products` e `profiles`

**Prioridade:** Corrigir as inconsistências de RLS primeiro para o sistema voltar a funcionar.
