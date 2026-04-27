import {
  UtensilsCrossed, Beef, Sandwich, Pizza, Drumstick, Fish, Salad, Soup,
  IceCream, IceCream2, CakeSlice, Cookie, Croissant, Donut, Coffee,
  CupSoda, Wine, Beer, Martini, GlassWater, Milk, Egg,
  Apple, Cherry, Grape, Carrot, Wheat, Leaf, Flame, Star,
  Snowflake, Heart, Candy, Lollipop,
  type LucideIcon,
} from "lucide-react";

// Ícones personalizados gerados com IA
import lanchesImg from "@/assets/icons/lanches.png";
import pizzaImg from "@/assets/icons/pizza.png";
import acaiImg from "@/assets/icons/acai.png";
import bebidasImg from "@/assets/icons/bebidas.png";
import sobremesasImg from "@/assets/icons/sobremesas.png";
import porcoesImg from "@/assets/icons/porcoes.png";
import combosImg from "@/assets/icons/combos.png";
import marmitasImg from "@/assets/icons/marmitas.png";
import pasteisImg from "@/assets/icons/pasteis.png";
import hotdogImg from "@/assets/icons/hotdog.png";
import saudavelImg from "@/assets/icons/saudavel.png";
import veganoImg from "@/assets/icons/vegano.png";
import promocoesImg from "@/assets/icons/promocoes.png";
import maisvendidosImg from "@/assets/icons/maisvendidos.png";
import novidadesImg from "@/assets/icons/novidades.png";

export interface CategoryIcon {
  key: string;
  label: string;
  /** Lucide fallback icon (compat) */
  Icon: LucideIcon;
  /** Imagem PNG personalizada (novo padrão) */
  image?: string;
  /** Cor de destaque do ícone (para fundo do badge quando não tiver imagem) */
  color?: string;
}

/**
 * Catálogo de ícones para categorias do cardápio.
 * Os ícones com `image` usam PNGs personalizados gerados com IA.
 * Os demais usam ícones do Lucide (compatibilidade com categorias antigas).
 */
export const CATEGORY_ICONS: CategoryIcon[] = [
  // ===== Personalizados (com IA) =====
  { key: "lanches",      label: "Lanches",       Icon: Sandwich,    image: lanchesImg,      color: "#F97316" },
  { key: "pizza",        label: "Pizza",         Icon: Pizza,       image: pizzaImg,        color: "#EF4444" },
  { key: "acai",         label: "Açaí",          Icon: IceCream2,   image: acaiImg,         color: "#7C3AED" },
  { key: "bebidas",      label: "Bebidas",       Icon: CupSoda,     image: bebidasImg,      color: "#06B6D4" },
  { key: "sobremesas",   label: "Sobremesas",    Icon: IceCream,    image: sobremesasImg,   color: "#EC4899" },
  { key: "porcoes",      label: "Porções",       Icon: UtensilsCrossed, image: porcoesImg,  color: "#EAB308" },
  { key: "combos",       label: "Combos",        Icon: UtensilsCrossed, image: combosImg,   color: "#6366F1" },
  { key: "marmitas",     label: "Marmitas",      Icon: UtensilsCrossed, image: marmitasImg, color: "#14B8A6" },
  { key: "pasteis",      label: "Pastéis",       Icon: UtensilsCrossed, image: pasteisImg,  color: "#F59E0B" },
  { key: "hotdog",       label: "Hot dog",       Icon: Sandwich,    image: hotdogImg,       color: "#DC2626" },
  { key: "saudavel",     label: "Saudável / Fit",Icon: Salad,       image: saudavelImg,     color: "#84CC16" },
  { key: "vegano",       label: "Vegano",        Icon: Leaf,        image: veganoImg,       color: "#10B981" },
  { key: "promocoes",    label: "Promoções",     Icon: Star,        image: promocoesImg,    color: "#EC4899" },
  { key: "maisvendidos", label: "Mais vendidos", Icon: Flame,       image: maisvendidosImg, color: "#F97316" },
  { key: "novidades",    label: "Novidades",     Icon: Star,        image: novidadesImg,    color: "#A855F7" },

  // ===== Genéricos (Lucide) - mantidos para variedade e compat =====
  { key: "utensils",   label: "Geral",        Icon: UtensilsCrossed },
  { key: "burger",     label: "Lanche",       Icon: Sandwich },
  { key: "sandwich",   label: "Sanduíche",    Icon: Sandwich },
  { key: "beef",       label: "Carnes",       Icon: Beef },
  { key: "drumstick",  label: "Frango",       Icon: Drumstick },
  { key: "fish",       label: "Peixe",        Icon: Fish },
  { key: "salad",      label: "Salada",       Icon: Salad },
  { key: "soup",       label: "Sopa",         Icon: Soup },
  { key: "egg",        label: "Café da manhã",Icon: Egg },
  { key: "croissant",  label: "Padaria",      Icon: Croissant },
  { key: "wheat",      label: "Massas",       Icon: Wheat },
  { key: "leaf",       label: "Vegano (alt)", Icon: Leaf },
  { key: "flame",      label: "Picante",      Icon: Flame },
  { key: "icecream",   label: "Sorvete",      Icon: IceCream },
  { key: "icecream2",  label: "Açaí (alt)",   Icon: IceCream2 },
  { key: "cake",       label: "Bolo",         Icon: CakeSlice },
  { key: "donut",      label: "Donut",        Icon: Donut },
  { key: "cookie",     label: "Cookie",       Icon: Cookie },
  { key: "candy",      label: "Doces",        Icon: Candy },
  { key: "lollipop",   label: "Pirulito",     Icon: Lollipop },
  { key: "coffee",     label: "Café",         Icon: Coffee },
  { key: "soda",       label: "Refrigerante", Icon: CupSoda },
  { key: "water",      label: "Água",         Icon: GlassWater },
  { key: "milk",       label: "Leite",        Icon: Milk },
  { key: "beer",       label: "Cerveja",      Icon: Beer },
  { key: "wine",       label: "Vinho",        Icon: Wine },
  { key: "martini",    label: "Drinks",       Icon: Martini },
  { key: "apple",      label: "Frutas",       Icon: Apple },
  { key: "cherry",     label: "Cereja",       Icon: Cherry },
  { key: "grape",      label: "Uva",          Icon: Grape },
  { key: "carrot",     label: "Vegetais",     Icon: Carrot },
  { key: "snowflake",  label: "Gelados",      Icon: Snowflake },
  { key: "heart",      label: "Favoritos",    Icon: Heart },
  { key: "star",       label: "Especiais",    Icon: Star },
];

const ICON_MAP: Record<string, CategoryIcon> = CATEGORY_ICONS.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {} as Record<string, CategoryIcon>);

/** Compat: retorna apenas o componente Lucide (legado). */
export const getCategoryIcon = (key?: string | null): LucideIcon => {
  if (key && ICON_MAP[key]) return ICON_MAP[key].Icon;
  return UtensilsCrossed;
};

/** Retorna o item completo (imagem PNG + cor + Lucide fallback). */
export const getCategoryIconData = (key?: string | null): CategoryIcon => {
  if (key && ICON_MAP[key]) return ICON_MAP[key];
  return ICON_MAP["utensils"];
};
