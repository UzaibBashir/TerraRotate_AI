import test from "node:test";
import assert from "node:assert/strict";
import { getMapBounds, parseBoundaryGeoJSON, projectCoordinate } from "../app/field-utils.mjs";

test("map bounds zoom around a valid global coordinate and clip at poles", () => {
  const zoomed = getMapBounds(33, 75, 2);
  assert.equal(zoomed.west, 74.775);
  assert.equal(zoomed.east, 75.225);
  const clipped = getMapBounds(89.9, 179.9, 1);
  assert.ok(Math.abs(clipped.west - 179.45) < 1e-9);
  assert.equal(clipped.east, 180);
  assert.equal(clipped.north, 90);
  assert.ok(Math.abs(clipped.south - 89.6) < 1e-9);
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
  assert.ok(result.areaHectares > 115 && result.areaHectares < 125);
});

test("GeoJSON polygon validation rejects open and degenerate rings", () => {
  assert.throws(() => parseBoundaryGeoJSON(JSON.stringify({ type: "Polygon", coordinates: [[[0,0],[1,0],[1,1],[0,1]]] })), /Close each polygon ring/);
  assert.throws(() => parseBoundaryGeoJSON(JSON.stringify({ type: "Polygon", coordinates: [[[0,0],[0,0],[0,0],[0,0]]] })), /three distinct/);
  assert.throws(() => parseBoundaryGeoJSON("not json"), SyntaxError);
});
