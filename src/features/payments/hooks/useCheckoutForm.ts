import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerData, CardData, CheckoutFormErrors } from '../types/checkout.types';

export const useCheckoutForm = () => {
  const { user } = useAuth();
  
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: user?.user_metadata?.full_name || '',
    document: '',
    email: user?.email || '',
    phone: ''
  });
  
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    cvv: '',
    month: '',
    year: '',
    firstName: '',
    lastName: ''
  });

  const formatCardNumber = useCallback((value: string) => {
    return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  }, []);

  const handleCardNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData(prev => ({ ...prev, number: formatted }));
  }, [formatCardNumber]);

  return {
    customerData,
    setCustomerData,
    cardData,
    setCardData,
    handleCardNumberChange
  };
};
