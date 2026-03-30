import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../theme';
import { useStore } from '../store/useStore';

const { width, height } = Dimensions.get('window');

// San Francisco coordinates as default
const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type Props = NativeStackScreenProps<RootStackParamList, 'Main'> & {
  navigation: any;
};

const QUICK_DESTINATIONS = [
  { id: '1', name: 'Home', icon: '🏠', address: '123 Oak St' },
  { id: '2', name: 'Work', icon: '💼', address: '456 Market St' },
  { id: '3', name: 'Airport', icon: '✈️', address: 'SFO Terminal' },
  { id: '4', name: 'Gym', icon: '🏋️', address: '789 Fitness Ave' },
];

const NEARBY_PLACES = [
  { id: '1', name: 'Blue Bottle Coffee', category: 'Café', distance: '0.3 mi', icon: '☕' },
  { id: '2', name: 'Whole Foods Market', category: 'Grocery', distance: '0.5 mi', icon: '🛒' },
  { id: '3', name: 'SFO International', category: 'Airport', distance: '12 mi', icon: '✈️' },
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useStore();
  const mapRef = useRef<MapView>(null);

  // Animations
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-20);
  const searchBarY = useSharedValue(50);
  const searchBarOpacity = useSharedValue(0);
  const cardY = useSharedValue(80);
  const cardOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const fabScale = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    headerY.value = withDelay(100, withSpring(0, { damping: 15 }));
    searchBarY.value = withDelay(300, withSpring(0, { damping: 15 }));
    searchBarOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    cardY.value = withDelay(500, withSpring(0, { damping: 15 }));
    cardOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    fabScale.value = withDelay(700, withSpring(1, { damping: 12 }));

    // Pulse animation for user location indicator
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1200 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200 }),
        withTiming(0.6, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const searchBarStyle = useAnimatedStyle(() => ({
    opacity: searchBarOpacity.value,
    transform: [{ translateY: searchBarY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={DEFAULT_REGION}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={false}
        showsCompass={false}
        showsTraffic={false}
        mapType="standard"
      >
        {/* Mock nearby drivers */}
        {[
          { lat: 37.776, lng: -122.418 },
          { lat: 37.772, lng: -122.422 },
          { lat: 37.778, lng: -122.415 },
          { lat: 37.770, lng: -122.416 },
        ].map((pos, i) => (
          <Marker
            key={i}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Text style={styles.driverMarkerText}>🚗</Text>
            </View>
          </Marker>
        ))}

        {/* User location marker */}
        <Marker
          coordinate={{ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.userMarkerContainer}>
            <Animated.View style={[styles.userMarkerPulse, pulseStyle]} />
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </View>
        </Marker>
      </MapView>

      {/* Top gradient overlay */}
      <LinearGradient
        colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0.7)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top }]}
        pointerEvents="none"
      />

      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerStyle]}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Rider'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn}>
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{user?.avatar || 'U'}</Text>
          </LinearGradient>
          <View style={styles.avatarBadge} />
        </TouchableOpacity>
      </Animated.View>

      {/* Search bar */}
      <Animated.View style={[styles.searchBarContainer, searchBarStyle]}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Destination')}
          activeOpacity={0.8}
        >
          <BlurView intensity={80} tint="dark" style={styles.searchBarBlur}>
            <View style={styles.searchIconContainer}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.searchIcon}
              >
                <Text style={styles.searchIconText}>📍</Text>
              </LinearGradient>
            </View>
            <Text style={styles.searchPlaceholder}>Where to?</Text>
            <View style={styles.searchRight}>
              <Text style={styles.searchRightText}>Now ▾</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.bottomSheet, cardStyle]}>
        <BlurView intensity={90} tint="dark" style={styles.bottomSheetBlur}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Quick destinations */}
          <Text style={styles.sectionTitle}>Saved Places</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickDestRow}
          >
            {QUICK_DESTINATIONS.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                style={styles.quickDestCard}
                onPress={() => navigation.navigate('Destination')}
              >
                <View style={styles.quickDestIcon}>
                  <Text style={{ fontSize: 20 }}>{dest.icon}</Text>
                </View>
                <Text style={styles.quickDestName}>{dest.name}</Text>
                <Text style={styles.quickDestAddress} numberOfLines={1}>
                  {dest.address}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Nearby places */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Nearby</Text>
          {NEARBY_PLACES.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.nearbyRow}
              onPress={() => navigation.navigate('Destination')}
            >
              <View style={styles.nearbyIcon}>
                <Text style={{ fontSize: 18 }}>{place.icon}</Text>
              </View>
              <View style={styles.nearbyInfo}>
                <Text style={styles.nearbyName}>{place.name}</Text>
                <Text style={styles.nearbyMeta}>
                  {place.category} · {place.distance}
                </Text>
              </View>
              <Text style={styles.nearbyArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </BlurView>
      </Animated.View>

      {/* Location FAB */}
      <Animated.View style={[styles.fab, fabStyle]}>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => {
            mapRef.current?.animateToRegion(DEFAULT_REGION, 500);
          }}
        >
          <BlurView intensity={80} tint="dark" style={styles.fabBlur}>
            <Text style={styles.fabIcon}>📍</Text>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  avatarBtn: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  searchBarContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
    shadowColor: '#000',
  },
  searchBarBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconText: {
    fontSize: 16,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  searchRight: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchRightText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadow.sm,
    shadowColor: Colors.primary,
  },
  driverMarkerText: {
    fontSize: 18,
  },
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
  },
  userMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    zIndex: 10,
  },
  bottomSheetBlur: {
    padding: 20,
    paddingBottom: 90,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  quickDestRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 8,
  },
  quickDestCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 14,
    width: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickDestIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickDestName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  quickDestAddress: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nearbyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nearbyInfo: {
    flex: 1,
  },
  nearbyName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  nearbyMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  nearbyArrow: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 280,
    zIndex: 20,
  },
  fabBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  fabBlur: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 20,
  },
});

// Dark map style
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];
