import React from 'react';
import { Check, RefreshCw, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { useClipboard } from '../hooks/useClipboard';
import { CHECKOUT_MESSAGES } from '../constants/checkout.constants';
import { PaymentResponse } from '@/services/paymentService';

interface PixPaymentDisplayProps {
  payment: PaymentResponse;
  qrCodeDataUrl?: string;
  paymentStatus: string;
  timeLeft: string;
  onGenerateNewPix: () => void;
  isGenerating: boolean;
}

export const PixPaymentDisplay: React.FC<PixPaymentDisplayProps> = ({
  payment,
  qrCodeDataUrl,
  paymentStatus,
  timeLeft,
  onGenerateNewPix,
  isGenerating
}) => {
  const { copied, copyToClipboard } = useClipboard();

  return (
    <div className="mt-8 border border-green-500/20 rounded-3xl p-6 lg:p-8 bg-green-500/5 text-center">
      <PaymentStatusBadge
        status={paymentStatus}
        timeLeft={timeLeft}
      />
      
      {qrCodeDataUrl ? (
        <div className="mb-6">
          <img 
            src={qrCodeDataUrl} 
            alt="QR Code PIX" 
            className="w-48 h-48 lg:w-64 lg:h-64 mx-auto bg-white rounded-lg p-4"
          />
        </div>
      ) : payment.qr_code ? (
        <div className="mb-6">
          <img 
            src={payment.qr_code} 
            alt="QR Code PIX" 
            className="w-48 h-48 lg:w-64 lg:h-64 mx-auto bg-white rounded-lg p-4"
          />
        </div>
      ) : (
        <div className="mb-6">
          <div className="w-48 h-48 lg:w-64 lg:h-64 mx-auto bg-gray-200 rounded-lg p-4 flex flex-col items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p>Gerando QR Code...</p>
            </div>
          </div>
        </div>
      )}

      {payment.pix_code && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Código PIX</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={payment.pix_code}
                readOnly
                className="flex-1 bg-white/5 border-white/10 text-white font-mono p-3 rounded-lg"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(payment.pix_code)}
                className="border-white/20 hover:bg-white/10"
              >
                {copied ? <Check className="h-4 w-4" /> : <div className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {payment.expires_at && (
            <div className="text-center">
              <div className="text-sm text-yellow-400">
                ⏰ {CHECKOUT_MESSAGES.EXPIRES_IN} {new Date(payment.expires_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      )}

      {paymentStatus === 'expirado' && (
        <div className="text-center">
          <Button
            onClick={onGenerateNewPix}
            disabled={isGenerating}
            className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {CHECKOUT_MESSAGES.GENERATE_NEW_PIX}
          </Button>
        </div>
      )}

      {paymentStatus === 'pending' && (
        <div className="text-center">
          <div className="text-sm text-yellow-400">
            <Headphones className="h-4 w-4 inline mr-2" />
            {CHECKOUT_MESSAGES.PAYMENT_RECOVERED}
          </div>
        </div>
      )}
    </div>
  );
};
