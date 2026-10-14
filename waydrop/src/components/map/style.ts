/** Light, muted Google Maps style: grey-blue land, white roads, no business clutter. */
export const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EDF0F3' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F8FAFC' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#D8EEDF' }] },
  { featureType: 'poi.school', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#E6EBF0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFE3F7' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#E2E7ED' }] },
];
