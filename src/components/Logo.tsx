import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo-treexmenu.png";

interface Props {
  className?: string;
  /** Tailwind height class for the image (e.g., "h-12") */
  imgClassName?: string;
}

export const Logo = ({ className, imgClassName = "h-20" }: Props) => {
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center", className)}
      aria-label="TreexMenu"
    >
      <img
        src={logoImg}
        alt="TreexMenu"
        className={cn("w-auto select-none", imgClassName)}
        loading="eager"
        draggable={false}
      />
    </Link>
  );
};
