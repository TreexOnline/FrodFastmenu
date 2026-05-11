import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLANS, Plan } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';

interface PlanSelectionProps {
  onPlanSelect: (plan: Plan) => void;
}

export const PlanSelection: React.FC<PlanSelectionProps> = ({ onPlanSelect }) => {
  const { user } = useAuth();
  const { isTrial, trialDaysLeft, planType, planActive } = useAccess();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'monthly':
        return <Zap className="h-6 w-6 text-blue-600" />;
      case 'combo':
        return <Star className="h-6 w-6 text-purple-600" />;
      case 'annual':
        return <Crown className="h-6 w-6 text-yellow-600" />;
      default:
        return <Zap className="h-6 w-6 text-gray-600" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'monthly':
        return 'border-blue-200 bg-blue-50 hover:border-blue-400';
      case 'combo':
        return 'border-purple-200 bg-purple-50 hover:border-purple-400';
      case 'annual':
        return 'border-yellow-200 bg-yellow-50 hover:border-yellow-400';
      default:
        return 'border-gray-200 bg-gray-50 hover:border-gray-400';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100);
  };

  const getMonthlyPrice = (plan: Plan) => {
    if (plan.duration === 'annual') {
      return formatPrice(plan.price / 12);
    } else if (plan.duration === 'trimester') {
      return formatPrice(plan.price / 3);
    }
    return formatPrice(plan.price);
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan.id);
    onPlanSelect(plan);
  };

  const isCurrentPlan = (planId: string) => {
    return planActive && planType === planId;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Escolha seu plano ideal
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {isTrial && trialDaysLeft > 0 ? (
            <>
              Seu trial gratuito termina em <span className="font-semibold text-orange-600">{trialDaysLeft} dias</span>.
              Escolha um plano para continuar usando todas as funcionalidades.
            </>
          ) : planActive ? (
            <>
              Você está usando o <span className="font-semibold text-green-600">
                {planType === 'monthly' ? 'Plano Mensal' : 
                 planType === 'combo' ? 'Plano Combo' : 'Plano Anual'}
              </span>.
            </>
          ) : (
            <>
              Desbloqueie recursos poderosos para gerenciar seu cardápio digital
            </>
          )}
        </p>
      </div>

      {/* Planos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative transition-all duration-300 cursor-pointer transform hover:scale-105 ${
              selectedPlan === plan.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
            } ${getPlanColor(plan.id)} ${plan.popular ? 'scale-105' : ''}`}
            onClick={() => handlePlanSelect(plan)}
          >
            {/* Badge Popular */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                  Mais Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                {getPlanIcon(plan.id)}
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {plan.name}
              </CardTitle>
              
              {/* Preço */}
              <div className="mt-4">
                <div className="text-4xl font-bold text-gray-900">
                  {formatPrice(plan.price)}
                </div>
                {plan.duration === 'annual' && (
                  <div className="text-sm text-gray-600 mt-1">
                    {getMonthlyPrice(plan)}/mês (12x)
                  </div>
                )}
                {plan.duration === 'trimester' && (
                  <div className="text-sm text-gray-600 mt-1">
                    {getMonthlyPrice(plan)}/mês (3x)
                  </div>
                )}
                {plan.duration === 'monthly' && (
                  <div className="text-sm text-gray-600 mt-1">
                    por mês
                  </div>
                )}
              </div>

              {/* Badge de plano atual */}
              {isCurrentPlan(plan.id) && (
                <Badge className="bg-green-100 text-green-800 mt-3">
                  Plano Atual
                </Badge>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              {/* Features */}
              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                className={`w-full py-3 text-lg font-semibold transition-all duration-200 ${
                  selectedPlan === plan.id
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
                disabled={isCurrentPlan(plan.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect(plan);
                }}
              >
                {isCurrentPlan(plan.id)
                  ? 'Plano Atual'
                  : selectedPlan === plan.id
                  ? 'Continuar →'
                  : 'Escolher Plano'
                }
              </Button>

              {/* Economia para plano anual */}
              {plan.id === 'annual' && (
                <div className="mt-4 text-center">
                  <div className="text-sm text-green-600 font-semibold">
                    Economize 2 meses!
                  </div>
                  <div className="text-xs text-gray-600">
                    Pague 10 e use por 12 meses
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trial Info */}
      {isTrial && trialDaysLeft > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            ⏰ Seu período de teste está acabando!
          </h3>
          <p className="text-orange-700">
            Restam apenas <span className="font-bold">{trialDaysLeft} dias</span> de trial gratuito.
            Escolha um plano agora para não perder acesso ao seu cardápio.
          </p>
        </div>
      )}

      {/* Segurança */}
      <div className="mt-12 text-center">
        <div className="flex justify-center items-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Pagamento Seguro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Cancelamento a qualquer momento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Suporte 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
};
