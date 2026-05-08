import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo-frodfast.png";

interface Props {
  className?: string;
  /** Tailwind height class for image (e.g., "h-12") */
  imgClassName?: string;
}

export const Logo = ({ className, imgClassName = "h-20" }: Props) => {
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center", className)}
      aria-label="FrodFast"
    >
      <img
        src={logoImg}
        alt="FrodFast"
        className={cn("w-auto select-none transition-opacity", imgClassName)}
        loading="lazy"
        decoding="async"
        draggable={false}
              />
    </Link>
  );
};
