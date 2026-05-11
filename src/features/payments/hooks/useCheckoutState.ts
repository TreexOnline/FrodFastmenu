import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plan, PLANS } from '@/services/paymentService';
import { CheckoutState } from '../types/checkout.types';
import { CheckoutPersistence } from '@/services/paymentService';

export const useCheckoutState = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [state, setState] = useState<CheckoutState>({
    selectedPlan: null,
    paymentMethod: 'pix',
    loading: false,
    globalLoading: false,
    customerData: {
      name: '',
      document: '',
      email: '',
      phone: ''
    },
    cardData: {
      number: '',
      cvv: '',
      month: '',
      year: '',
      firstName: '',
      lastName: ''
    }
  });

  const setSelectedPlan = useCallback((plan: Plan | null) => {
    setState(prev => ({ ...prev, selectedPlan: plan }));
    
    if (plan) {
      CheckoutPersistence.save({
        selectedPlan: plan.id,
        currentStep: 'payment_method'
      });
    }
  }, []);

  const setPaymentMethod = useCallback((method: 'pix' | 'credit_card') => {
    setState(prev => ({ ...prev, paymentMethod: method }));
    
    CheckoutPersistence.save({
      paymentMethod: method,
      currentStep: 'payment_form'
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setGlobalLoading = useCallback((globalLoading: boolean) => {
    setState(prev => ({ ...prev, globalLoading }));
  }, []);

  const handlePlanSelect = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    const params = new URLSearchParams();
    params.set('plan', plan.id);
    navigate(`/checkout?${params.toString()}`, { replace: true });
  }, [setSelectedPlan, navigate]);

  // Verificar se veio de um plano específico
  const initializePlan = useCallback(() => {
    const planId = searchParams.get('plan');
    if (planId) {
      const plan = PLANS.find(p => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [searchParams, setSelectedPlan]);

  return {
    ...state,
    setSelectedPlan,
    setPaymentMethod,
    setLoading,
    setGlobalLoading,
    handlePlanSelect,
    initializePlan
  };
};
