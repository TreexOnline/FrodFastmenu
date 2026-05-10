import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/paymentService';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');
  const planId = searchParams.get('plan');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentId || !user) {
        navigate('/dashboard');
        return;
      }

      try {
        const paymentData = await paymentService.getPaymentStatus(paymentId);
        setPayment(paymentData);

        // Se o pagamento não foi confirmado, verificar novamente após alguns segundos
        if (paymentData.status === 'pending') {
          setTimeout(() => {
            checkPaymentStatus();
          }, 5000);
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [paymentId, user, navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando status do pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Pagamento Confirmado!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {/* Mensagem de Sucesso */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Parabéns, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
              </h3>
              <p className="text-gray-600">
                Seu {getPlanName(planId)} foi ativado com sucesso.
              </p>
              {payment && (
                <div className="bg-white rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-600">Valor pago:</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(payment.amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID da transação: {payment.id}
                  </p>
                </div>
              )}
            </div>

            {/* Próximos Passos */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
              <h4 className="font-semibold text-blue-900 mb-3">
                🎉 O que acontece agora?
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Seu plano já está ativo e você pode usar todas as funcionalidades</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Você recebeu um e-mail de confirmação com os detalhes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Seus limites de cardápios foram atualizados automaticamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>A próxima cobrança será feita automaticamente</span>
                </li>
              </ul>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/dashboard')}
                className="flex-1"
                size="lg"
              >
                <Home className="h-5 w-5 mr-2" />
                Ir para o Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/menus')}
                className="flex-1"
                size="lg"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Gerenciar Cardápios
              </Button>
            </div>

            {/* Suporte */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Precisa de ajuda?{' '}
                <a href="mailto:suporte@frodfast.com" className="text-blue-600 hover:underline">
                  Entre em contato com nosso suporte
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
