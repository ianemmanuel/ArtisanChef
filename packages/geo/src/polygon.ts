/**
 * polygon.ts — approximate polygon-vs-polygon checks for draw-time validation.
 *
 * Pure functions — no I/O, no side-effects, no external deps.
 *
 * These are VERTEX-BASED approximations, matching the existing crude checks in
 * admin.deliveryzone.service.ts. They catch every realistic hand-drawn case
 * (a zone poking outside the city, two zones plainly overlapping) but miss
 * pathological constructions where two polygons intersect with no vertex of
 * either inside the other. Exact `ST_Within` / `ST_Overlaps` arrives with the
 * PostGIS migration (a later stage); until then the admin draw UI plus these
 * checks are the guard.
 */

import type { GeoJsonPolygon, GeoJsonMultiPolygon, GeoPoint } from "./types"
import { isPointInCityBoundary, isPointInServiceArea } from "./point-in-polygon"

type AnyPolygon = GeoJsonPolygon | GeoJsonMultiPolygon

/** Every outer ring of a Polygon / MultiPolygon, as [lng, lat] pairs. */
export function outerRings(geometry: AnyPolygon): [number, number][][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0] ?? []]
  }
  return geometry.coordinates.map((poly) => poly[0] ?? [])
}

function outerVertices(geometry: AnyPolygon): GeoPoint[] {
  const points: GeoPoint[] = []
  for (const ring of outerRings(geometry)) {
    for (const [lng, lat] of ring) {
      points.push({ latitude: lat, longitude: lng })
    }
  }
  return points
}

/**
 * True iff every outer vertex of `inner` sits inside `container`. Approximate
 * (a straight edge between two contained vertices can still bow outside a
 * concave container) but sufficient for confirming a hand-drawn zone is
 * within its city boundary.
 */
export function polygonWithinBoundary(inner: AnyPolygon, container: AnyPolygon): boolean {
  const vertices = outerVertices(inner)
  if (vertices.length === 0) return false
  return vertices.every((v) => isPointInCityBoundary(v, container))
}

/**
 * Approximate overlap test: true iff any outer vertex of either polygon lies
 * inside the other. Symmetric.
 */
export function polygonsOverlapApprox(a: AnyPolygon, b: AnyPolygon): boolean {
  return (
    outerVertices(a).some((v) => isPointInServiceArea(v, b)) ||
    outerVertices(b).some((v) => isPointInServiceArea(v, a))
  )
}
