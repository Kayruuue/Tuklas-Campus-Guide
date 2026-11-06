/** Small, reusable GPS and compass calculations. */
import type { Campus, Facility, UserPosition } from '../models/facility.model';

const earthRadiusMeters = 6_371_000;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radiansValue: number) => (radiansValue * 180) / Math.PI;

export function distanceInMeters(from: UserPosition, to: UserPosition): number {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingInDegrees(from: UserPosition, to: UserPosition): number {
  const longitudeDelta = radians(to.longitude - from.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(radians(to.latitude));
  const x =
    Math.cos(radians(from.latitude)) * Math.sin(radians(to.latitude)) -
    Math.sin(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.cos(longitudeDelta);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function readableDistance(distance: number | null): string {
  if (distance === null) return 'Distance unavailable';
  return distance < 1000
    ? `${Math.round(distance)} m away`
    : `${(distance / 1000).toFixed(1)} km away`;
}

/** A zero coordinate means this facility still has no usable map position. */
export function hasFacilityCoordinates(facility: Facility): boolean {
  return facility.latitude !== 0 && facility.longitude !== 0;
}

/** Keep the gate usable even though the supplied circular boundary misses it. */
export function isWithinCampus(
  position: UserPosition | null,
  campus: Campus | null,
): boolean {
  if (!position || !campus) return false;
  return (
    distanceInMeters(position, campus) <= campus.radiusMeters ||
    distanceInMeters(position, campus.entrance) <= 80
  );
}
