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
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, BorderRadius } from '../theme';
import { useStore } from '../store/useStore';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveTrip'>;

type TripPhase = 'arriving' | 'pickup' | 'ontrip' | 'nearDest';

const PHASE_CONFIG = {
  arriving: {
    title: 'Driver arriving',
    subtitle: 'Your driver is on the way',
    color: Colors.warning,
    progress: 0.1,
    icon: '🚗',
  },
  pickup: {
    title: 'Driver arrived',
    subtitle: 'Meet your driver at the pickup point',
    color: Colors.accent,
    progress: 0.25,
    icon: '📍',
  },
  ontrip: {
    title: 'En route',
    subtitle: "You're on your way!",
    color: Colors.primary,
    progress: 0.6,
    icon: '⚡',
  },
  nearDest: {
    title: 'Almost there!',
    subtitle: 'Approaching your destination',
    color: Colors.primary,
    progress: 0.9,
    icon: '🏁',
  },
};

export default function ActiveTripScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { currentTrip, matchedDriver, addTripToHistory, resetRideFlow } = useStore();
  const [phase, setPhase] = useState<TripPhase>('arriving');
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState(3);

  const progressWidth = useSharedValue(0);
  const cardY = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const driverMarkerRotation = useSharedValue(0);

  const phaseConfig = PHASE_CONFIG[phase];

  useEffect(() => {
    // Pulse animation for driver marker
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1, true,
    );

    // Simulate trip progression
    const phaseTimers = [
      setTimeout(() => {
        setPhase('pickup');
        setEta(0);
      }, 4000),
      setTimeout(() => {
        setPhase('ontrip');
        setEta(15);
      }, 7000),
      setTimeout(() => {
        setPhase('nearDest');
        setEta(2);
      }, 12000),
      setTimeout(() => {
        // Trip complete
        if (currentTrip) {
          addTripToHistory({ ...currentTrip, status: 'completed', endTime: new Date() });
        }
        resetRideFlow();
        navigation.replace('Rating');
      }, 16000),
    ];

    return () => phaseTimers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    progressWidth.value = withTiming(phaseConfig.progress, { duration: 800 });
  }, [phase]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
      if (phase === 'ontrip') {
        setEta((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolateOpacity(pulseScale.value),
  }));

  function interpolateOpacity(scale: number) {
    return 1 - (scale - 1) * 0.7;
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Driver location (simulated movement)
  const driverLat = phase === 'arriving' ? 37.776 :
    phase === 'pickup' ? 37.7749 :
    phase === 'ontrip' ? 37.782 : 37.795;
  const driverLng = phase === 'arriving' ? -122.418 :
    phase === 'pickup' ? -122.4194 :
    phase === 'ontrip' ? -122.415 : -122.42;

  const mapRegion = {
    latitude: driverLat,
    longitude: driverLng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  const routeCoords = [
    { latitude: 37.7749, longitude: -122.4194 },
    { latitude: 37.7800, longitude: -122.4150 },
    { latitude: 37.7850, longitude: -122.4120 },
    { latitude: 37.8080, longitude: -122.4177 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full-screen map */}
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        region={mapRegion}
        customMapStyle={DARK_MAP_STYLE}
        scrollEnabled={false}
      >
        <Polyline
          coordinates={routeCoords}
          strokeColor={phaseConfig.color}
          strokeWidth={4}
        />

        {/* Driver marker */}
        <Marker
          coordinate={{ latitude: driverLat, longitude: driverLng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.driverMarkerOuter, { borderColor: phaseConfig.color }]}>
            <Text style={styles.driverMarkerEmoji}>🚗</Text>
          </View>
        </Marker>

        {/* Pickup */}
        <Marker coordinate={{ latitude: 37.7749, longitude: -122.4194 }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pickupPin}>
            <View style={[styles.pickupPinInner, { backgroundColor: Colors.primary }]} />
          </View>
        </Marker>

        {/* Destination */}
        <Marker coordinate={{ latitude: 37.8080, longitude: -122.4177 }} anchor={{ x: 0.5, y: 1 }}>
          <Text style={{ fontSize: 28 }}>🏁</Text>
        </Marker>
      </MapView>

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(10,10,15,0.9)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top }]}
        pointerEvents="none"
      />

      {/* Status bar */}
      <View style={[styles.statusBar, { top: insets.top + 8 }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <BlurView intensity={80} tint="dark" style={styles.statusBlur}>
            <View style={[styles.statusDot, { backgroundColor: phaseConfig.color }]} />
            <Text style={styles.statusTitle}>{phaseConfig.title}</Text>
            <Text style={styles.statusTimer}>{formatTime(elapsed)}</Text>
          </BlurView>
        </Animated.View>
      </View>

      {/* Bottom card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
        <BlurView intensity={95} tint="dark" style={styles.bottomCardBlur}>
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: phaseConfig.color }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>Pickup</Text>
              <Text style={styles.progressLabelRight}>Destination</Text>
            </View>
          </View>

          {/* Phase info */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.phaseInfo}>
            <View style={[styles.phaseIconContainer, { backgroundColor: phaseConfig.color + '20', borderColor: phaseConfig.color + '40' }]}>
              <Text style={styles.phaseIcon}>{phaseConfig.icon}</Text>
            </View>
            <View style={styles.phaseText}>
              <Text style={[styles.phaseTitle, { color: phaseConfig.color }]}>
                {phaseConfig.title}
              </Text>
              <Text style={styles.phaseSubtitle}>{phaseConfig.subtitle}</Text>
            </View>
            {eta > 0 && (
              <View style={styles.etaBadge}>
                <Text style={styles.etaMin}>{eta}</Text>
                <Text style={styles.etaLabel}>min</Text>
              </View>
            )}
          </Animated.View>

          {/* Driver info row */}
          <View style={styles.driverRow}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.driverAvatar}
            >
              <Text style={styles.driverAvatarText}>{matchedDriver?.avatar || 'D'}</Text>
            </LinearGradient>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{matchedDriver?.name || 'Your Driver'}</Text>
              <View style={styles.driverMeta}>
                <Text style={styles.driverRating}>⭐ {matchedDriver?.rating.toFixed(2)}</Text>
                <Text style={styles.vehicleName}>{matchedDriver?.vehicle.model}</Text>
              </View>
            </View>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{matchedDriver?.vehicle.plate}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionEmoji}>📞</Text>
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionEmoji}>💬</Text>
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionEmoji}>🛡️</Text>
              <Text style={styles.actionText}>Safety</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelActionBtn]}>
              <Text style={styles.actionEmoji}>✕</Text>
              <Text style={[styles.actionText, { color: Colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
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
    height: 160,
    zIndex: 5,
  },
  statusBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  statusBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  statusTimer: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
  driverMarkerOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  driverMarkerEmoji: {
    fontSize: 20,
  },
  pickupPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPinInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomCard: {
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
  bottomCardBlur: {
    padding: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelLeft: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  progressLabelRight: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  phaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phaseIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  phaseIcon: {
    fontSize: 22,
  },
  phaseText: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  phaseSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  etaBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  etaMin: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: Colors.primary,
  },
  etaLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  driverRating: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  vehicleName: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  plateBadge: {
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
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
  cancelActionBtn: {
    borderColor: Colors.error + '40',
    backgroundColor: Colors.error + '10',
  },
  actionEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  actionText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
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
