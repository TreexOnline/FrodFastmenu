/* ===== Persistência do carrinho e dados do cliente (localStorage) =====
 *
 * - Carrinho expira em 24h.
 * - Dados do cliente (nome, telefone, endereço) ficam separados e não expiram.
 * - NUNCA armazenar informação de troco.
 */

import { CartItem, CheckoutData } from "./cart";

const CART_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const CART_PREFIX = "treex.cart.";
const CUSTOMER_KEY = "treex.customer";

interface StoredCart {
  items: CartItem[];
  savedAt: number; // timestamp ms
}

export interface StoredCustomer {
  customerName: string;
  customerPhone: string;
  address: CheckoutData["address"];
}

const cartKeyFor = (slug: string) => `${CART_PREFIX}${slug}`;

/** Salva o carrinho no localStorage com timestamp. */
export function salvarCarrinho(slug: string, items: CartItem[]): void {
  if (!slug || typeof window === "undefined") return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(cartKeyFor(slug));
      return;
    }
    const payload: StoredCart = { items, savedAt: Date.now() };
    localStorage.setItem(cartKeyFor(slug), JSON.stringify(payload));
  } catch {
    /* silencioso */
  }
}

/** Lê o carrinho salvo. Se passou de 24h, retorna []. */
export function carregarCarrinho(slug: string): CartItem[] {
  if (!slug || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartKeyFor(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed?.savedAt || !Array.isArray(parsed.items)) return [];
    if (Date.now() - parsed.savedAt > CART_TTL_MS) {
      localStorage.removeItem(cartKeyFor(slug));
      return [];
    }
    return parsed.items;
  } catch {
    return [];
  }
}

/** Limpa carrinho expirado (para uso em hooks de inicialização). */
export function limparCarrinhoExpirado(slug: string): void {
  if (!slug || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(cartKeyFor(slug));
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CART_TTL_MS) {
      localStorage.removeItem(cartKeyFor(slug));
    }
  } catch {
    localStorage.removeItem(cartKeyFor(slug));
  }
}

/** Limpa o carrinho atual (após pedido enviado, por exemplo). */
export function limparCarrinho(slug: string): void {
  if (!slug || typeof window === "undefined") return;
  localStorage.removeItem(cartKeyFor(slug));
}

/* ===== Dados do cliente ===== */

export function salvarDadosCliente(data: StoredCustomer): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
  } catch {
    /* silencioso */
  }
}

export function carregarDadosCliente(): StoredCustomer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCustomer;
    if (!parsed) return null;
    return {
      customerName: parsed.customerName || "",
      customerPhone: parsed.customerPhone || "",
      address: {
        street: parsed.address?.street || "",
        number: parsed.address?.number || "",
        neighborhood: parsed.address?.neighborhood || "",
        zip: parsed.address?.zip || "",
        complement: parsed.address?.complement || "",
      },
    };
  } catch {
    return null;
  }
}
