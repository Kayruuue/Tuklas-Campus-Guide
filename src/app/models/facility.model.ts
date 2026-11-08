/** NEUST campus data models. */
export type FacilityCategory =
  | 'administration'
  | 'food_and_halls'
  | 'gym_and_sports'
  | 'student_services'
  | 'science_and_tech'
  | 'college';

export interface Campus {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  entrance: { latitude: number; longitude: number; label: string };
}
export interface Facility {
  id: number;
  mapNumber: number;
  name: string;
  category: FacilityCategory;
  description: string;
  latitude: number;
  longitude: number;
  positionSource?: 'osm' | 'official-map-estimate';
  isEntrance?: boolean;
  imagePath: string;
  openTime?: string;
  closeTime?: string;
}
export interface CampusData {
  campus: Campus;
  facilities: Facility[];
}
export interface UserPosition {
  latitude: number;
  longitude: number;
  heading?: number;
}
export interface CampusPaths {
  source: string;
  nodes: [number, number][];
  edges: [number, number][];
}
export interface CampusRoute {
  points: UserPosition[];
  distanceMeters: number;
  approachMeters: number;
}
