import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreditCardFormProps {
  customerData: {
    name: string;
    document: string;
    email: string;
    phone: string;
  };
  cardData: {
    number: string;
    cvv: string;
    month: string;
    year: string;
    firstName: string;
    lastName: string;
  };
  onCustomerDataChange: (data: any) => void;
  onCardDataChange: (data: any) => void;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({
  customerData,
  cardData,
  onCustomerDataChange,
  onCardDataChange
}) => {
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    onCardDataChange({ ...cardData, number: formatted });
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          type="text"
          placeholder="João Silva"
          value={customerData.name}
          onChange={(e) => onCustomerDataChange({ ...customerData, name: e.target.value })}
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
        />
      </div>

      <div>
        <Label htmlFor="document">CPF/CNPJ</Label>
        <Input
          id="document"
          type="text"
          placeholder="000.000.000-00"
          value={customerData.document}
          onChange={(e) => onCustomerDataChange({ ...customerData, document: e.target.value })}
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="joao.silva@email.com"
          value={customerData.email}
          onChange={(e) => onCustomerDataChange({ ...customerData, email: e.target.value })}
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefone (Opcional)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(11) 98765-4321"
          value={customerData.phone}
          onChange={(e) => onCustomerDataChange({ ...customerData, phone: e.target.value })}
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cardNumber">Número do Cartão</Label>
          <Input
            id="cardNumber"
            type="text"
            placeholder="0000 0000 0000 0000"
            value={cardData.number}
            onChange={handleCardNumberChange}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>
        <div>
          <Label htmlFor="cvv">CVV</Label>
          <Input
            id="cvv"
            type="text"
            placeholder="123"
            value={cardData.cvv}
            onChange={(e) => onCardDataChange({ ...cardData, cvv: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="month">Mês</Label>
          <Input
            id="month"
            type="text"
            placeholder="12"
            value={cardData.month}
            onChange={(e) => onCardDataChange({ ...cardData, month: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input
            id="year"
            type="text"
            placeholder="2025"
            value={cardData.year}
            onChange={(e) => onCardDataChange({ ...cardData, year: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>
      </div>
    </div>
  );
};
