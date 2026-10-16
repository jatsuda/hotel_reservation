import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "outline" | "ghost";
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  fullWidth = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-control px-6 py-3 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-dark",
    outline: "border border-primary text-primary hover:bg-primary hover:text-white",
    ghost: "text-text hover:bg-secondary/40",
  };

  const classes = `${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
