import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo-frodfast.png";

// DEBUG: Monitorar import do logo
console.log('🔍 Logo Debug - Import do logo:', {
  logoImg: logoImg,
  logoImgType: typeof logoImg,
  logoImgString: String(logoImg),
  timestamp: new Date().toISOString()
});

interface Props {
  className?: string;
  /** Tailwind height class for image (e.g., "h-12") */
  imgClassName?: string;
}

export const Logo = ({ className, imgClassName = "h-20" }: Props) => {
  // DEBUG: Verificar se logo foi carregado
  const [logoError, setLogoError] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const handleLogoLoad = () => {
    console.log('✅ Logo Debug - Logo carregado com sucesso');
    setLogoLoaded(true);
    setLogoError(false);
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('❌ Logo Debug - Erro ao carregar logo:', {
      error: e,
      src: e.currentTarget.src,
      naturalWidth: e.currentTarget.naturalWidth,
      naturalHeight: e.currentTarget.naturalHeight,
      complete: e.currentTarget.complete
    });
    setLogoError(true);
    setLogoLoaded(false);
  };

  // DEBUG: Log quando componente renderiza
  console.log('🎯 Logo Debug - Componente renderizando:', {
    logoImg,
    logoError,
    logoLoaded,
    timestamp: new Date().toISOString()
  });

  return (
    <Link
      to="/"
      className={cn("inline-flex items-center", className)}
      aria-label="FrodFast"
    >
      <img
        src={logoImg}
        alt="FrodFast"
        className={cn("w-auto select-none", imgClassName)}
        loading="eager"
        draggable={false}
        onLoad={handleLogoLoad}
        onError={handleLogoError}
        style={{
          border: logoError ? '2px solid red' : 'none',
          background: logoError ? '#fee' : 'transparent'
        }}
      />
      {logoError && (
        <span style={{ color: 'red', fontSize: '12px', marginLeft: '8px' }}>
          ERRO LOGO
        </span>
      )}
    </Link>
  );
};
