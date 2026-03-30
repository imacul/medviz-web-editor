import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, BorderRadius } from '../theme';
import { useStore, Trip, RideType } from '../store/useStore';

const RIDE_TYPE_COLORS: Record<RideType, string> = {
  basic: Colors.primary,
  comfort: Colors.accent,
  premium: '#FBBF24',
  xl: Colors.error,
};

const RIDE_TYPE_LABELS: Record<RideType, string> = {
  basic: 'RideWave',
  comfort: 'Comfort',
  premium: 'Premium ✨',
  xl: 'RideWave XL',
};

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const color = RIDE_TYPE_COLORS[trip.rideType];
  const label = RIDE_TYPE_LABELS[trip.rideType];

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <TouchableOpacity style={styles.tripCard} activeOpacity={0.8}>
        <LinearGradient
          colors={[Colors.surface, Colors.surfaceElevated]}
          style={styles.tripCardGradient}
        >
          {/* Header row */}
          <View style={styles.tripCardHeader}>
            <View style={[styles.rideTypeBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
              <Text style={[styles.rideTypeText, { color }]}>{label}</Text>
            </View>
            <Text style={styles.tripDate}>{formatDate(trip.startTime)}</Text>
          </View>

          {/* Route */}
          <View style={styles.routeContainer}>
            <View style={styles.routeLeft}>
              <View style={[styles.routeDotSmall, { backgroundColor: Colors.primary }]} />
              <View style={styles.routeVertLine} />
              <View style={[styles.routeDotSmall, styles.routeDotSquare, { backgroundColor: Colors.error }]} />
            </View>
            <View style={styles.routeAddresses}>
              <Text style={styles.routeFrom} numberOfLines={1}>
                {trip.pickup.name || trip.pickup.address}
              </Text>
              <View style={{ height: 12 }} />
              <Text style={styles.routeTo} numberOfLines={1}>
                {trip.destination.name || trip.destination.address}
              </Text>
            </View>
          </View>

          {/* Stats footer */}
          <View style={styles.tripStats}>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>${trip.fare.toFixed(2)}</Text>
            </View>
            <View style={styles.tripStatSep}>
              <Text style={styles.tripStatSepText}>·</Text>
            </View>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{trip.distance} km</Text>
            </View>
            <View style={styles.tripStatSep}>
              <Text style={styles.tripStatSepText}>·</Text>
            </View>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{trip.duration} min</Text>
            </View>
            <View style={styles.ratingBadge}>
              {trip.rating ? (
                <>
                  <Text style={styles.ratingBadgeStar}>★</Text>
                  <Text style={styles.ratingBadgeText}>{trip.rating}</Text>
                </>
              ) : (
                <Text style={styles.ratingBadgeText}>Rate</Text>
              )}
            </View>
          </View>

          {/* Driver info */}
          <View style={styles.driverMiniRow}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.driverMiniAvatar}
            >
              <Text style={styles.driverMiniAvatarText}>{trip.driver.avatar}</Text>
            </LinearGradient>
            <Text style={styles.driverMiniName}>{trip.driver.name}</Text>
            <Text style={styles.driverMiniVehicle}>{trip.driver.vehicle.model}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { tripHistory } = useStore();

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-20);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
    headerY.value = withSpring(0, { damping: 15 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const totalSpent = tripHistory.reduce((sum, t) => sum + t.fare, 0);
  const totalTrips = tripHistory.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#12121A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <View>
          <Text style={styles.screenTitle}>Your Trips</Text>
          <Text style={styles.screenSubtitle}>{totalTrips} total rides</Text>
        </View>
        <View style={styles.spentBadge}>
          <Text style={styles.spentLabel}>Total spent</Text>
          <Text style={styles.spentValue}>${totalSpent.toFixed(2)}</Text>
        </View>
      </Animated.View>

      {/* Filter chips */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.filterRow}>
        {['All', 'Completed', 'Premium', 'Rated'].map((filter, i) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, i === 0 && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, i === 0 && styles.filterChipTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Trip list */}
      <FlatList
        data={tripHistory}
        renderItem={({ item, index }) => <TripCard trip={item} index={index} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Your ride history will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  spentBadge: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: BorderRadius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  spentLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  spentValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tripCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  tripCardGradient: {
    padding: 16,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  rideTypeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  tripDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  routeLeft: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  routeDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeDotSquare: {
    borderRadius: 2,
  },
  routeVertLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  routeAddresses: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeFrom: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  routeTo: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  tripStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginBottom: 12,
  },
  tripStat: {
    flex: 1,
    alignItems: 'center',
  },
  tripStatValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  tripStatSep: {
    paddingHorizontal: 4,
  },
  tripStatSepText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FBBF2420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FBBF2440',
  },
  ratingBadgeStar: {
    fontSize: 11,
    color: '#FBBF24',
  },
  ratingBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#FBBF24',
  },
  driverMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverMiniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMiniAvatarText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  driverMiniName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  driverMiniVehicle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
