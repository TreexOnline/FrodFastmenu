import React from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PaymentMethodSelectorProps {
  paymentMethod: 'pix' | 'credit_card';
  onPaymentMethodChange: (method: 'pix' | 'credit_card') => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onPaymentMethodChange
}) => {
  return (
    <RadioGroup
      value={paymentMethod}
      onValueChange={onPaymentMethodChange}
      className="grid md:grid-cols-2 gap-4"
    >
      <label
        htmlFor="pix"
        className={`border rounded-2xl p-4 lg:p-5 cursor-pointer transition-all ${
          paymentMethod === 'pix'
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <RadioGroupItem value="pix" id="pix" />
          <QrCode className="h-5 w-5 text-purple-400" />
          <span className="font-medium text-sm lg:text-base">PIX</span>
        </div>
        <p className="text-sm text-zinc-400 mt-3">
          Aprovação instantânea
        </p>
      </label>

      <label
        htmlFor="credit_card"
        className={`border rounded-2xl p-4 lg:p-5 cursor-pointer transition-all ${
          paymentMethod === 'credit_card'
            ? 'border-orange-500 bg-orange-500/10'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <RadioGroupItem value="credit_card" id="credit_card" />
          <CreditCard className="h-5 w-5 text-orange-400" />
          <span className="font-medium text-sm lg:text-base">
            Cartão de Crédito
          </span>
        </div>
        <p className="text-sm text-zinc-400 mt-3">
          Parcelamento disponível
        </p>
      </label>
    </RadioGroup>
  );
};
