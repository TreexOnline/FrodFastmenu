import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentFailed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paymentId = searchParams.get('payment_id');
  const planId = searchParams.get('plan');
  const errorCode = searchParams.get('error');

  const getPlanName = (planId: string | null) => {
    switch (planId) {
      case 'monthly':
        return 'Plano Mensal';
      case 'combo':
        return 'Plano Combo';
      case 'annual':
        return 'Plano Anual';
      default:
        return 'Plano Selecionado';
    }
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'card_declined':
        return 'Seu cartão foi recusado pela operadora. Verifique os dados ou tente outro cartão.';
      case 'insufficient_funds':
        return 'Saldo insuficiente no cartão. Tente outro método de pagamento.';
      case 'invalid_cvv':
        return 'CVV inválido. Verifique o código de segurança do seu cartão.';
      case 'expired_card':
        return 'Cartão expirado. Use um cartão válido ou tente outro método.';
      case 'fraud_detected':
        return 'Pagamento bloqueado por segurança. Entre em contato com seu banco.';
      default:
        return 'Ocorreu um erro ao processar seu pagamento. Tente novamente.';
    }
  };

  const handleRetry = () => {
    const params = new URLSearchParams();
    if (planId) params.set('plan', planId);
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-800">
              Pagamento Falhou
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {/* Mensagem de Erro */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Ops! Algo deu errado
              </h3>
              <p className="text-gray-600">
                Não foi possível concluir o pagamento do {getPlanName(planId)}.
              </p>
              {paymentId && (
                <p className="text-sm text-gray-500">
                  ID da transação: {paymentId}
                </p>
              )}
            </div>

            {/* Detalhes do Erro */}
            <div className="bg-white rounded-lg p-4 text-left">
              <h4 className="font-semibold text-gray-900 mb-2">
                O que aconteceu?
              </h4>
              <p className="text-red-600 text-sm">
                {getErrorMessage(errorCode)}
              </p>
            </div>

            {/* Soluções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
              <h4 className="font-semibold text-blue-900 mb-3">
                💡 O que você pode fazer:
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Tente novamente com o mesmo cartão</span>
                </li>
                <li className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Use outro cartão de crédito ou débito</span>
                </li>
                <li className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Escolha pagar com PIX (instantâneo e sem taxa)</span>
                </li>
                <li className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Verifique os dados do cartão (número, CVV, validade)</span>
                </li>
              </ul>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleRetry}
                className="flex-1"
                size="lg"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Tentar Novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
                size="lg"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar ao Dashboard
              </Button>
            </div>

            {/* Ajuda */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">
                🆘 Precisa de ajuda?
              </h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <p>
                  Se o problema persistir, entre em contato com nosso suporte:
                </p>
                <div className="space-y-1">
                  <p>📧 E-mail: <a href="mailto:suporte@frodfast.com" className="text-blue-600 hover:underline">suporte@frodfast.com</a></p>
                  <p>💬 WhatsApp: <a href="https://wa.me/5511999998888" className="text-blue-600 hover:underline">(11) 99999-8888</a></p>
                  <p>🕐 Horário: Seg-Sex, 9h-18h</p>
                </div>
                {paymentId && (
                  <p className="text-xs mt-2">
                    Tenha em mãos o ID da transação: <strong>{paymentId}</strong>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentFailed;
