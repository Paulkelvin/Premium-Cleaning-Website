// Canonical-host enforcement in front of the static asset bundle.
//
// Cloudflare Workers Static Assets has no host-based redirect primitive of its
// own, so this tiny Worker sits in front of the ASSETS binding purely to send
// permanent redirects for non-canonical host/protocol combinations before
// falling through to the normal static-asset response for everything else.
const CANONICAL_HOST = "www.rscleaningcollective.com";
const REDIRECTED_HOSTS = new Set(["rscleaningcollective.com", "www.rscleaningcollective.com"]);

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

    return env.ASSETS.fetch(request);
  },
};
