import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORT_WHATSAPP } from '../constants/checkout.constants';

export const SupportButton: React.FC = () => {
  return (
    <div className="text-center mt-6">
      <Button
        variant="outline"
        onClick={() => window.open(SUPPORT_WHATSAPP.URL, '_blank')}
        className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        COM PROBLEMAS? FALE COM UM ATENDENTE
      </Button>
    </div>
  );
};
