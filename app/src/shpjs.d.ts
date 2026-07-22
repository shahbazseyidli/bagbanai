// shpjs@4 ships no types. Minimal ambient declaration: shp() parses a zipped shapefile
// (ArrayBuffer) or a URL into GeoJSON — a FeatureCollection, or an array of them for a
// multi-layer .zip. We only read polygon geometry out of it.
declare module "shpjs" {
  const shp: (input: ArrayBuffer | string) => Promise<unknown>;
  export default shp;
}
