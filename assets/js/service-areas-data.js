window.SERVICE_AREAS = [
  { name: "Charles County", aliases: ["charles county", "charles co", "waldorf", "la plata"], tier: "primary", travelFee: 0 },
  { name: "St. Mary's County", aliases: ["st marys county", "st. mary's county", "st mary's", "leonardtown", "lexington park"], tier: "primary", travelFee: 0 },
  { name: "Calvert County", aliases: ["calvert county", "calvert co", "prince frederick", "chesapeake beach"], tier: "primary", travelFee: 0 },
  { name: "Prince George's County", aliases: ["prince georges county", "prince george's county", "pg county", "bowie", "upper marlboro"], tier: "primary", travelFee: 0 },
  { name: "Southern Anne Arundel County", aliases: ["southern anne arundel", "anne arundel county south", "edgewater", "deale"], tier: "extended", travelFee: 20 },
  { name: "Washington, DC", aliases: ["washington dc", "washington, dc", "dc", "district of columbia"], tier: "extended", travelFee: 20 }
];

window.SERVICE_AREA_META_KEY = "rs_service_area_meta";

window.OUTSIDE_AREA_DEFAULT = {
  name: "Extended travel zone",
  tier: "outside",
  travelFee: 35
};
