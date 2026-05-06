/* Notificador global de novos pedidos: monta o hook de som
   em qualquer rota do dashboard quando há usuário logado. */

import { useAuth } from "@/contexts/AuthContext";

export default function GlobalOrderNotifier() {
  // Componente desativado - lógica movida para useRealtimeOrders
  return null;
}
