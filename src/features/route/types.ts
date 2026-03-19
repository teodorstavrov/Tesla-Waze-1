export interface RoutePoint {
  lat:         number
  lng:         number
  label:       string   // display name from geocoding
}

export interface Route {
  origin:      RoutePoint
  destination: RoutePoint
  coordinates: [number, number][]  // [lat, lng] pairs along the route
  distanceM:   number              // metres
  durationS:   number              // seconds
}
