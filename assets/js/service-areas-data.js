window.SERVICE_AREAS = [
  { name: "Austin", aliases: ["austin tx", "atx"], zipPrefixes: ["787", "786"], zips: ["78701", "78702", "78703", "78704", "78705"], tier: "primary", travelFee: 0 },
  { name: "Round Rock", aliases: ["roundrock", "round rock tx"], zipPrefixes: ["78664", "78665", "78681"], tier: "primary", travelFee: 0 },
  { name: "Cedar Park", aliases: ["cedar park tx"], zipPrefixes: ["78613"], tier: "primary", travelFee: 0 },
  { name: "Pflugerville", aliases: ["pflugerville tx", "pflugervile"], zipPrefixes: ["78660"], tier: "primary", travelFee: 0 },
  { name: "Lakeway", aliases: ["lake way"], zipPrefixes: ["78734", "78738"], tier: "extended", travelFee: 20 },
  { name: "Bee Cave", aliases: ["beecave", "bee cave tx"], zipPrefixes: ["78738"], tier: "extended", travelFee: 25 },
  { name: "Georgetown", aliases: ["georgetown tx"], zipPrefixes: ["78626", "78628", "78633"], tier: "extended", travelFee: 20 },
  { name: "Leander", aliases: ["leander tx"], zipPrefixes: ["78641", "78645"], tier: "extended", travelFee: 20 },
  { name: "West Lake Hills", aliases: ["westlake", "west lake", "wlh"], zipPrefixes: ["78746"], tier: "extended", travelFee: 25 },
  { name: "Dripping Springs", aliases: ["dripping springs tx", "dripping spring"], zipPrefixes: ["78620"], tier: "extended", travelFee: 25 },
  { name: "Buda", aliases: ["buda tx"], zipPrefixes: ["78610"], tier: "extended", travelFee: 20 },
  { name: "Kyle", aliases: ["kyle tx"], zipPrefixes: ["78640"], tier: "extended", travelFee: 20 },
  { name: "Manor", aliases: ["manor tx"], zipPrefixes: ["78653"], tier: "extended", travelFee: 15 },
  { name: "San Marcos", aliases: ["san marcos tx"], zipPrefixes: ["78666"], tier: "outside", travelFee: 40 },
  { name: "Bastrop", aliases: ["bastrop tx"], zipPrefixes: ["78602"], tier: "outside", travelFee: 45 }
];

window.SERVICE_AREA_META_KEY = "rs_service_area_meta";

window.OUTSIDE_AREA_DEFAULT = {
  name: "Extended travel zone",
  tier: "outside",
  travelFee: 45
};
