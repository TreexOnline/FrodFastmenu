/* ===== Tipos e helpers do carrinho ===== */

export interface AddonOption {
  id: string;
  name: string;
  price: number;
  default_quantity?: number;
}

export interface AddonGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  max_selections: number | null;
  options: AddonOption[];
}

export interface CartItemAddon {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  /** chave única do item no carrinho (gera com makeCartKey) */
  key: string;
  product_id: string;
  product_name: string;
  unit_price: number; // preço base
  image_url: string | null;
  quantity: number;
  addons: CartItemAddon[];
  notes: string;
}

/** Gera uma chave estável que identifica o item considerando adicionais + observações.
 *  Itens "iguais" (mesmo produto, mesmos adicionais, mesma obs) são agrupados;
 *  produtos com observações ou adicionais ficam separados. */
export function makeCartKey(
  productId: string,
  addons: CartItemAddon[],
  notes: string,
): string {
  const addonsKey = [...addons]
    .map((a) => `${a.option_id}x${a.quantity}`)
    .sort()
    .join("|");
  const notesKey = notes.trim().toLowerCase();
  return `${productId}::${addonsKey}::${notesKey}`;
}

export function itemUnitTotal(item: CartItem): number {
  const addonsSum = item.addons.reduce(
    (acc, a) => acc + Number(a.price || 0) * Math.max(1, a.quantity || 1),
    0,
  );
  return Number(item.unit_price || 0) + addonsSum;
}

export function itemSubtotal(item: CartItem): number {
  return itemUnitTotal(item) * item.quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + itemSubtotal(it), 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + it.quantity, 0);
}

/* ===== Tipos do checkout ===== */

export type OrderType = "delivery" | "pickup" | "dine_in";
export type PaymentMethod = "cash" | "credit" | "debit";

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
  dine_in: "Comer no local",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
};

export interface CheckoutAddress {
  street: string;
  number: string;
  neighborhood: string;
  zip: string;
  complement: string;
}

export interface CheckoutData {
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  address: CheckoutAddress;
  payment: PaymentMethod;
  needsChange: boolean;
  changeFor: string;
  notes: string;
  /** Quando agendado, contém o timestamp escolhido pelo cliente (caso contrário null). */
  scheduledFor?: Date | null;
}

export const EMPTY_CHECKOUT: CheckoutData = {
  orderType: "delivery",
  customerName: "",
  customerPhone: "",
  address: { street: "", number: "", neighborhood: "", zip: "", complement: "" },
  payment: "cash",
  needsChange: false,
  changeFor: "",
  notes: "",
  scheduledFor: null,
};

/* ===== Mensagem do WhatsApp ===== */

export interface BuildMessageParams {
  restaurantName: string;
  items: CartItem[];
  checkout: CheckoutData;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export function buildWhatsAppMessage(p: BuildMessageParams): string {
  const lines: string[] = [];
  lines.push(`*Novo pedido — ${p.restaurantName}*`);
  lines.push("");
  lines.push(`*Cliente:* ${p.checkout.customerName}`);
  if (p.checkout.customerPhone) lines.push(`*Telefone:* ${p.checkout.customerPhone}`);
  lines.push(`*Tipo:* ${ORDER_TYPE_LABEL[p.checkout.orderType]}`);
  if (p.checkout.scheduledFor) {
    const d = p.checkout.scheduledFor;
    const pad = (n: number) => String(n).padStart(2, "0");
    lines.push(
      `*Agendado para:* ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
  }
  lines.push("");

  lines.push("*Itens:*");
  p.items.forEach((it) => {
    lines.push(`• ${it.quantity}x ${it.product_name} — R$ ${itemSubtotal(it).toFixed(2)}`);
    if (it.addons.length > 0) {
      it.addons.forEach((a) => {
        const qty = Math.max(1, a.quantity || 1);
        const lineTotal = Number(a.price) * qty;
        const priceTxt = a.price > 0 ? ` (+R$ ${lineTotal.toFixed(2)})` : "";
        const qtyTxt = qty > 1 ? `${qty}x ` : "";
        lines.push(`   - ${qtyTxt}${a.option_name}${priceTxt}`);
      });
    }
    if (it.notes.trim()) lines.push(`   Obs: ${it.notes.trim()}`);
  });
  lines.push("");

  lines.push(`*Subtotal:* R$ ${p.subtotal.toFixed(2)}`);
  if (p.checkout.orderType === "delivery") {
    lines.push(`*Taxa de entrega:* R$ ${p.deliveryFee.toFixed(2)}`);
  }
  lines.push(`*Total:* R$ ${p.total.toFixed(2)}`);
  lines.push("");

  lines.push(`*Pagamento:* ${PAYMENT_LABEL[p.checkout.payment]}`);
  if (p.checkout.payment === "cash" && p.checkout.needsChange && p.checkout.changeFor) {
    lines.push(`*Troco para:* R$ ${Number(p.checkout.changeFor).toFixed(2)}`);
  }

  if (p.checkout.orderType === "delivery") {
    const a = p.checkout.address;
    lines.push("");
    lines.push("*Endereço de entrega:*");
    lines.push(`${a.street}, ${a.number} — ${a.neighborhood}`);
    if (a.complement) lines.push(`Complemento: ${a.complement}`);
    if (a.zip) lines.push(`CEP: ${a.zip}`);
  }

  if (p.checkout.notes.trim()) {
    lines.push("");
    lines.push(`*Observações gerais:* ${p.checkout.notes.trim()}`);
  }

  return lines.join("\n");
}
