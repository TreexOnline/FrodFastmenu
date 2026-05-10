import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, QrCode, Shield, Check, AlertCircle, Loader2, Headphones, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { paymentService, PaymentRequest, PaymentResponse, Plan, PLANS } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';
import { PlanSelection } from '@/components/payment/PlanSelection';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [showPix, setShowPix] = useState(false);
  
  // Form data
  const [cardData, setCardData] = useState({
    number: '',
    cvv: '',
    month: '',
    year: '',
    firstName: '',
    lastName: ''
  });
  
  const [customerData, setCustomerData] = useState({
    name: user?.user_metadata?.full_name || '',
    document: '',
    email: user?.email || '',
    phone: ''
  });

  // Verificar se veio de um plano específico
  useEffect(() => {
    const planId = searchParams.get('plan');
    
    if (!planId) return;
    if (!PLANS || !Array.isArray(PLANS)) {
      console.error('PLANS not available');
      return;
    }
    
    const plan = PLANS.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
    } else {
      console.warn(`Plan "${planId}" not found`);
    }
  }, [searchParams]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ');
    return formatted.trim();
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData(prev => ({ ...prev, number: formatted }));
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    // Update URL
    const params = new URLSearchParams();
    params.set('plan', plan.id);
    navigate(`/checkout?${params.toString()}`, { replace: true });
  };

  const validateForm = (): boolean => {
    if (!selectedPlan) {
      toast.error('Selecione um plano');
      return false;
    }

    if (paymentMethod === 'credit_card') {
      // Validar cartão
      const cardValidation = paymentService.validateCard(cardData);
      if (!cardValidation.isValid) {
        toast.error('Cartão inválido: ' + cardValidation.errors.join(', '));
        return false;
      }

      // Validar CPF
      const cpfValidation = paymentService.validateCPF(customerData.document);
      if (!cpfValidation.isValid) {
        toast.error('CPF inválido: ' + cpfValidation.errors.join(', '));
        return false;
      }

      // Validar dados do cliente
      if (!customerData.name.trim()) {
        toast.error('Informe o nome completo');
        return false;
      }

      if (!customerData.email.trim()) {
        toast.error('Informe o e-mail');
        return false;
      }
    }

    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      let paymentResponse: PaymentResponse;

      if (paymentMethod === 'pix') {
        // Criar pagamento PIX
        paymentResponse = await paymentService.createPixPayment(
          selectedPlan.price,
          `Plano ${selectedPlan.name} - ${user?.email}`,
          user?.email || '',
          {
            user_id: user?.id,
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name
          }
        );
      } else {
        // Criar pagamento com cartão
        paymentResponse = await paymentService.createCreditCardPayment(
          selectedPlan.price,
          `Plano ${selectedPlan.name} - ${user?.email}`,
          {
            name: customerData.name,
            document: customerData.document,
            email: customerData.email,
            phone: customerData.phone
          },
          {
            number: cardData.number.replace(/\s/g, ''),
            cvv: cardData.cvv,
            month: cardData.month,
            year: cardData.year,
            firstName: cardData.firstName,
            lastName: cardData.lastName
          },
          1, // À vista para planos
          {
            user_id: user?.id,
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name
          }
        );
      }

      // Salvar pedido no banco
      await paymentService.savePaymentOrder(
        user?.id || '',
        selectedPlan.id,
        paymentResponse.id,
        selectedPlan.price,
        paymentResponse.status
      );

      setPayment(paymentResponse);

      if (paymentMethod === 'pix') {
        setShowPix(true);
        toast.success('Código PIX gerado! Pague para ativar seu plano.');
      } else {
        if (paymentResponse.status === 'paid') {
          toast.success('Pagamento aprovado! Seu plano já está ativo.');
          setTimeout(() => navigate('/dashboard'), 3000);
        } else {
          toast.error('Pagamento recusado. Tente outro cartão.');
        }
      }

    } catch (error: any) {
      console.error('Erro no pagamento:', error);
      toast.error(error.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Código copiado!');
    } catch (error) {
      toast.error('Erro ao copiar código');
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <PlanSelection onPlanSelect={handlePlanSelect} />
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen relative overflow-hidden bg-[#050505] text-white">
    
    {/* Background */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-purple-700/20 blur-3xl rounded-full animate-pulse" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-orange-500/10 blur-3xl rounded-full animate-pulse" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
    </div>

    <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="text-zinc-300 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/20 bg-green-500/10 text-green-400 text-sm">
          <Shield className="h-4 w-4" />
          Pagamento Seguro
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-8">

        {/* LEFT */}
        <div className="space-y-6">

          {/* Método pagamento */}
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-3xl">
            <CardHeader>
              <CardTitle className="text-2xl">
                Forma de Pagamento
              </CardTitle>
            </CardHeader>

            <CardContent>

              <RadioGroup
                value={paymentMethod}
                onValueChange={(value: 'pix' | 'credit_card') =>
                  setPaymentMethod(value)
                }
                className="grid md:grid-cols-2 gap-4"
              >

                <label
                  htmlFor="pix"
                  className={`border rounded-2xl p-5 cursor-pointer transition-all ${
                    paymentMethod === 'pix'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="pix" id="pix" />
                    <QrCode className="h-5 w-5 text-purple-400" />
                    <span className="font-medium">PIX</span>
                  </div>

                  <p className="text-sm text-zinc-400 mt-3">
                    Aprovação instantânea
                  </p>
                </label>

                <label
                  htmlFor="credit_card"
                  className={`border rounded-2xl p-5 cursor-pointer transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="credit_card"
                      id="credit_card"
                    />
                    <CreditCard className="h-5 w-5 text-orange-400" />
                    <span className="font-medium">
                      Cartão de Crédito
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mt-3">
                    Parcelamento disponível
                  </p>
                </label>

              </RadioGroup>

              {/* PIX */}
              {paymentMethod === 'pix' && (
                <div className="mt-8 border border-white/10 rounded-3xl p-10 bg-black/30 text-center">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                    <QrCode className="h-10 w-10 text-purple-400" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    Pagamento via PIX
                  </h3>

                  <p className="text-zinc-400">
                    Gere seu QR Code e ative seu plano em segundos.
                  </p>
                </div>
              )}

            </CardContent>
          </Card>

        </div>

        {/* RIGHT */}
        <div>

          <Card className="sticky top-10 bg-gradient-to-b from-purple-600/20 to-black border border-purple-500/20 backdrop-blur-xl rounded-3xl overflow-hidden">

            <CardContent className="p-8">

              <div className="mb-8">
                <span className="text-sm text-purple-300 uppercase tracking-widest">
                  Plano Selecionado
                </span>

                <h2 className="text-3xl font-bold mt-3">
                  {selectedPlan.name}
                </h2>

                <p className="text-zinc-400 mt-2">
                  {selectedPlan.duration === 'monthly'
                    ? 'Cobrança mensal'
                    : 'Cobrança anual'}
                </p>
              </div>

              <div className="py-8 border-y border-white/10">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white">
                    {formatPrice(selectedPlan.price)}
                  </span>
                </div>

                {selectedPlan.duration === 'annual' && (
                  <p className="text-zinc-400 mt-2">
                    equivalente a{' '}
                    {formatPrice(selectedPlan.price / 12)}
                    /mês
                  </p>
                )}
              </div>

              <div className="space-y-4 py-8">

                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Ativação imediata</span>
                </div>

                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Suporte prioritário</span>
                </div>

                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Cancelamento quando quiser</span>
                </div>

              </div>

              <Button
                size="lg"
                onClick={handlePayment}
                disabled={loading}
                className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-90 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : paymentMethod === 'pix' ? (
                  <>
                    <QrCode className="h-5 w-5 mr-2" />
                    Gerar PIX
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Finalizar Pagamento
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full mt-4 border-orange-500/20 text-orange-400 hover:bg-orange-500/10 rounded-2xl"
                onClick={() =>
                  window.open(
                    `https://wa.me/5518991913165`,
                    '_blank'
                  )
                }
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar com suporte
              </Button>

            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  </div>
);
};

export default Checkout;
