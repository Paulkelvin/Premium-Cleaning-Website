window.SERVICE_AREAS = [
  {
    name: "Charles County",
    cities: ["Waldorf, MD", "White Plains, MD", "La Plata, MD", "Hughesville, MD"],
    aliases: ["charles county", "charles co", "waldorf", "white plains", "la plata", "laplata", "hughesville"],
    zips: ["20601", "20602", "20603", "20637", "20646", "20658", "20675", "20695"],
    zipPrefixes: ["2060", "2061", "2062", "2069"],
    tier: "primary",
    travelFee: 0
  },
  {
    name: "St. Mary's County",
    cities: ["Mechanicsville, MD", "Charlotte Hall, MD", "Leonardtown, MD", "Hollywood, MD", "Lexington Park, MD"],
    aliases: ["st marys county", "st. mary's county", "st mary's", "mechanicsville", "charlotte hall", "leonardtown", "hollywood", "lexington park"],
    zips: ["20606", "20622", "20639", "20650", "20653", "20659", "20670", "20674", "20687", "20690"],
    zipPrefixes: ["2065", "2067"],
    tier: "primary",
    travelFee: 0
  },
  {
    name: "Calvert County",
    cities: ["Dunkirk, MD", "Huntingtown, MD", "Prince Frederick, MD", "Chesapeake Beach, MD", "Solomons, MD", "Lusby, MD"],
    aliases: ["calvert county", "calvert co", "dunkirk", "huntingtown", "prince frederick", "chesapeake beach", "solomons", "lusby"],
    zips: ["20657", "20714", "20729", "20732", "20736", "20754", "20751"],
    zipPrefixes: ["20732", "20736", "20754", "20657"],
    tier: "primary",
    travelFee: 0
  },
  {
    name: "Prince George's County",
    cities: ["Bowie, MD", "Upper Marlboro, MD", "Brandywine, MD", "Aquasco, MD"],
    aliases: ["prince georges county", "prince george's county", "pg county", "bowie", "upper marlboro", "brandywine", "aquasco"],
    zips: ["20608", "20613", "20705", "20715", "20716", "20720", "20721", "20735", "20772", "20774"],
    zipPrefixes: ["2070", "2071", "2072", "2077", "2060", "2061"],
    tier: "primary",
    travelFee: 0
  }
];

window.SERVICE_AREA_META_KEY = "rs_service_area_meta";

window.OUTSIDE_AREA_DEFAULT = {
  name: "Extended travel zone",
  tier: "outside",
  travelFee: 35
};
