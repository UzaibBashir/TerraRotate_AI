const EARTH_RADIUS_METERS = 6371008.8;

export function getMapBounds(latitude, longitude, zoom = 1) {
  const lat = Number(latitude), lon = Number(longitude), scale = Number(zoom);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isInteger(scale) || scale < 1 || scale > 4) {
    throw new Error("Enter valid coordinates and a map zoom from 1 to 4.");
  }
  return { west: Math.max(-180, lon - .45 / scale), east: Math.min(180, lon + .45 / scale), south: Math.max(-90, lat - .30 / scale), north: Math.min(90, lat + .30 / scale) };
}

export function projectCoordinate(coordinate, bounds) {
  return `${((coordinate[0] - bounds.west) / (bounds.east - bounds.west) * 100).toFixed(2)},${((bounds.north - coordinate[1]) / (bounds.north - bounds.south) * 100).toFixed(2)}`;
}

function areaOfRing(ring) {
  const sum = ring.slice(0, -1).reduce((total, point, index) => {
    const next = ring[index + 1];
    return total + (next[0] - point[0]) * Math.PI / 180 * (2 + Math.sin(point[1] * Math.PI / 180) + Math.sin(next[1] * Math.PI / 180));
  }, 0);
  return Math.abs(sum * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2);
}

export function parseBoundaryGeoJSON(text) {
  const parsed = JSON.parse(text), geometry = parsed.type === "Feature" ? parsed.geometry : parsed;
  if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length) throw new Error("Paste a GeoJSON Polygon or Feature containing a Polygon.");
  const rings = geometry.coordinates.map(ring => {
    if (!Array.isArray(ring) || ring.length < 4 || ring.length > 501 || ring.some(point => !Array.isArray(point) || point.length < 2 || !Number.isFinite(Number(point[0])) || !Number.isFinite(Number(point[1])) || Math.abs(Number(point[0])) > 180 || Math.abs(Number(point[1])) > 90)) throw new Error("Every polygon ring needs at least 4 valid [longitude, latitude] positions, within coordinate limits.");
    return ring.map(point => [Number(point[0]), Number(point[1])]);
  });
  for (const ring of rings) {
    const first = ring[0], last = ring.at(-1);
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error("Close each polygon ring by repeating its first coordinate at the end.");
    if (new Set(ring.slice(0, -1).map(point => point.join(","))).size < 3) throw new Error("Each polygon ring needs at least three distinct positions.");
  }
  const areaHectares = Math.max(0, (areaOfRing(rings[0]) - rings.slice(1).reduce((sum, ring) => sum + areaOfRing(ring), 0)) / 10000);
  if (!Number.isFinite(areaHectares) || areaHectares <= 0) throw new Error("Boundary area could not be calculated. Check the supplied polygon.");
  return { rings, areaHectares };
}
