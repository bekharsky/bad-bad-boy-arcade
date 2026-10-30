import { harborMap } from './harbor.js';
import { senateSquareMap } from './senate-square.js';
import { kamppiSquareMap } from './kamppi-square.js';
import { baanaMap } from './baana.js';
import { esplanadiMap } from './esplanadi.js';

// Register completed maps here. Campaign order follows this list.
export const maps = [harborMap, baanaMap, kamppiSquareMap, esplanadiMap, senateSquareMap];

// A direct link can start in a district without changing the normal campaign.
export function mapOrder(startId) {
  const index = maps.findIndex(map => map.id === startId);
  return index > 0 ? [...maps.slice(index), ...maps.slice(0, index)] : [...maps];
}
