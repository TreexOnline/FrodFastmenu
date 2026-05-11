import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PlanSelectionViewProps {
  onBack: () => void;
}

export const PlanSelectionView: React.FC<PlanSelectionViewProps> = ({ onBack }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-orange-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Selecione um Plano</h2>
          <p className="text-zinc-400">Escolha um plano para continuar com o checkout</p>
        </div>
      </div>
    </div>
  );
};
