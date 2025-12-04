// Station configuration - each station has its own ID and settings
export interface Station {
  id: string;
  name: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  pricePerSession: number;
  durationMinutes: number;
  currency: string;
  stripePriceId: string;
}

// Stations database - in production this would come from Supabase
export const stations: Station[] = [
  {
    id: 'test1',
    name: 'Doccia Bracco',
    location: 'Camping del Sole',
    address: 'Via Roma 123, Milano',
    lat: 45.4642,
    lng: 9.1900,
    status: 'available',
    pricePerSession: 1.00,
    durationMinutes: 5,
    currency: '€',
    stripePriceId: 'price_1SahdbGzJdGfXoSntBByabU6',
  },
  {
    id: 'test2',
    name: 'Doccia Luna',
    location: 'Parco Centrale',
    address: 'Via Verdi 45, Milano',
    lat: 45.4700,
    lng: 9.1850,
    status: 'available',
    pricePerSession: 2.00,
    durationMinutes: 10,
    currency: '€',
    stripePriceId: 'price_1SahdbGzJdGfXoSntBByabU6',
  },
  {
    id: 'test3',
    name: 'Doccia Stella',
    location: 'Centro Commerciale Nord',
    address: 'Via Milano 78, Monza',
    lat: 45.5845,
    lng: 9.2744,
    status: 'busy',
    pricePerSession: 1.50,
    durationMinutes: 5,
    currency: '€',
    stripePriceId: 'price_1SahdbGzJdGfXoSntBByabU6',
  },
];

export const getStationById = (id: string): Station | undefined => {
  return stations.find(station => station.id === id);
};

export const getAvailableStations = (): Station[] => {
  return stations.filter(station => station.status === 'available');
};