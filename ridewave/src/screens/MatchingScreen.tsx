import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { useStore, MOCK_DRIVERS, RIDE_OPTIONS, Trip } from '../store/useStore';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Matching'>;

type MatchingPhase = 'searching' | 'found' | 'confirmed';

export default function MatchingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    selectedRideType,
    pickupLocation,
    destinationLocation,
    setMatchedDriver,
    setCurrentTrip,
    setTripStatus,
  } = useStore();

  const [phase, setPhase] = useState<MatchingPhase>('searching');
  const [matchedIndex, setMatchedIndex] = useState(0);

  // Search animation
  const ring1Scale = useSharedValue(0.5);
  const ring1Opacity = useSharedValue(1);
  const ring2Scale = useSharedValue(0.5);
  const ring2Opacity = useSharedValue(1);
  const ring3Scale = useSharedValue(0.5);
  const ring3Opacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const carRotation = useSharedValue(0);
  const cardY = useSharedValue(300);
  const cardOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const bgColor = useSharedValue(0);

  const driver = MOCK_DRIVERS[matchedIndex];
  const rideOption = RIDE_OPTIONS.find((o) => o.id === selectedRideType)!;

  const startSearchAnimation = () => {
    // Ripple rings
    const rippleConfig = { duration: 1800, easing: Easing.out(Easing.ease) };

    ring1Scale.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, rippleConfig)),
      -1, false,
    );
    ring1Opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 1800 })),
      -1, false,
    );

    ring2Scale.value = withDelay(600, withRepeat(
      withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, rippleConfig)),
      -1, false,
    ));
    ring2Opacity.value = withDelay(600, withRepeat(
      withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 1800 })),
      -1, false,
    ));

    ring3Scale.value = withDelay(1200, withRepeat(
      withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, rippleConfig)),
      -1, false,
    ));
    ring3Opacity.value = withDelay(1200, withRepeat(
      withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 1800 })),
      -1, false,
    ));

    // Car pulse
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1, true,
    );

    // Car rotation
    carRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1, false,
    );
  };

  const showFoundAnimation = () => {
    // Stop search, show driver card
    cardY.value = withSpring(0, { damping: 18, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 400 });
  };

  const showConfirmedAnimation = () => {
    checkScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    bgColor.value = withTiming(1, { duration: 600 });

    setTimeout(() => {
      const trip: Trip = {
        id: `trip_${Date.now()}`,
        driver,
        pickup: pickupLocation || { latitude: 37.7749, longitude: -122.4194, address: 'Current Location', name: 'Your Location' },
        destination: destinationLocation || { latitude: 37.8080, longitude: -122.4177, address: 'SFO', name: 'Airport' },
        rideType: selectedRideType,
        fare: (rideOption.basePrice + rideOption.pricePerKm * 5.2),
        distance: 5.2,
        duration: 18,
        status: 'arriving',
        startTime: new Date(),
      };
      setCurrentTrip(trip);
      setMatchedDriver(driver);
      setTripStatus('arriving');
      navigation.replace('ActiveTrip');
    }, 1200);
  };

  useEffect(() => {
    startSearchAnimation();

    // Phase 1: Searching (2s)
    const foundTimer = setTimeout(() => {
      setPhase('found');
      showFoundAnimation();
    }, 2500);

    // Phase 2: Confirming (found + 2s)
    const confirmedTimer = setTimeout(() => {
      setPhase('confirmed');
      showConfirmedAnimation();
    }, 5000);

    return () => {
      clearTimeout(foundTimer);
      clearTimeout(confirmedTimer);
    };
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#1A0A2E', '#0A0F1A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top section */}
      <View style={[styles.topSection, { paddingTop: insets.top + 20 }]}>
        <Animated.Text entering={FadeIn.duration(600)} style={styles.phaseTitle}>
          {phase === 'searching' ? '🔍 Finding your driver...' : phase === 'found' ? '🎉 Driver found!' : '✅ Ride confirmed!'}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(200).duration(600)} style={styles.phaseSubtitle}>
          {phase === 'searching'
            ? 'Matching you with the best driver nearby'
            : phase === 'found'
            ? `${driver.name} is on the way`
            : 'Your driver is heading to you now'}
        </Animated.Text>
      </View>

      {/* Animation center */}
      <View style={styles.animationCenter}>
        {/* Ripple rings */}
        {phase === 'searching' && (
          <>
            <Animated.View style={[styles.ring, { width: 280, height: 280, borderRadius: 140 }, ring3Style]} />
            <Animated.View style={[styles.ring, { width: 200, height: 200, borderRadius: 100 }, ring2Style]} />
            <Animated.View style={[styles.ring, { width: 130, height: 130, borderRadius: 65 }, ring1Style]} />
          </>
        )}

        {/* Center icon */}
        <Animated.View style={[styles.centerIconContainer, pulseStyle]}>
          <LinearGradient
            colors={
              phase === 'confirmed'
                ? [Colors.primary, Colors.primaryDark]
                : [Colors.accent, Colors.accentLight]
            }
            style={styles.centerIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {phase === 'confirmed' ? (
              <Animated.Text style={[styles.centerEmoji, checkStyle]}>✓</Animated.Text>
            ) : (
              <Text style={styles.centerEmoji}>
                {phase === 'searching' ? '⚡' : driver.avatar}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Dots indicator while searching */}
        {phase === 'searching' && (
          <Animated.View entering={FadeIn} style={styles.searchingDots}>
            {[0, 1, 2].map((i) => (
              <SearchingDot key={i} delay={i * 200} />
            ))}
          </Animated.View>
        )}
      </View>

      {/* Driver card (shown when found) */}
      {phase !== 'searching' && (
        <Animated.View style={[styles.driverCardContainer, cardStyle]}>
          <BlurView intensity={85} tint="dark" style={styles.driverCard}>
            {/* Driver info */}
            <View style={styles.driverTop}>
              <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.driverAvatar}
              >
                <Text style={styles.driverAvatarText}>{driver.avatar}</Text>
              </LinearGradient>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.driverRatingRow}>
                  <Text style={styles.star}>⭐</Text>
                  <Text style={styles.driverRating}>{driver.rating.toFixed(2)}</Text>
                  <Text style={styles.driverRides}>· {driver.totalRides.toLocaleString()} rides</Text>
                </View>
              </View>
              <View style={styles.driverEta}>
                <Text style={styles.etaValue}>{driver.eta} min</Text>
                <Text style={styles.etaLabel}>away</Text>
              </View>
            </View>

            {/* Vehicle */}
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleEmoji}>🚗</Text>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleModel}>{driver.vehicle.model}</Text>
                <Text style={styles.vehicleColor}>{driver.vehicle.color}</Text>
              </View>
              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>{driver.vehicle.plate}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionEmoji}>📞</Text>
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionEmoji}>💬</Text>
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionEmoji}>📤</Text>
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* Cancel button */}
      {phase === 'searching' && (
        <Animated.View
          entering={FadeInUp.delay(1000)}
          style={[styles.cancelContainer, { paddingBottom: insets.bottom + 20 }]}
        >
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setTripStatus('idle');
              navigation.navigate('Main');
            }}
          >
            <Text style={styles.cancelText}>Cancel Search</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

function SearchingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.5, { duration: 400 })),
        -1, true,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1, true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.searchDot, style]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  phaseTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  phaseSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  animationCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  centerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.accent,
  },
  centerEmoji: {
    fontSize: 44,
    color: '#fff',
    fontWeight: FontWeight.bold,
  },
  searchingDots: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 10,
  },
  searchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  driverCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverCard: {
    padding: 20,
  },
  driverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  driverAvatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    fontSize: 14,
  },
  driverRating: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  driverRides: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  driverEta: {
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  etaValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Colors.primary,
  },
  etaLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  vehicleColor: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  plateBadge: {
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plateText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  cancelContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.error + '60',
    backgroundColor: Colors.error + '15',
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: FontWeight.semibold,
  },
});
