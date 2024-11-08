import { twMerge } from "tailwind-merge";

const { BASE_URL } = import.meta.env;

export enum Color {
  dark = "dark",
  // light = "light", // TODO
}

export enum Size {
  small = "sm",
  medium = "md",
  large = "lg",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: `${Color}`;
  size?: `${Size}`;
  pill?: boolean;
}
export function Button({
  color = Color.dark,
  size = Size.medium,
  pill,
  className,
  children,
  ...nativeProps
}: ButtonProps) {
  return (
    <button
      {...nativeProps}
      className={twMerge(
        "text-center",
        pill ? "rounded-full" : "rounded-lg",
        color === Color.dark && "bg-yeti-dark text-white hover:bg-yeti-dark-7",
        // color === Color.light && "", // TODO
        size === Size.small && "px-2 py-1 text-sm",
        size === Size.medium && "px-4 py-3 text-base",
        size === Size.large && "px-8 py-4 text-xl",
        className
      )}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  color?: `${Color}`;
  size?: `${Size}`;
  pill?: boolean;
  href: string;
}
export function LinkButton({
  color = Color.dark,
  size = Size.medium,
  pill,
  href,
  className,
  children,
  ...nativeProps
}: LinkButtonProps) {
  return (
    <a
      {...nativeProps}
      href={href.startsWith("/") ? BASE_URL + href : href}
      className={twMerge(
        "text-center",
        pill ? "rounded-full" : "rounded-lg",
        color === Color.dark && "bg-yeti-dark text-white hover:bg-yeti-dark-7",
        // color === Color.light && "", // TODO
        size === Size.small && "px-2 py-1 text-sm",
        size === Size.medium && "px-4 py-3 text-base",
        size === Size.large && "px-8 py-4 text-xl",
        className
      )}
    >
      {children}
    </a>
  );
}
