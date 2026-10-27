import "./dialog-layout.css";
import React from "react";
import {t} from "../core/i18n";
import * as Primitive from "@radix-ui/react-dialog";
import { X, Info, CheckCircle2, AlertTriangle, CircleAlert } from "lucide-react";
export function Dialog({
  open,
  onClose,
  title,
  children,
  dirty = false,
  tone = "info",
  returnFocusTo,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  dirty?: boolean;
  tone?: "info"|"success"|"warning"|"danger";
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  const ToneIcon={info:Info,success:CheckCircle2,warning:AlertTriangle,danger:CircleAlert}[tone];
  const opener = React.useRef<HTMLElement | null>(null);
  const wasOpen = React.useRef(false);
  if (open && !wasOpen.current)
    opener.current = document.activeElement as HTMLElement;
  wasOpen.current = open;
  const closeRef=React.useRef(onClose);closeRef.current=onClose;
  React.useEffect(()=>{if(!open)return;const close=()=>closeRef.current();window.addEventListener("ca:after-navigate",close);return()=>window.removeEventListener("ca:after-navigate",close);},[open]);
  const swipe=React.useRef<{x:number;y:number}|null>(null);
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
          data-tone={confirm?"warning":tone}
          translate="no"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocusTo?.current || opener.current;
            if(target?.isConnected)target.focus({preventScroll:true});
            else {const main=document.querySelector<HTMLElement>('main');if(main){const previous=main.getAttribute('tabindex');main.setAttribute('tabindex','-1');main.focus({preventScroll:true});if(previous===null)main.removeAttribute('tabindex');}}
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            request();
          }}
          onPointerDownOutside={(e) => {
            if (dirty) e.preventDefault();
          }}
        >
          <header onPointerDown={event=>{if(event.pointerType==='touch'&&matchMedia('(max-width:599px)').matches&&!((event.target as HTMLElement).closest('button')))swipe.current={x:event.clientX,y:event.clientY};}} onPointerCancel={()=>{swipe.current=null;}} onPointerUp={event=>{const start=swipe.current;swipe.current=null;if(start&&event.clientY-start.y>80&&Math.abs(event.clientX-start.x)<50)request();}}>
            <ToneIcon className="dialog-tone-icon" aria-hidden="true"/>
            <Primitive.Title>{title}</Primitive.Title>
            <button
              type="button"
              className="icon-button"
              aria-label={t("common.close")}
              title={t("common.close")}
              onClick={request}
            >
              <X aria-hidden="true" /><span>{t("common.close")}</span>
            </button>
          </header>
          <div className="dialog-body">
            {confirm ? (
              <section role="alert">
                <h3>{t("common.discardTitle")}</h3>
                <p>{t("common.unsaved")}</p>
                <div className="actions">
                  <button onClick={() => setConfirm(false)} type="button">
                    {t("common.keepEditing")}
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      setConfirm(false);
                      onClose();
                    }} type="button"
                  >
                    {t("common.discard")}
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

export function DialogCancel({children,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>){return <Primitive.Close asChild><button type="button" {...props}>{children}</button></Primitive.Close>;}
