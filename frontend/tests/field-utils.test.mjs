import test from "node:test";
import assert from "node:assert/strict";
import { getMapBounds, parseBoundaryGeoJSON, projectCoordinate } from "../app/field-utils.mjs";

test("map bounds zoom around a valid global coordinate and clip at poles", () => {
  const zoomed = getMapBounds(33, 75, 2);
  assert.equal(zoomed.west, 74.775);
  assert.equal(zoomed.east, 75.225);
  assert.deepEqual(getMapBounds(89.9, 179.9, 1), { west: 179.45, east: 180, south: 89.60000000000001, north: 90 });
  assert.throws(() => getMapBounds(91, 0, 1), /valid coordinates/);
  assert.throws(() => getMapBounds(0, 0, 5), /zoom from 1 to 4/);
});

test("map coordinate projection maps the selected point to the right location", () => {
  const bounds = getMapBounds(33, 75, 1);
  assert.equal(projectCoordinate([75, 33], bounds), "50.00,50.00");
});

test("GeoJSON polygon area is estimated in hectares and holes are subtracted", () => {
  const outer = [[0,0],[.01,0],[.01,.01],[0,.01],[0,0]];
  const hole = [[.002,.002],[.004,.002],[.004,.004],[.002,.004],[.002,.002]];
  const feature = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [outer, hole] } };
  const result = parseBoundaryGeoJSON(JSON.stringify(feature));
  assert.equal(result.rings.length, 2);
  assert.ok(result.areaHectares > 11_000 && result.areaHectares < 13_000);
});

test("GeoJSON polygon validation rejects open and degenerate rings", () => {
  assert.throws(() => parseBoundaryGeoJSON(JSON.stringify({ type: "Polygon", coordinates: [[[0,0],[1,0],[1,1],[0,1]]] })), /Close each polygon ring/);
  assert.throws(() => parseBoundaryGeoJSON(JSON.stringify({ type: "Polygon", coordinates: [[[0,0],[0,0],[0,0],[0,0]]] })), /three distinct/);
  assert.throws(() => parseBoundaryGeoJSON("not json"), SyntaxError);
});
