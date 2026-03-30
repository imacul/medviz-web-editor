import { create } from 'zustand';

export type RideType = 'basic' | 'comfort' | 'premium' | 'xl';
export type TripStatus = 'idle' | 'searching' | 'matched' | 'arriving' | 'ontrip' | 'completed';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  totalRides: number;
  avatar: string;
  vehicle: {
    model: string;
    color: string;
    plate: string;
  };
  eta: number; // minutes
  distance: number; // km
  location: { latitude: number; longitude: number };
}

export interface RideOption {
  id: RideType;
  name: string;
  description: string;
  icon: string;
  basePrice: number;
  pricePerKm: number;
  eta: number; // minutes away
  capacity: number;
}

export interface Trip {
  id: string;
  driver: Driver;
  pickup: Location;
  destination: Location;
  rideType: RideType;
  fare: number;
  distance: number;
  duration: number; // minutes
  status: TripStatus;
  startTime?: Date;
  endTime?: Date;
  rating?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  totalTrips: number;
  paymentMethod: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  hasCompletedOnboarding: boolean;

  // Map / location
  userLocation: Location | null;
  pickupLocation: Location | null;
  destinationLocation: Location | null;

  // Ride booking flow
  selectedRideType: RideType;
  tripStatus: TripStatus;
  currentTrip: Trip | null;
  matchedDriver: Driver | null;

  // Trip history
  tripHistory: Trip[];

  // UI state
  isLoading: boolean;

  // Actions
  setAuthenticated: (auth: boolean) => void;
  setUser: (user: User | null) => void;
  setHasCompletedOnboarding: (v: boolean) => void;
  setUserLocation: (loc: Location | null) => void;
  setPickupLocation: (loc: Location | null) => void;
  setDestinationLocation: (loc: Location | null) => void;
  setSelectedRideType: (type: RideType) => void;
  setTripStatus: (status: TripStatus) => void;
  setCurrentTrip: (trip: Trip | null) => void;
  setMatchedDriver: (driver: Driver | null) => void;
  addTripToHistory: (trip: Trip) => void;
  setIsLoading: (loading: boolean) => void;
  resetRideFlow: () => void;
}

// Mock data
const MOCK_USER: User = {
  id: 'user_001',
  name: 'Alex Morgan',
  email: 'alex.morgan@email.com',
  phone: '+1 (555) 234-5678',
  avatar: 'AM',
  rating: 4.9,
  totalTrips: 127,
  paymentMethod: '•••• 4242',
};

