window.SERVICE_AREAS = [
  {
    name: "Charles County",
    cities: [
      "Waldorf, MD",
      "White Plains, MD",
      "La Plata, MD",
      "Hughesville, MD",
      "Newburg, MD",
      "Port Tobacco, MD"
    ],
    aliases: [
      "charles county",
      "charles co",
      "waldorf",
      "white plains",
      "la plata",
      "laplata",
      "hughesville",
      "newburg",
      "port tobacco"
    ],
    zips: ["20601", "20602", "20603", "20637", "20646", "20664", "20677", "20695"],
    zipPrefixes: ["20601", "20602", "20603", "20637", "20646", "20664", "20677", "20695"],
    tier: "primary",
    travelFee: 0
  },
  {
    name: "St. Mary's County",
    cities: [
      "Mechanicsville, MD",
      "Charlotte Hall, MD",
      "Leonardtown, MD",
      "Hollywood, MD",
      "California, MD",
      "Lexington Park, MD",
      "Avenue, MD"
    ],
    aliases: [
      "st marys county",
      "st. mary's county",
      "st mary's",
      "mechanicsville",
      "charlotte hall",
      "leonardtown",
      "hollywood",
      "lexington park",
      "california md",
      "avenue md"
    ],
    zips: ["20609", "20619", "20622", "20636", "20650", "20653", "20659"],
    zipPrefixes: ["20609", "20619", "20622", "20636", "20650", "20653", "20659"],
    tier: "primary",
    travelFee: 0
  },
  {
    name: "Calvert County",
    cities: [
      "Dunkirk, MD",
      "Huntingtown, MD",
      "Prince Frederick, MD",
      "Chesapeake Beach, MD",
      "North Beach, MD",
      "Solomons, MD",
      "Lusby, MD"
    ],
    aliases: [
      "calvert county",
      "calvert co",
      "dunkirk",
      "huntingtown",
      "prince frederick",
      "chesapeake beach",
      "north beach",
      "solomons",
      "lusby"
    ],
    zips: ["20639", "20657", "20678", "20688", "20714", "20732", "20754"],
    zipPrefixes: ["20639", "20657", "20678", "20688", "20714", "20732", "20754"],
    tier: "primary",
    travelFee: 0
  },
  {
    name: "Prince George's County",
    cities: [
      "Bowie, MD",
      "Upper Marlboro, MD",
      "Brandywine, MD",
      "Aquasco, MD",
      "Mitchellville, MD",
      "Woodmore, MD",
      "Glenn Dale, MD"
    ],
    aliases: [
      "prince georges county",
      "prince george's county",
      "pg county",
      "bowie",
      "upper marlboro",
      "brandywine",
      "aquasco",
      "mitchellville",
      "woodmore",
      "glenn dale"
    ],
    zips: ["20608", "20613", "20715", "20716", "20720", "20721", "20769", "20772", "20774"],
    zipPrefixes: ["20608", "20613", "20715", "20716", "20720", "20721", "20769", "20772", "20774"],
    tier: "primary",
    travelFee: 0
  }
];

window.SERVICE_AREA_META_KEY = "rs_service_area_meta";

window.SERVICE_AREA_TOWN_NOTICE = {
  title: "Don't see your town listed?",
  lead: "Contact us!",
  body:
    "We proudly serve Southern Maryland and surrounding communities throughout St. Mary's, Charles, Calvert, and Prince George's counties.",
  contactHref: "contact.html"
};

window.OUTSIDE_AREA_DEFAULT = {
  name: "Extended travel zone",
  tier: "outside",
  travelFee: 35
};

function renderServiceAreaTownNotice() {
  const target = document.querySelector("[data-service-area-town-notice]");
  const notice = window.SERVICE_AREA_TOWN_NOTICE;
  if (!target || !notice) return;

  const escape = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  target.innerHTML = `
    <p class="service-area-town-notice-text">
      <strong>${escape(notice.title)}</strong>
      <a class="text-link" href="${escape(notice.contactHref)}">${escape(notice.lead)}</a>
      ${escape(notice.body)}
    </p>`;
}

window.renderServiceAreaTownNotice = renderServiceAreaTownNotice;
