/**
 * distance.ts — great-circle distance primitives.
 *
 * Pure functions — no I/O, no side-effects.
 *
 * These back the "delivery outside the city boundary is allowed only if the
 * customer is within the outlet's delivery radius" rule. The full delivery-
 * serviceability resolver (which pins down the Outlet.deliveryRadius unit and
 * combines this with the zone check) is a later stage.
 */

import type { GeoPoint } from "./types"

// IUGG mean Earth radius, metres.
const EARTH_RADIUS_M = 6_371_008.8

/** Haversine distance between two lat/lng points, in metres. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** True iff `point` is within `radiusMeters` of `center`. */
export function isWithinRadiusMeters(
  center      : GeoPoint,
  point       : GeoPoint,
  radiusMeters: number,
): boolean {
  return radiusMeters > 0 && haversineMeters(center, point) <= radiusMeters
}
