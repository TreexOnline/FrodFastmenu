import React from 'react';
import { Shield, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const PaymentSecurityInfo: React.FC = () => {
  return (
    <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl lg:text-2xl">
          <Shield className="h-5 w-5 mr-2" />
          Pagamento Seguro
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Criptografia SSL de ponta a ponta</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Dados protegidos por lei</span>
        </div>
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400" />
          <span>Cancelamento quando quiser</span>
        </div>
      </CardContent>
    </Card>
  );
};
