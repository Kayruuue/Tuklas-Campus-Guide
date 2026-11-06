/** Convert a local OpenStreetMap XML extract into the small walking graph bundled with the app.
 * Usage: node scripts/build-campus-paths.cjs .campus.osm
 */
const fs = require('node:fs');
const path = require('node:path');
const { DOMParser } = require('@xmldom/xmldom');

const input = process.argv[2];
if (!input) throw new Error('Pass an OSM XML extract as the first argument.');
const document = new DOMParser().parseFromString(fs.readFileSync(input, 'utf8'), 'text/xml');
const sourceNodes = new Map();
for (const node of Array.from(document.getElementsByTagName('node'))) {
  sourceNodes.set(node.getAttribute('id'), [Number(node.getAttribute('lat')), Number(node.getAttribute('lon'))]);
}

const walkable = new Set(['footway', 'path', 'pedestrian', 'steps', 'service', 'residential', 'living_street', 'track', 'primary', 'secondary']);
const bounds = { south: 15.438, north: 15.452, west: 120.935, east: 120.948 };
const inside = ([lat, lon]) => lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east;
const nodes = [];
const edges = [];
const indices = new Map();
function indexFor(id) {
  if (indices.has(id)) return indices.get(id);
  const index = nodes.length;
  indices.set(id, index);
  nodes.push(sourceNodes.get(id).map((value) => Number(value.toFixed(7))));
  return index;
}

for (const way of Array.from(document.getElementsByTagName('way'))) {
  const tags = Object.fromEntries(Array.from(way.getElementsByTagName('tag')).map((tag) => [tag.getAttribute('k'), tag.getAttribute('v')]));
  if (!walkable.has(tags.highway) || tags.foot === 'no' || tags.access === 'no') continue;
  const refs = Array.from(way.getElementsByTagName('nd')).map((node) => node.getAttribute('ref'));
  for (let i = 1; i < refs.length; i++) {
    const a = sourceNodes.get(refs[i - 1]);
    const b = sourceNodes.get(refs[i]);
    if (!a || !b || (!inside(a) && !inside(b))) continue;
    edges.push([indexFor(refs[i - 1]), indexFor(refs[i])]);
  }
}

const output = path.join(__dirname, '../src/assets/data/campus-paths.json');
fs.writeFileSync(output, JSON.stringify({ source: 'OpenStreetMap paths and nearby roads', nodes, edges }));
console.log(`Wrote ${nodes.length} path points and ${edges.length} segments to ${output}`);
