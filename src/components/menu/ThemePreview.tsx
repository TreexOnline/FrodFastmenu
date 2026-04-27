import { MenuTheme } from "@/lib/menuThemes";
import { Plus, Utensils } from "lucide-react";

/**
 * Preview fiel do cardápio público em escala reduzida.
 * Reproduz: banner de capa, chip de categoria, dois cards horizontais
 * (texto + preço + botão "Adicionar" + foto quadrada à direita) e o
 * carrinho flutuante. As cores vêm do tema.
 */
const sample = [
  { name: "X-Burguer Especial", price: "28,00", desc: "Pão brioche, blend 180g, cheddar." },
  { name: "Batata Rústica", price: "18,00", desc: "Porção generosa, alecrim e sal grosso." },
];

export const ThemePreview = ({ theme }: { theme: MenuTheme }) => {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Banner de capa */}
      <div
        className="h-8 w-full"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)`,
        }}
      />

      {/* Chip de categoria */}
      <div className="flex items-center gap-1.5 px-2 pt-2">
        <div
          className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px]"
          style={{ background: theme.accent, color: theme.accentText }}
        >
          <Utensils className="h-2 w-2" strokeWidth={2.5} />
        </div>
        <span
          className="text-[7px] font-extrabold uppercase tracking-wider"
          style={{ color: theme.text }}
        >
          Lanches
        </span>
        <div
          className="h-px flex-1"
          style={{
            background: `linear-gradient(to right, ${theme.accent}80, transparent)`,
          }}
        />
      </div>

      {/* Cards de produto */}
      <div className="space-y-1.5 px-2 pt-1.5 pb-7">
        {sample.map((p) => (
          <div
            key={p.name}
            className="flex items-stretch gap-1.5 overflow-hidden p-1.5 shadow-sm"
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: `calc(${theme.radius} * 0.55)`,
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                className="truncate text-[8px] font-semibold leading-tight"
                style={{ color: theme.text }}
              >
                {p.name}
              </div>
              <div
                className="line-clamp-1 text-[6.5px] leading-tight"
                style={{ color: theme.muted }}
              >
                {p.desc}
              </div>
              <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                <span
                  className="text-[8px] font-bold leading-none"
                  style={{ color: theme.accent }}
                >
                  R$ {p.price}
                </span>
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-[2px] text-[6px] font-bold leading-none"
                  style={{
                    background: theme.accent,
                    color: theme.accentText,
                  }}
                >
                  <Plus className="h-1.5 w-1.5" strokeWidth={3} />
                  Add
                </span>
              </div>
            </div>
            {/* Foto quadrada */}
            <div
              className="aspect-square h-9 w-9 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accent}11)`,
                borderRadius: `calc(${theme.radius} * 0.45)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Carrinho flutuante */}
      <div
        className="absolute bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full shadow-md"
        style={{
          background: theme.accent,
          color: theme.accentText,
          boxShadow: `0 4px 10px -3px ${theme.accent}aa`,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-2.5 w-2.5"
        >
          <path d="M5 11h14l-1.68 8.39A2 2 0 0 1 15.36 21H8.64a2 2 0 0 1-1.96-1.61L5 11Z" />
          <path d="M9 11V7a3 3 0 0 1 6 0v4" />
        </svg>
      </div>
    </div>
  );
};
