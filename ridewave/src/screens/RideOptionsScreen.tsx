import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { useStore, RIDE_OPTIONS, RideOption, RideType } from '../store/useStore';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'RideOptions'>;

const RIDE_TYPE_COLORS: Record<RideType, string> = {
  basic: Colors.primary,
  comfort: Colors.accent,
  premium: '#FBBF24',
  xl: Colors.error,
};

function calculateFare(option: RideOption, distanceKm: number = 5.2): number {
  return option.basePrice + option.pricePerKm * distanceKm;
}

export default function RideOptionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { pickupLocation, destinationLocation, selectedRideType, setSelectedRideType, setTripStatus } = useStore();
  const [selected, setSelected] = useState<RideType>(selectedRideType);

  const btnScale = useSharedValue(1);
  const sheetY = useSharedValue(300);

  useEffect(() => {
    sheetY.value = withSpring(0, { damping: 20, stiffness: 100 });
  }, []);

  const handleConfirm = () => {
    btnScale.value = withSpring(0.96, {}, () => {
      btnScale.value = withSpring(1);
    });
    setSelectedRideType(selected);
    setTripStatus('searching');
    navigation.navigate('Matching');
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const selectedOption = RIDE_OPTIONS.find((o) => o.id === selected)!;
  const fare = calculateFare(selectedOption);
  const color = RIDE_TYPE_COLORS[selected];

  const mapRegion = {
    latitude: (37.7749 + 37.8080) / 2,
    longitude: (-122.4194 + -122.4177) / 2,
    latitudeDelta: 0.07,
    longitudeDelta: 0.07,
  };

  const routeCoords = [
    { latitude: 37.7749, longitude: -122.4194 },
    { latitude: 37.7800, longitude: -122.4150 },
    { latitude: 37.7850, longitude: -122.4120 },
    { latitude: 37.7900, longitude: -122.4100 },
    { latitude: 37.8080, longitude: -122.4177 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Map background */}
      <MapView
        style={[StyleSheet.absoluteFill, { height: height * 0.45 }]}
        provider={PROVIDER_DEFAULT}
        region={mapRegion}
        customMapStyle={DARK_MAP_STYLE}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
      >
        <Polyline
          coordinates={routeCoords}
          strokeColor={color}
          strokeWidth={4}
          lineDashPattern={[1, 0]}
        />
        <Marker coordinate={{ latitude: 37.7749, longitude: -122.4194}} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.mapPinFrom, { borderColor: Colors.primary }]}>
            <View style={[styles.mapPinInner, { backgroundColor: Colors.primary }]} />
          </View>
        </Marker>
        <Marker coordinate={{ latitude: 37.8080, longitude: -122.4177}} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.mapPinTo}>
            <Text style={{ fontSize: 24 }}>📍</Text>
          </View>
        </Marker>
      </MapView>

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(10,10,15,0.6)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 5 }}
        pointerEvents="none"
      />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 16 }]}
        onPress={() => navigation.goBack()}
      >
        <BlurView intensity={70} tint="dark" style={styles.backBtnBlur}>
          <Text style={styles.backBtnText}>← Back</Text>
        </BlurView>
      </TouchableOpacity>

      {/* Bottom sheet */}
      <Animated.View style={[styles.bottomSheet, sheetStyle]}>
        <BlurView intensity={95} tint="dark" style={styles.sheetBlur}>
          <View style={styles.handle} />

          {/* Route info */}
          <View style={styles.routeInfo}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {pickupLocation?.name || 'Your Location'}
              </Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, styles.routeDotSquare]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {destinationLocation?.name || 'Destination'}
              </Text>
            </View>
          </View>

          {/* Trip stats */}
          <View style={styles.tripStats}>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>5.2 km</Text>
              <Text style={styles.tripStatLabel}>Distance</Text>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>~18 min</Text>
              <Text style={styles.tripStatLabel}>Duration</Text>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStat}>
              <Text style={[styles.tripStatValue, { color: color }]}>
                ${fare.toFixed(2)}
              </Text>
              <Text style={styles.tripStatLabel}>Estimated</Text>
            </View>
          </View>

          {/* Ride options */}
          <Text style={styles.sectionTitle}>Choose Your Ride</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.optionsList}
          >
            {RIDE_OPTIONS.map((option, i) => {
              const isSelected = selected === option.id;
              const optionColor = RIDE_TYPE_COLORS[option.id];
              const optionFare = calculateFare(option);

              return (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(i * 80).springify()}
                >
                  <TouchableOpacity
                    style={[
                      styles.rideOption,
                      isSelected && {
                        borderColor: optionColor,
                        backgroundColor: optionColor + '15',
                      },
                    ]}
                    onPress={() => setSelected(option.id)}
                    activeOpacity={0.85}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={[optionColor + '20', optionColor + '05']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    )}

                    <View style={[styles.rideOptionIcon, isSelected && { borderColor: optionColor }]}>
                      <Text style={styles.rideOptionEmoji}>{option.icon}</Text>
                    </View>

                    <View style={styles.rideOptionInfo}>
                      <View style={styles.rideOptionHeader}>
                        <Text style={styles.rideOptionName}>{option.name}</Text>
                        {isSelected && (
                          <View style={[styles.selectedBadge, { backgroundColor: optionColor }]}>
                            <Text style={styles.selectedBadgeText}>Selected ✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rideOptionDesc}>{option.description}</Text>
                      <View style={styles.rideOptionMeta}>
                        <Text style={styles.rideOptionEta}>⏱ {option.eta} min away</Text>
                        <Text style={styles.rideOptionCapacity}>👥 {option.capacity} seats</Text>
                      </View>
                    </View>

                    <View style={styles.rideOptionPrice}>
                      <Text style={[styles.rideOptionFare, isSelected && { color: optionColor }]}>
                        ${optionFare.toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Confirm button */}
          <Animated.View style={[btnStyle, { paddingHorizontal: 0, marginTop: 16 }]}>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.9}>
              <LinearGradient
                colors={[color, color + 'CC']}
                style={styles.confirmBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.confirmBtnText}>
                  Confirm {selectedOption.name}
                </Text>
                <Text style={styles.confirmBtnPrice}>${fare.toFixed(2)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Payment method */}
          <TouchableOpacity style={styles.paymentRow}>
            <Text style={styles.paymentIcon}>💳</Text>
            <Text style={styles.paymentText}>•••• 4242</Text>
            <Text style={styles.paymentArrow}>›</Text>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnBlur: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  mapPinFrom: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  mapPinInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapPinTo: {
    alignItems: 'center',
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
    maxHeight: height * 0.65,
  },
  sheetBlur: {
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  routeDotSquare: {
    backgroundColor: Colors.error,
    borderRadius: 2,
  },
  routeDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  routeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  tripStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripStat: {
    flex: 1,
    alignItems: 'center',
  },
  tripStatValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tripStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  optionsList: {
    maxHeight: 240,
  },
  rideOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rideOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rideOptionEmoji: {
    fontSize: 24,
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  rideOptionName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  selectedBadgeText: {
    fontSize: FontSize.xs,
    color: '#000',
    fontWeight: FontWeight.bold,
  },
  rideOptionDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  rideOptionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  rideOptionEta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  rideOptionCapacity: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  rideOptionPrice: {
    marginLeft: 8,
  },
  rideOptionFare: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  confirmBtn: {
    padding: 18,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  confirmBtnText: {
    color: '#000',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    flex: 1,
    textAlign: 'center',
  },
  confirmBtnPrice: {
    color: '#000',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  paymentIcon: {
    fontSize: 16,
  },
  paymentText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  paymentArrow: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];
