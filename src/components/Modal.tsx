import { useEffect, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface ModalProps {
  open?: boolean;
  onToggle?: (open: boolean) => void;
  button?: ReactNode | (({ isOpen }: { isOpen: boolean }) => ReactNode);
  children:
    | ReactNode
    | (({
        isOpen,
        close,
      }: {
        isOpen: boolean;
        close: () => void;
      }) => ReactNode);
  className?: string;
}

/**
 * Open a modal popup that can be dimissed by clicking outside of it.
 *
 * This has a button that opens the modal and anything can be displayed inside.
 */
export function Modal({
  open,
  onToggle,
  button,
  children,
  className,
}: ModalProps) {
  const details = useRef<HTMLDetailsElement>(null);
  const isOpen = details.current?.open === true;
  function close() {
    if (details.current) {
      details.current.open = false;
    }
  }

  useEffect(() => {
    function onToggleEvent() {
      onToggle?.(details.current!.open);
    }
    details.current?.addEventListener("toggle", onToggleEvent);

    return () => {
      details.current?.removeEventListener("toggle", onToggleEvent);
    };
  }, [onToggle]);

  return (
    <details ref={details} className={twMerge(className, "group")} open={open}>
      <summary
        // when no button, hide off-screen and make it so you can't tab to it
        className={twMerge("list-none", !button && "fixed -top-96 -left-96")}
        tabIndex={button ? undefined : -1}
      >
        {typeof button === "function" ? button({ isOpen }) : button}

        {/* fullscreen background element that you can click to close when it's open */}
        <div className="fixed inset-0 bg-yeti-dark-9/50 hidden group-open:block cursor-pointer"></div>
      </summary>

      {typeof children === "function" ? children({ isOpen, close }) : children}
    </details>
  );
}
