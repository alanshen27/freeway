/** Fade + scale motion for overlays and anchored panels (no slide). */
export const popupPanelMotion =
  "data-[state=open]:animate-pop data-[state=closed]:animate-pop-out origin-[var(--radix-popover-content-transform-origin)]";

export const popupOverlayMotion =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200";

export const popupSearchPanelMotion = "animate-pop origin-top";
