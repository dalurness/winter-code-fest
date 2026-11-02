const { BASE_URL } = import.meta.env;
const HAS_EXTENSION = /\.[0-9a-z]+$/i;

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}
export function Link({ href, children, ...nativeProps }: LinkProps) {
  if (href.startsWith("/")) {
    href = BASE_URL + href.slice(1);
  }

  // Pages end in a slash; leave URLs with a query or hash alone
  if (!HAS_EXTENSION.test(href) && !href.endsWith("/") && !/[?#]/.test(href)) {
    href += "/";
  }

  return (
    <a {...nativeProps} href={href}>
      {children}
    </a>
  );
}
