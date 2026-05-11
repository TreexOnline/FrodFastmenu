import React from 'react';
import { Check } from 'lucide-react';
import { Plan } from '@/services/paymentService';

interface CheckoutSummaryProps {
  selectedPlan: Plan;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({ selectedPlan }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span>Plano Selecionado:</span>
        <span className="font-bold">{selectedPlan.name}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span>Valor:</span>
        <span className="font-bold text-xl">
          {formatPrice(selectedPlan.price)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Até 2 cardápios</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Produtos ilimitados</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Categorias ilimitadas</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Adicionais ilimitados</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Suporte por email</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>QR Code personalizado</span>
        </div>
      </div>
    </div>
  );
};
