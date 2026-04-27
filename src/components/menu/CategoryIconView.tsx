import { cn } from "@/lib/utils";
import { getCategoryIconData } from "@/lib/categoryIcons";

interface Props {
  iconKey?: string | null;
  /** Tamanho em pixels (lado quadrado) */
  size?: number;
  className?: string;
  /** Quando true, força uso do Lucide (sem PNG). Útil para contextos monocromáticos. */
  forceLucide?: boolean;
}

/**
 * Renderiza o ícone de categoria. Usa o PNG personalizado quando disponível,
 * senão cai para o ícone Lucide.
 */
export const CategoryIconView = ({
  iconKey,
  size = 28,
  className,
  forceLucide = false,
}: Props) => {
  const data = getCategoryIconData(iconKey);

  if (data.image && !forceLucide) {
    return (
      <img
        src={data.image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className={cn("object-contain select-none", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const Icon = data.Icon;
  return <Icon className={className} style={{ width: size, height: size }} />;
};
