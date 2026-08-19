import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom";

interface TooltipProps {
  label: ReactNode;
  children: ReactElement;
  delay?: number;
  disabled?: boolean;
}

interface Pos {
  top: number;
  left: number;
  placement: Placement;
  arrowLeft: number;
}

const SHOW_DELAY = 350;
const GAP = 6;
const VIEWPORT_MARGIN = 6;
const MOBILE_QUERY = "(max-width: 768px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function Tooltip({ label, children, delay = SHOW_DELAY, disabled }: TooltipProps) {
  const child = Children.only(children) as ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    ref?: React.Ref<HTMLElement>;
  }>;

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const isMobile = useIsMobile();

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      const elementWithRef = child as unknown as {
        ref?: React.Ref<HTMLElement>;
        props?: { ref?: React.Ref<HTMLElement> };
      };
      const childRef = elementWithRef.ref ?? elementWithRef.props?.ref;
      if (typeof childRef === "function") childRef(node);
      else if (childRef && typeof childRef === "object") {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    [child],
  );

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tooltipRef.current;
    if (!trigger || !tip) return;
    const r = trigger.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    const placement: Placement = spaceBelow >= tipH + GAP + VIEWPORT_MARGIN || spaceBelow >= spaceAbove ? "bottom" : "top";

    const top = placement === "bottom" ? r.bottom + GAP : r.top - tipH - GAP;

    const centerX = r.left + r.width / 2;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(centerX - tipW / 2, vw - tipW - VIEWPORT_MARGIN));
    const arrowLeft = Math.max(8, Math.min(centerX - left, tipW - 8));

    setPos({ top, left, placement, arrowLeft });
  }, []);

  useEffect(() => {
    if (!open) return;
    computePosition();
    const handler = () => computePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, computePosition]);

  const clearTimer = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  if (disabled || isMobile) return child;

  const scheduleShow = () => {
    clearTimer();
    showTimer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimer();
    setOpen(false);
    setPos(null);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    scheduleShow();
    child.props.onMouseEnter?.(e);
  };
  const handleMouseLeave = (e: React.MouseEvent) => {
    hide();
    child.props.onMouseLeave?.(e);
  };
  const handleFocus = (e: React.FocusEvent) => {
    scheduleShow();
    child.props.onFocus?.(e);
  };
  const handleBlur = (e: React.FocusEvent) => {
    hide();
    child.props.onBlur?.(e);
  };

  const cloned = cloneElement(child, {
    ref: setRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  if (!isValidElement(child)) return child;

  return (
    <>
      {cloned}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              style={{
                position: "fixed",
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                zIndex: 3000,
                pointerEvents: "none",
                opacity: pos ? 1 : 0,
                transition: "opacity 0.12s",
                background: "var(--text-primary)",
                color: "var(--bg-base)",
                padding: "5px 9px",
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.4,
                fontFamily: "var(--font-family-base)",
                boxShadow: "var(--shadow-md)",
                maxWidth: 240,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
              {pos && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: pos.arrowLeft,
                    [pos.placement === "bottom" ? "top" : "bottom"]: -4,
                    width: 8,
                    height: 8,
                    background: "var(--text-primary)",
                    transform: "translateX(-50%) rotate(45deg)",
                  }}
                />
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
