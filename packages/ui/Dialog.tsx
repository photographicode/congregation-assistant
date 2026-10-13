import React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Dialog({
  open,
  onClose,
  title,
  children,
  dirty = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  dirty?: boolean;
}) {
  const opener = React.useRef<HTMLElement | null>(null);
  const wasOpen = React.useRef(false);
  if (open && !wasOpen.current)
    opener.current = document.activeElement as HTMLElement;
  wasOpen.current = open;
  const [confirm, setConfirm] = React.useState(false);
  const request = () => (dirty ? setConfirm(true) : onClose());
  React.useEffect(() => {
    if (!open) setConfirm(false);
  }, [open]);
  return (
    <Primitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) request();
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content
          className="dialog"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            request();
          }}
          onPointerDownOutside={(e) => {
            if (dirty) e.preventDefault();
          }}
        >
          <header>
            <Primitive.Title>{title}</Primitive.Title>
            <button
              type="button"
              className="icon-button"
              aria-label="Close"
              title="Close"
              onClick={request}
            >
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="dialog-body">
            {confirm ? (
              <section role="alert">
                <h3>Discard changes?</h3>
                <p>Your unsaved changes will be lost.</p>
                <div className="actions">
                  <button onClick={() => setConfirm(false)}>
                    Keep editing
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      setConfirm(false);
                      onClose();
                    }}
                  >
                    Discard changes
                  </button>
                </div>
              </section>
            ) : (
              children
            )}
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
