import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHECKOUT_MESSAGES } from '../constants/checkout.constants';

interface PaymentActionButtonProps {
  loading: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  paymentMethod: 'pix' | 'credit_card';
  onClick: () => void;
}

export const PaymentActionButton: React.FC<PaymentActionButtonProps> = ({
  loading,
  isGenerating,
  canGenerate,
  paymentMethod,
  onClick
}) => {
  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={loading || isGenerating || !canGenerate}
      className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-90 transition-all relative"
    >
      {loading || isGenerating ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {isGenerating ? CHECKOUT_MESSAGES.GENERATING_PIX : CHECKOUT_MESSAGES.PROCESSING_PAYMENT}
        </>
      ) : paymentMethod === 'pix' ? (
        <>
          Gerar PIX
        </>
      ) : (
        <>
          Finalizar Pagamento
        </>
      )}
    </Button>
  );
};
