import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  disableOnLoading?: boolean;
  showSpinner?: boolean;
  spinnerSize?: 'sm' | 'md' | 'lg';
  successText?: string;
  errorText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'cta';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xl';
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText = 'Processando...',
      disableOnLoading = true,
      showSpinner = true,
      spinnerSize = 'sm',
      disabled,
      className,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    const spinnerSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };

    const isDisabled = disabled || (loading && disableOnLoading);

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={cn(
          'relative transition-all duration-200',
          loading && disableOnLoading && 'opacity-80 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            {showSpinner && (
              <Loader2 
                className={cn(
                  'animate-spin',
                  spinnerSizes[spinnerSize]
                )} 
              />
            )}
          </div>
        )}
        
        <span className={cn(
          loading && showSpinner && 'opacity-0',
          'flex items-center gap-2 transition-opacity duration-200'
        )}>
          {loading && !showSpinner && (
            <Loader2 
              className={cn(
                'animate-spin',
                spinnerSizes[spinnerSize]
              )} 
            />
          )}
          {loading ? loadingText : children}
        </span>
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

export { LoadingButton };
