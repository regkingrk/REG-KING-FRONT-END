/**
 * Single place where the site leaves the page, so the live preview can open
 * destinations in a new tab instead of navigating its own frame.
 */
export function navigate(url: string, label?: string) {
  const hook = (globalThis as { __RK_NAV__?: (url: string, label?: string) => void }).__RK_NAV__;
  if (typeof hook === "function") return hook(url, label);
  window.location.href = url;
}
