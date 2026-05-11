import React from 'react';
import { Check, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: string;
  timeLeft?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, timeLeft }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'gerando':
        return {
          className: 'bg-blue-500/20 text-blue-400 animate-pulse',
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Gerando'
        };
      case 'confirmado':
        return {
          className: 'bg-green-500/20 text-green-400',
          icon: <Check className="h-3 w-3" />,
          text: 'Confirmado'
        };
      case 'expirado':
        return {
          className: 'bg-red-500/20 text-red-400',
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Expirado'
        };
      case 'erro':
        return {
          className: 'bg-red-500/20 text-red-400',
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Erro'
        };
      default:
        return {
          className: 'bg-yellow-500/20 text-yellow-400',
          icon: <Clock className="h-3 w-3" />,
          text: 'Aguardando'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
      <h3 className="text-lg lg:text-xl font-semibold text-green-400">
        {status === 'expirado' ? 'PIX Expirado' : 'QR Code Gerado'}
      </h3>
      <div className="flex flex-col lg:flex-row items-center gap-3">
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${config.className}`}>
          {config.icon}
          <span className="text-xs">{config.text}</span>
        </div>
        {timeLeft && (
          <div className="px-3 py-1 rounded-full bg-black/30 text-white text-xs font-mono flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {timeLeft}
          </div>
        )}
      </div>
    </div>
  );
};
