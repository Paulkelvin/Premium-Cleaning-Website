// Canonical-host enforcement in front of the static asset bundle.
//
// Cloudflare Workers Static Assets has no host-based redirect primitive of its
// own, so this tiny Worker sits in front of the ASSETS binding purely to send
// permanent redirects for non-canonical host/protocol combinations before
// falling through to the normal static-asset response for everything else.
// Asset responses also get baseline security headers and browser caching.
const CANONICAL_HOST = "www.rscleaningcollective.com";
const REDIRECTED_HOSTS = new Set(["rscleaningcollective.com", "www.rscleaningcollective.com"]);

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// File names are not fingerprinted, so CSS/JS keep a short cache to pick up
// deploys quickly; images and fonts rarely change and can be cached longer.
const IMAGE_OR_FONT = /\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?)$/i;
const SCRIPT_OR_STYLE = /\.(css|js)$/i;

function cacheControlFor(pathname) {
  if (!pathname.startsWith("/assets/")) return null;
  if (IMAGE_OR_FONT.test(pathname)) return "public, max-age=2592000";
  if (SCRIPT_OR_STYLE.test(pathname)) return "public, max-age=600";
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const isCanonical = url.protocol === "https:" && url.hostname === CANONICAL_HOST;
    if (!isCanonical && REDIRECTED_HOSTS.has(url.hostname)) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const response = new Response(assetResponse.body, assetResponse);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(name, value);
    }
    const cacheControl = response.status === 200 ? cacheControlFor(url.pathname) : null;
    if (cacheControl) response.headers.set("Cache-Control", cacheControl);
    return response;
  },
};