const MOCK_TRIP_HISTORY: Trip[] = [
  {
    id: 'trip_001',
    driver: {
      id: 'drv_001',
      name: 'Carlos M.',
      rating: 4.95,
      totalRides: 2341,
      avatar: 'CM',
      vehicle: { model: 'Tesla Model 3', color: 'Midnight Black', plate: 'RW-4291' },
      eta: 0,
      distance: 0,
      location: { latitude: 37.7749, longitude: -122.4194 },
    },
    pickup: { latitude: 37.7749, longitude: -122.4194, address: '123 Market St', name: 'Downtown' },
    destination: { latitude: 37.7849, longitude: -122.4094, address: '456 Oak Ave', name: 'Mission District' },
    rideType: 'premium',
    fare: 24.50,
    distance: 5.2,
    duration: 18,
    status: 'completed',
    startTime: new Date(Date.now() - 86400000),
    endTime: new Date(Date.now() - 86400000 + 1080000),
    rating: 5,
  },
  {
    id: 'trip_002',
    driver: {
      id: 'drv_002',
      name: 'Priya S.',
      rating: 4.88,
      totalRides: 1567,
      avatar: 'PS',
      vehicle: { model: 'Honda Civic', color: 'Pearl White', plate: 'RW-8810' },
      eta: 0,
      distance: 0,
      location: { latitude: 37.7649, longitude: -122.4294 },
    },
    pickup: { latitude: 37.7649, longitude: -122.4294, address: '789 Valencia St', name: 'Valencia' },
    destination: { latitude: 37.7549, longitude: -122.4394, address: '321 Castro St', name: 'The Castro' },
    rideType: 'basic',
    fare: 12.80,
    distance: 2.8,
    duration: 11,
    status: 'completed',
    startTime: new Date(Date.now() - 172800000),
    endTime: new Date(Date.now() - 172800000 + 660000),
    rating: 4,
  },
];

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  user: null,
  hasCompletedOnboarding: false,
  userLocation: null,
  pickupLocation: null,
  destinationLocation: null,
  selectedRideType: 'basic',
  tripStatus: 'idle',
  currentTrip: null,
  matchedDriver: null,
  tripHistory: MOCK_TRIP_HISTORY,
  isLoading: false,

  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setUser: (user) => set({ user }),
  setHasCompletedOnboarding: (v) => set({ hasCompletedOnboarding: v }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  setPickupLocation: (loc) => set({ pickupLocation: loc }),
  setDestinationLocation: (loc) => set({ destinationLocation: loc }),
  setSelectedRideType: (type) => set({ selectedRideType: type }),
  setTripStatus: (status) => set({ tripStatus: status }),
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setMatchedDriver: (driver) => set({ matchedDriver: driver }),
  addTripToHistory: (trip) =>
    set((state) => ({ tripHistory: [trip, ...state.tripHistory] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  resetRideFlow: () =>
    set({
      pickupLocation: null,
      destinationLocation: null,
      selectedRideType: 'basic',
      tripStatus: 'idle',
      currentTrip: null,
      matchedDriver: null,
    }),
}));

// Mock drivers for matching
export const MOCK_DRIVERS: Driver[] = [
  {
    id: 'drv_001',
    name: 'Carlos Martinez',
    rating: 4.95,
    totalRides: 2341,
    avatar: 'CM',
    vehicle: { model: 'Tesla Model 3', color: 'Midnight Black', plate: 'RW-4291' },
    eta: 3,
    distance: 0.8,
    location: { latitude: 37.7759, longitude: -122.4184 },
  },
  {
    id: 'drv_002',
    name: 'Priya Sharma',
    rating: 4.88,
    totalRides: 1567,
    avatar: 'PS',
    vehicle: { model: 'Honda Civic', color: 'Pearl White', plate: 'RW-8810' },
    eta: 5,
    distance: 1.2,
    location: { latitude: 37.7729, longitude: -122.4214 },
  },
  {
    id: 'drv_003',
    name: 'James Wilson',
    rating: 4.92,
    totalRides: 3102,
    avatar: 'JW',
    vehicle: { model: 'BMW 5 Series', color: 'Alpine White', plate: 'RW-2024' },
    eta: 7,
    distance: 1.8,
    location: { latitude: 37.7769, longitude: -122.4164 },
  },
];

export const RIDE_OPTIONS: RideOption[] = [
  {
    id: 'basic',
    name: 'RideWave',
    description: 'Affordable, everyday rides',
    icon: '🚗',
    basePrice: 2.50,
    pricePerKm: 1.20,
    eta: 4,
    capacity: 4,
  },
  {
    id: 'comfort',
    name: 'Comfort',
    description: 'Newer cars, extra legroom',
    icon: '🚙',
    basePrice: 4.00,
    pricePerKm: 1.80,
    eta: 6,
    capacity: 4,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Luxury vehicles, top drivers',
    icon: '✨',
    basePrice: 8.00,
    pricePerKm: 2.80,
    eta: 8,
    capacity: 4,
  },
  {
    id: 'xl',
    name: 'RideWave XL',
    description: 'SUVs for groups up to 6',
    icon: '🚐',
    basePrice: 5.00,
    pricePerKm: 2.00,
    eta: 10,
    capacity: 6,
  },
];

export const getMockUser = () => MOCK_USER;
