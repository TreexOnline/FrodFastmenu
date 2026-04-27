// Temas prontos para o cardápio público.
// Cada tema define apenas cores e raio dos cards.
// O LAYOUT é o mesmo em todos (lista de cards horizontais, igual ao cardápio público real).

export type MenuThemeId =
  | "modern"
  | "dark"
  | "clean"
  | "ocean"
  | "forest"
  | "rose"
  | "midnight"
  | "sand";

export interface MenuTheme {
  id: MenuThemeId;
  name: string;
  tagline: string;
  // cores
  bg: string; // fundo da página
  surface: string; // fundo dos cards
  text: string; // texto principal
  muted: string; // texto secundário
  accent: string; // cor de destaque / botões / preço
  accentText: string; // texto sobre o accent
  border: string;
  // formato
  radius: string; // border-radius dos cards (ex: "1rem")
  fontFamily: string;
  /** mantido por compat — não muda mais o layout */
  layout?: "grid" | "list" | "featured";
}

export const MENU_THEMES: Record<MenuThemeId, MenuTheme> = {
  modern: {
    id: "modern",
    name: "Moderno Roxo",
    tagline: "Identidade vibrante e limpa.",
    bg: "#FFF6ED",
    surface: "#FFFFFF",
    text: "#1F1F1F",
    muted: "#6B6B6B",
    accent: "#6C2BD9",
    accentText: "#FFFFFF",
    border: "#EFE3D2",
    radius: "1rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  dark: {
    id: "dark",
    name: "Premium Escuro",
    tagline: "Fundo escuro, sensação luxo.",
    bg: "#111114",
    surface: "#1B1B1F",
    text: "#F5F5F5",
    muted: "#9A9AA1",
    accent: "#FF8A3D",
    accentText: "#111114",
    border: "#2A2A30",
    radius: "1rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  clean: {
    id: "clean",
    name: "Clean Laranja",
    tagline: "Branco minimalista, foco no produto.",
    bg: "#FFFFFF",
    surface: "#FAFAFA",
    text: "#1F1F1F",
    muted: "#6B6B6B",
    accent: "#FF6B2C",
    accentText: "#FFFFFF",
    border: "#ECECEC",
    radius: "0.875rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  ocean: {
    id: "ocean",
    name: "Oceano Azul",
    tagline: "Fresco e profissional.",
    bg: "#F0F7FF",
    surface: "#FFFFFF",
    text: "#0B2545",
    muted: "#5B7390",
    accent: "#0E7CFF",
    accentText: "#FFFFFF",
    border: "#DCEAFB",
    radius: "1rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  forest: {
    id: "forest",
    name: "Verde Natural",
    tagline: "Tons de natureza, leveza saudável.",
    bg: "#F2F7F1",
    surface: "#FFFFFF",
    text: "#1B2E20",
    muted: "#5E7261",
    accent: "#2E7D4F",
    accentText: "#FFFFFF",
    border: "#DCE7DD",
    radius: "1rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  rose: {
    id: "rose",
    name: "Rosé Doce",
    tagline: "Romântico, ideal para confeitaria.",
    bg: "#FFF4F6",
    surface: "#FFFFFF",
    text: "#3A1B25",
    muted: "#8C5868",
    accent: "#E11D74",
    accentText: "#FFFFFF",
    border: "#F7DCE3",
    radius: "1.125rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  midnight: {
    id: "midnight",
    name: "Meia-noite",
    tagline: "Escuro elegante, destaque dourado.",
    bg: "#0B0E14",
    surface: "#141823",
    text: "#F5F5F5",
    muted: "#8A92A6",
    accent: "#F4C95D",
    accentText: "#0B0E14",
    border: "#22293A",
    radius: "1.125rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  sand: {
    id: "sand",
    name: "Areia Suave",
    tagline: "Bege quente, charme acolhedor.",
    bg: "#F8F2E7",
    surface: "#FFFDF9",
    text: "#3A2E1F",
    muted: "#7A6A53",
    accent: "#B7791F",
    accentText: "#FFFFFF",
    border: "#EADFC8",
    radius: "0.875rem",
    layout: "list",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
};

export const getMenuTheme = (id?: string | null): MenuTheme => {
  if (id && id in MENU_THEMES) return MENU_THEMES[id as MenuThemeId];
  return MENU_THEMES.modern;
};
