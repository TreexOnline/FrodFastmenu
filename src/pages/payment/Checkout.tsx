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
import { paymentService, PaymentRequest, PaymentResponse, Plan } from '@/services/paymentService';
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
    if (planId) {
      const plans = paymentService['PLANS'] as Plan[];
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
      }
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Shield className="h-4 w-4" />
            Pagamento Seguro
          </div>
        </div>

        {/* Resumo do Plano */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Resumo do Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
                <p className="text-gray-600">
                  {selectedPlan.duration === 'monthly' ? 'Cobrança mensal' : 'Cobrança anual'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {formatPrice(selectedPlan.price)}
                </div>
                {selectedPlan.duration === 'annual' && (
                  <div className="text-sm text-gray-600">
                    {formatPrice(selectedPlan.price / 12)}/mês
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PIX Payment */}
        {payment && paymentMethod === 'pix' && showPix && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <QrCode className="h-5 w-5" />
                Pague com PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  {payment.qr_code && (
                    <img
                      src={`data:image/png;base64,${payment.qr_code}`}
                      alt="QR Code PIX"
                      className="w-64 h-64"
                    />
                  )}
                </div>
              </div>

              {/* Código Copia e Cola */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Código PIX (Copia e Cola)
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={payment.pix_code || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(payment.pix_code || '')}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Informações */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="space-y-1">
                      <li>• O pagamento será confirmado em poucos minutos</li>
                      <li>• Seu plano será ativado automaticamente</li>
                      <li>• Você receberá um e-mail de confirmação</li>
                      <li>• O código expira em {new Date(payment.expires_at || '').toLocaleString('pt-BR')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-yellow-700 font-medium">
                  Aguardando pagamento...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Método de Pagamento */}
        {!payment && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value: 'pix' | 'credit_card') => setPaymentMethod(value)}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer">
                    <QrCode className="h-5 w-5" />
                    PIX
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label htmlFor="credit_card" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="h-5 w-5" />
                    Cartão de Crédito
                  </Label>
                </div>
              </RadioGroup>

              <Separator className="my-6" />

              {/* PIX Form */}
              {paymentMethod === 'pix' && (
                <div className="text-center py-8">
                  <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">
                    Após confirmar, geraremos um código PIX para pagamento.
                  </p>
                  <p className="text-sm text-gray-500">
                    O pagamento é confirmado em poucos minutos e seu plano é ativado automaticamente.
                  </p>
                </div>
              )}

              {/* Credit Card Form */}
              {paymentMethod === 'credit_card' && (
                <div className="space-y-6">
                  {/* Dados do Cliente */}
                  <div>
                    <h4 className="font-semibold mb-4">Dados do Titular</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={customerData.name}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="João da Silva"
                        />
                      </div>
                      <div>
                        <Label htmlFor="document">CPF *</Label>
                        <Input
                          id="document"
                          value={customerData.document}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, document: e.target.value.replace(/\D/g, '') }))}
                          placeholder="000.000.000-00"
                          maxLength={11}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerData.email}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="joao@email.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 99999-8888"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Cartão */}
                  <div>
                    <h4 className="font-semibold mb-4">Dados do Cartão</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Número do Cartão *</Label>
                        <Input
                          id="cardNumber"
                          value={cardData.number}
                          onChange={handleCardNumberChange}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="month">Mês *</Label>
                          <Input
                            id="month"
                            value={cardData.month}
                            onChange={(e) => setCardData(prev => ({ ...prev, month: e.target.value }))}
                            placeholder="12"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="year">Ano *</Label>
                          <Input
                            id="year"
                            value={cardData.year}
                            onChange={(e) => setCardData(prev => ({ ...prev, year: e.target.value }))}
                            placeholder="2028"
                            maxLength={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV *</Label>
                          <Input
                            id="cvv"
                            value={cardData.cvv}
                            onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-semibold mb-1">Pagamento 100% Seguro:</p>
                        <ul className="space-y-1">
                          <li>• Criptografia SSL de ponta a ponta</li>
                          <li>• Dados nunca armazenados</li>
                          <li>• Conformidade com PCI DSS</li>
                          <li>• Anti-fraude avançado</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action */}
        {!payment && (
          <div className="text-center space-y-4">
            <Button
              size="lg"
              onClick={handlePayment}
              disabled={loading}
              className="px-12 py-3 text-lg w-full sm:w-auto"
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
                  Pagar com Cartão
                </>
              )}
            </Button>

            {/* Botão de Suporte */}
            <Button
              variant="outline"
              onClick={() => window.open(`https://wa.me/5518991913165?text=${encodeURIComponent('Olá! Estou com problemas para finalizar meu pagamento no FrodFast. Podem me ajudar?')}`, '_blank')}
              className="w-full sm:w-auto text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              COM PROBLEMAS? FALE COM UM ATENDENTE
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
