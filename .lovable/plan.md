
## 📋 Respostas + Plano de implementação

---

### 1️⃣ Observação geral no checkout do cardápio — **REMOVER**

**Onde está:** `src/pages/PublicMenu.tsx`, linhas **1707–1715**, dentro do `CheckoutFlow`. É um `<Field label="Observações do pedido (opcional)">` com `<textarea>` ligado a `data.notes`.

**O que fazer:**
- Remover o bloco do JSX (linhas 1707–1715).
- Remover `notes` do objeto `EMPTY_CHECKOUT` em `src/lib/cart.ts` e o uso em `data.notes` no PublicMenu (também na composição `notesTxt` em ~linha 1435 — manterei só agendamento/troco se houver, sem nota do cliente).
- Garantir que as observações **por item** continuam sendo gravadas em `order_items.notes` (já funciona).

---

### 2️⃣ Agendamento de pedidos — **EXPLICAÇÃO + IMPLEMENTAÇÃO**

**Como está hoje:**
- ✅ O **banco já tem** as colunas em `menu_settings`: `accept_scheduled` (boolean, default `false`), `scheduling_min_minutes` (default 30) e `scheduling_max_days` (default 7).
- ✅ Os pedidos já gravam `is_scheduled` e `scheduled_for` (`PublicMenu.tsx` linhas 1457–1458).
- ✅ Existe um componente pronto: `src/components/menu/SchedulingPicker.tsx` (calendário + slots respeitando horário de funcionamento).
- ❌ **Mas o componente NÃO está sendo usado em lugar nenhum!** Não há toggle no painel do dono nem o picker aparece no checkout do cliente. O recurso está "órfão".

**O que farei:**

**A. Painel do dono — `src/pages/dashboard/MenuEditor.tsx`, na aba/seção “Informações do menu” (junto de horário, taxa de entrega, etc.):**
- Adicionar um card **“Agendamento de pedidos”** com:
  - `Switch` **“Permitir que clientes agendem pedidos”** (`accept_scheduled`).
  - Quando ativo, dois inputs numéricos:
    - **“Antecedência mínima (minutos)”** (`scheduling_min_minutes`).
    - **“Janela máxima (dias)”** (`scheduling_max_days`).
  - Salva direto em `menu_settings` via `update`.

**B. Checkout do cliente — `src/pages/PublicMenu.tsx`, `CheckoutFlow`:**
- Carregar `accept_scheduled / scheduling_min_minutes / scheduling_max_days` (já vem em `settings`).
- Se `accept_scheduled === true`, exibir antes do botão de finalizar:
  - Tabs/seletor **“Quando?” → [Assim que possível] | [Agendar]**.
  - Quando “Agendar” for escolhido, renderizar `<SchedulingPicker>` com `businessHours`, `minMinutes`, `maxDays` e cores do tema; o valor escolhido vai para `data.scheduledFor`.
- Bloquear envio se “Agendar” foi escolhido e `scheduledFor` está vazio.

---

### 3️⃣ Sistema de impressora — **EXPLICAÇÃO**

**Resumo do fluxo atual** (`src/pages/dashboard/Orders.tsx` + `src/lib/printOrder.ts`):

1. A página **Pedidos** abre uma assinatura **Realtime** do Supabase nas tabelas `orders` e `order_items` filtrando por `user_id`.
2. Quando chega um `INSERT` em `orders`, o handler:
   - Mostra um `toast` “Novo pedido de …”.
   - Se `printSettings.auto_print` está ligado e o id ainda não foi impresso, espera ~600 ms para os `order_items` chegarem e chama `doPrint(order, items)`.
3. `doPrint` mapeia para `PrintItem[]` e chama `printOrder()` de `src/lib/printOrder.ts`.
4. `printOrder` monta um **HTML otimizado para impressora térmica 80 mm** (Courier 12 px, largura 72 mm, página `@page size: 80mm auto`), abre uma nova janela, escreve o HTML e dispara `window.print()` automaticamente após 250 ms. Se `print_split_by_category` está ativo, gera **uma “folha” por categoria + uma folha resumo com TOTAL**.
5. O usuário liga/desliga `auto_print` e `print_split_by_category` na própria página de Pedidos (atualiza `menu_settings`).

**Limitações importantes:**
- A impressão só acontece se a página **Pedidos** estiver aberta (é onde o Realtime escuta).
- Depende do navegador permitir pop-ups (a janela é aberta com `window.open`).
- Não fala direto com a impressora — usa o diálogo de impressão do navegador (mas com layout pronto para térmica).

---

### 4️⃣ Som de novo pedido — **GERAR COM IA + TOCAR GLOBAL E ALTO**

**Geração (uma vez, em build/setup):**
- Usar a skill **ElevenLabs Sound Effects** com o prompt:
  > “Short, pleasant restaurant order notification chime: bright two-note bell, warm and clear, 1.2 seconds, no speech, modern POS sound.”
- Duração ~1.5 s, formato MP3.
- Salvar em `public/sounds/new-order.mp3` para servir estaticamente.

**Tocar globalmente, mesmo fora da página Pedidos:**
- Criar `src/hooks/useNewOrderSound.ts`:
  - Recebe `user.id`.
  - Mantém um `Audio(new URL("/sounds/new-order.mp3"))` com `volume = 1.0` e `preload = "auto"`.
  - Abre canal Realtime `orders-global-sound` filtrando `user_id=eq.${user.id}`, evento `INSERT` em `orders`.
  - Em cada novo pedido: `audio.currentTime = 0; audio.play()` + `toast.success("🔔 Novo pedido!")` (sonner já está montado em `App.tsx`).
  - Deduplica por id (Set em `useRef`) para evitar tocar duas vezes se Pedidos também já estiver montado.
- Montar o hook em `src/App.tsx` dentro de um pequeno componente `<GlobalOrderNotifier />` renderizado quando há usuário logado, para que rode em **qualquer rota do dashboard**.
- **Desbloqueio de autoplay** (browsers exigem interação do usuário antes de permitir áudio):
  - No primeiro `click` / `keydown` da sessão, chamar `audio.play().then(() => audio.pause())` uma vez para “armar” o elemento.
  - Se ainda assim falhar, mostrar um toast discreto: “Clique em qualquer lugar para ativar o som de novos pedidos”.
- “Som alto”: além de `volume = 1`, tocar **duas vezes em sequência** (chime duplo) para destacar — controlado por uma flag simples no hook.

---

### 📦 Resumo dos arquivos que serão alterados/criados

**Editados:**
- `src/pages/PublicMenu.tsx` — remover textarea de observação geral; adicionar bloco de “Quando?” + `SchedulingPicker` quando `accept_scheduled`.
- `src/lib/cart.ts` — remover `notes` de `EMPTY_CHECKOUT` (e usos derivados).
- `src/pages/dashboard/MenuEditor.tsx` — novo card “Agendamento de pedidos” (toggle + min minutos + max dias).
- `src/App.tsx` — montar `<GlobalOrderNotifier />` para o usuário logado.

**Criados:**
- `src/hooks/useNewOrderSound.ts` — Realtime + autoplay desbloqueado + dedupe.
- `src/components/GlobalOrderNotifier.tsx` — wrapper que usa o hook.
- `public/sounds/new-order.mp3` — gerado via ElevenLabs (skill `elevenlabs-music-sfx`).

**Sem mudanças de schema** — todas as colunas necessárias (`accept_scheduled`, `scheduling_min_minutes`, `scheduling_max_days`, `is_scheduled`, `scheduled_for`) já existem.

---

Posso seguir com essa implementação?
