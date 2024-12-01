import { Modal, type ModalProps } from "./Modal";

export interface DialogProps extends ModalProps {}

/**
 * Open a dialog popup that can be dismissed by clicking outside of it.
 *
 * This is opened programmatically and the content is centered on the screen.
 */
export function Dialog({
  open = false,
  onToggle = () => {},
  children,
  className = "",
}: DialogProps) {
  return (
    // For some reason TypeScript complains if these are possibly undefined, so set defaults above
    <Modal open={open} onToggle={onToggle} className={className}>
      {(args) => (
        <div className="fixed inset-0 z-10 w-screen pointer-events-none">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-0">
            <div className="relative rounded-lg overflow-hidden bg-yeti-light-1 shadow-xl pointer-events-auto w-full sm:my-8 sm:max-w-lg">
              {typeof children === "function" ? children(args) : children}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
