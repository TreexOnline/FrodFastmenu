/* Notificador global de novos pedidos: monta o hook de som
   em qualquer rota do dashboard quando há usuário logado. */

import { useAuth } from "@/contexts/AuthContext";
import { useNewOrderSound } from "@/hooks/useNewOrderSound";

export default function GlobalOrderNotifier() {
  const { user } = useAuth();
  useNewOrderSound(user?.id ?? null);
  return null;
}
