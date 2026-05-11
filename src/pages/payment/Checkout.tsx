import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Hooks especializados
import { usePixPayment } from '@/features/payments/hooks/usePixPayment';
import { usePaymentPolling } from '@/features/payments/hooks/usePaymentPolling';
import { usePaymentCountdown } from '@/features/payments/hooks/usePaymentCountdown';
import { usePersistedPix } from '@/features/payments/hooks/usePersistedPix';
import { useCheckoutState } from '@/features/payments/hooks/useCheckoutState';
import { useCheckoutForm } from '@/features/payments/hooks/useCheckoutForm';
import { useCheckoutValidation } from '@/features/payments/hooks/useCheckoutValidation';
import { usePaymentProcessor } from '@/features/payments/hooks/usePaymentProcessor';

// Componentes reutilizáveis
import { PaymentMethodSelector } from '@/features/payments/components/PaymentMethodSelector';
import { CreditCardForm } from '@/features/payments/components/CreditCardForm';
import { CheckoutSummary } from '@/features/payments/components/CheckoutSummary';
import { CheckoutLayout } from '@/features/payments/components/CheckoutLayout';
import { PaymentSecurityInfo } from '@/features/payments/components/PaymentSecurityInfo';
import { SupportButton } from '@/features/payments/components/SupportButton';
import { PlanSelectionView } from '@/features/payments/components/PlanSelectionView';
import { PaymentActionButton } from '@/features/payments/components/PaymentActionButton';
import { PixPaymentDisplay } from '@/features/payments/components/PixPaymentDisplay';

// Serviços e tipos
import { useAuth } from '@/contexts/AuthContext';

// Constantes
import { CHECKOUT_MESSAGES } from '@/features/payments/constants/checkout.constants';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado do checkout
  const {
    selectedPlan,
    paymentMethod,
    loading,
    globalLoading,
    customerData: stateCustomerData,
    cardData: stateCardData,
    setPaymentMethod,
    setLoading,
    setGlobalLoading,
    initializePlan
  } = useCheckoutState();
  
  // Formulário
  const {
    customerData,
    setCustomerData,
    cardData,
    setCardData,
    handleCardNumberChange
  } = useCheckoutForm();
  
  // Validação
  const { validateForm } = useCheckoutValidation();
  
  // Hooks de pagamento
  const { payment: persistedPayment, qrCodeDataUrl: persistedQrCode, showPix, paymentStatus, setPaymentStatus, savePixPayment, clearPixPayment: clearPersistedPix } = usePersistedPix(selectedPlan, paymentMethod);
  const { isGenerating, payment, qrCodeDataUrl, generatePixPayment, clearPixPayment, canGeneratePix } = usePixPayment(selectedPlan, savePixPayment);
  const timeLeft = usePaymentCountdown(persistedPayment);
  
  // Processamento de pagamento
  const { handlePayment } = usePaymentProcessor(
    generatePixPayment,
    setPaymentStatus,
    setGlobalLoading
  );
  
  // Usar pagamento persistido se existir, senão usar o gerado
  const currentPayment = persistedPayment || payment;
  const currentQrCode = persistedQrCode || qrCodeDataUrl;

  // Polling de status
  usePaymentPolling({
    payment: currentPayment,
    paymentStatus,
    onStatusChange: setPaymentStatus,
    onConfirmed: () => {
      setTimeout(() => {
        navigate('/payment/success');
      }, 2000);
    },
    onExpired: () => {
      clearPersistedPix();
    },
    onFailed: () => {
      clearPersistedPix();
    }
  });
  
  // Inicializar plano da URL
  useEffect(() => {
    initializePlan();
  }, [initializePlan]);
  
  // Função principal de pagamento
  const handlePaymentSubmit = () => {
    if (!validateForm(selectedPlan, paymentMethod, customerData, cardData)) {
      return;
    }
    
    handlePayment(selectedPlan, paymentMethod, customerData, cardData);
  };
  
  // Gerar novo PIX
  const handleGenerateNewPix = () => {
    handlePayment(selectedPlan, paymentMethod, customerData, cardData);
  };
  
  // Se não há plano selecionado, mostrar view de seleção
  if (!selectedPlan) {
    return (
      <PlanSelectionView
        onBack={() => navigate('/dashboard/plano')}
      />
    );
  }
  
  const loadingMessage = isGenerating ? CHECKOUT_MESSAGES.GENERATING_PIX : CHECKOUT_MESSAGES.PROCESSING_PAYMENT;

  return (
    <CheckoutLayout
      globalLoading={globalLoading}
      loadingMessage={loadingMessage}
      onBack={() => navigate('/dashboard/plano')}
      title="Finalizar Assinatura"
      subtitle={`Assine o plano ${selectedPlan.name} e desbloqueie todos os recursos`}
    >
      <div className="grid lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-6">
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl lg:text-2xl">
                Forma de Pagamento
              </CardTitle>
            </CardHeader>

            <CardContent>
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
              />
            </CardContent>
          </Card>

          {paymentMethod === 'pix' && (
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl lg:text-2xl">
                  Pagamento via PIX
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="text-center mb-6">
                  <p className="text-zinc-400">
                    Gere seu QR Code e ative seu plano em segundos.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === 'credit_card' && (
            <CreditCardForm
              customerData={customerData}
              cardData={cardData}
              onCustomerDataChange={setCustomerData}
              onCardDataChange={setCardData}
            />
          )}

          <PaymentSecurityInfo />

          <PaymentActionButton
            loading={loading}
            isGenerating={isGenerating}
            canGenerate={canGeneratePix(paymentStatus)}
            paymentMethod={paymentMethod}
            onClick={handlePaymentSubmit}
          />

          <SupportButton />
        </div>

        <div className="space-y-6">
          <CheckoutSummary selectedPlan={selectedPlan} />

          {showPix && currentPayment && (
            <PixPaymentDisplay
              payment={currentPayment}
              qrCodeDataUrl={currentQrCode}
              paymentStatus={paymentStatus}
              timeLeft={timeLeft}
              onGenerateNewPix={handleGenerateNewPix}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>
    </CheckoutLayout>
  );
};

export default Checkout;
