import { harborMap } from './harbor.js';
import { senateSquareMap } from './senate-square.js';
import { kamppiSquareMap } from './kamppi-square.js';
import { baanaMap } from './baana.js';
import { aleksanterinkatuMap } from './aleksanterinkatu.js';
import { centralStationMap } from './central-station.js';

// Register completed maps here. Campaign order follows this list.
export const maps = [harborMap, baanaMap, kamppiSquareMap, centralStationMap, aleksanterinkatuMap, senateSquareMap];

// A direct link can start in a district without changing the normal campaign.
export function mapOrder(startId) {
  const index = maps.findIndex(map => map.id === (startId === 'esplanadi' ? 'aleksanterinkatu' : startId));
  return index > 0 ? [...maps.slice(index), ...maps.slice(0, index)] : [...maps];
}
