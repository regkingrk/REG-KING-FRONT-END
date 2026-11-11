/**
 * Tidies HTML written in Shopify admin before it's shown on the site: drops scripts, styles,
 * embedded frames and forms, inline event handlers and javascript: links, which page-builder apps
 * leave behind and which shouldn't run on the new site. The wording and simple formatting stay.
 */
export function safeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|base)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, '$1="#"');
}
