import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CheckoutLayoutProps {
  children: React.ReactNode;
  globalLoading: boolean;
  loadingMessage: string;
  onBack: () => void;
  title?: string;
  subtitle?: string;
}

export const CheckoutLayout: React.FC<CheckoutLayoutProps> = ({
  children,
  globalLoading,
  loadingMessage,
  onBack,
  title,
  subtitle
}) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505] text-white">
      {globalLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-white font-medium">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-purple-700/20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-orange-500/10 blur-3xl rounded-full animate-pulse" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {(title || subtitle) && (
            <div className="text-center mb-8">
              {title && (
                <h1 className="text-3xl lg:text-4xl font-bold mb-4">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-zinc-400">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
