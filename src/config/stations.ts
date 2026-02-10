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
    id: 'test-barboncino',
    name: 'Vasca Barboncino',
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
    id: 'test-akita',
    name: 'Vasca Akita',
    location: 'Camping del Sole',
    address: 'Via Roma 123, Milano',
    lat: 45.4650,
    lng: 9.1910,
    status: 'available',
    pricePerSession: 2.00,
    durationMinutes: 10,
    currency: '€',
    stripePriceId: 'price_1SahdbGzJdGfXoSntBByabU6',
  },
  {
    id: 'test-husky',
    name: 'Vasca Husky',
    location: 'Parco Centrale',
    address: 'Via Verdi 45, Milano',
    lat: 45.4700,
    lng: 9.1850,
    status: 'available',
    pricePerSession: 3.00,
    durationMinutes: 15,
    currency: '€',
    stripePriceId: 'price_1SahdbGzJdGfXoSntBByabU6',
  },
  {
    id: 'test-bracco',
    name: 'Doccia Bracco',
    location: 'Centro Commerciale Nord',
    address: 'Via Milano 78, Monza',
    lat: 45.5845,
    lng: 9.2744,
    status: 'available',
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