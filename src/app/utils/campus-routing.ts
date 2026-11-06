/** Finds a route along mapped campus footways and service roads. */
import type { CampusPaths, CampusRoute, UserPosition } from '../models/facility.model';
import { distanceInMeters } from './geo';

interface Snap {
  a: number;
  b: number;
  point: UserPosition;
  distance: number;
  fraction: number;
}
type Edge = { to: number; length: number };

function point(pair: [number, number]): UserPosition {
  return { latitude: pair[0], longitude: pair[1] };
}

function snapToSegment(
  position: UserPosition,
  a: UserPosition,
  b: UserPosition,
  ai: number,
  bi: number,
): Snap {
  const latitudeScale = 111_195;
  const longitudeScale = 107_200;
  const dx = (b.longitude - a.longitude) * longitudeScale;
  const dy = (b.latitude - a.latitude) * latitudeScale;
  const x = (position.longitude - a.longitude) * longitudeScale;
  const y = (position.latitude - a.latitude) * latitudeScale;
  const fraction = Math.max(0, Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy || 1)));
  const projected = {
    latitude: a.latitude + fraction * (b.latitude - a.latitude),
    longitude: a.longitude + fraction * (b.longitude - a.longitude),
  };
  return {
    a: ai,
    b: bi,
    point: projected,
    distance: distanceInMeters(position, projected),
    fraction,
  };
}

export function findCampusRoute(
  from: UserPosition,
  destination: UserPosition,
  entrance: UserPosition,
  paths: CampusPaths | null,
): CampusRoute | null {
  if (!paths?.nodes.length || !paths.edges.length) return null;
  const nodes = paths.nodes.map(point);
  const adjacency: Edge[][] = nodes.map(() => []);
  for (const [a, b] of paths.edges) {
    if (!nodes[a] || !nodes[b]) continue;
    const length = distanceInMeters(nodes[a], nodes[b]);
    adjacency[a].push({ to: b, length });
    adjacency[b].push({ to: a, length });
  }

  // The extract also contains nearby streets. Keep the connected campus network
  // reached from the entrance so a route never jumps between disconnected ways.
  const entranceEdge = paths.edges
    .map(([a, b]) => snapToSegment(entrance, nodes[a], nodes[b], a, b))
    .sort((a, b) => a.distance - b.distance)[0];
  const reachable = new Set<number>([entranceEdge.a]);
  const queue = [entranceEdge.a];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of adjacency[queue[i]]) {
      if (reachable.has(edge.to)) continue;
      reachable.add(edge.to);
      queue.push(edge.to);
    }
  }
  const campusEdges = paths.edges.filter(
    ([a, b]) => reachable.has(a) && reachable.has(b),
  );
  const nearest = (position: UserPosition) =>
    campusEdges
      .map(([a, b]) => snapToSegment(position, nodes[a], nodes[b], a, b))
      .sort((a, b) => a.distance - b.distance)[0];
  const start = nearest(from);
  const end = nearest(destination);
  if (!start || !end || start.distance > 100 || end.distance > 100) return null;

  const startIndex = nodes.length;
  const endIndex = startIndex + 1;
  adjacency.push([], []);
  nodes.push(start.point, end.point);
  const connect = (a: number, b: number, length: number) => {
    adjacency[a].push({ to: b, length });
    adjacency[b].push({ to: a, length });
  };
  connect(startIndex, start.a, distanceInMeters(start.point, nodes[start.a]));
  connect(startIndex, start.b, distanceInMeters(start.point, nodes[start.b]));
  connect(endIndex, end.a, distanceInMeters(end.point, nodes[end.a]));
  connect(endIndex, end.b, distanceInMeters(end.point, nodes[end.b]));
  if (
    (start.a === end.a && start.b === end.b) ||
    (start.a === end.b && start.b === end.a)
  ) {
    connect(startIndex, endIndex, distanceInMeters(start.point, end.point));
  }

  const distances = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
  distances[startIndex] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && (current < 0 || distances[i] < distances[current]))
        current = i;
    }
    if (current < 0 || distances[current] === Infinity || current === endIndex) break;
    visited.add(current);
    for (const edge of adjacency[current]) {
      const nextDistance = distances[current] + edge.length;
      if (nextDistance < distances[edge.to]) {
        distances[edge.to] = nextDistance;
        previous[edge.to] = current;
      }
    }
  }
  if (distances[endIndex] === Infinity) return null;

  const indices: number[] = [];
  for (let current = endIndex; current !== -1; current = previous[current])
    indices.push(current);
  indices.reverse();
  return {
    points: [from, ...indices.map((index) => nodes[index]), destination],
    distanceMeters: start.distance + distances[endIndex] + end.distance,
    approachMeters: end.distance,
  };
}
