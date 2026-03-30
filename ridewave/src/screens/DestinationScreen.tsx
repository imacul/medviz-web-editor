import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../theme';
import { useStore, Location } from '../store/useStore';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Destination'>;

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category: string;
  icon: string;
  distance?: string;
  latitude: number;
  longitude: number;
}

const MOCK_RESULTS: SearchResult[] = [
  { id: '1', name: 'San Francisco Airport', address: 'San Francisco, CA 94128', category: 'Airport', icon: '✈️', distance: '12.4 mi', latitude: 37.6213, longitude: -122.379 },
  { id: '2', name: 'Union Square', address: '333 Post St, San Francisco', category: 'Shopping', icon: '🛍️', distance: '0.8 mi', latitude: 37.7879, longitude: -122.4074 },
  { id: '3', name: 'Golden Gate Park', address: 'San Francisco, CA 94117', category: 'Park', icon: '🌳', distance: '2.1 mi', latitude: 37.7694, longitude: -122.4862 },
  { id: '4', name: 'Fisherman\'s Wharf', address: 'Beach St & The Embarcadero', category: 'Tourist Spot', icon: '🦀', distance: '1.5 mi', latitude: 37.8080, longitude: -122.4177 },
  { id: '5', name: 'Oracle Park', address: '24 Willie Mays Plaza, SF', category: 'Stadium', icon: '⚾', distance: '1.2 mi', latitude: 37.7786, longitude: -122.3893 },
  { id: '6', name: 'Caltrain Station', address: '4th & King St, San Francisco', category: 'Transit', icon: '🚂', distance: '1.0 mi', latitude: 37.7764, longitude: -122.3941 },
];

const RECENT_SEARCHES: SearchResult[] = [
  { id: 'r1', name: 'Home', address: '123 Oak Street, San Francisco', category: 'Saved', icon: '🏠', latitude: 37.7749, longitude: -122.4294 },
  { id: 'r2', name: 'Work', address: '456 Market St, San Francisco', category: 'Saved', icon: '💼', latitude: 37.7946, longitude: -122.3999 },
  { id: 'r3', name: 'Whole Foods', address: '1765 California St, SF', category: 'Recent', icon: '🛒', latitude: 37.7912, longitude: -122.4262 },
];

export default function DestinationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setPickupLocation, setDestinationLocation, userLocation } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>(RECENT_SEARCHES);
  const [isSearching, setIsSearching] = useState(false);

  const containerY = useSharedValue(100);
  const containerOpacity = useSharedValue(0);

  useEffect(() => {
    containerY.value = withSpring(0, { damping: 18, stiffness: 120 });
    containerOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      setIsSearching(true);
      const timeout = setTimeout(() => {
        const filtered = MOCK_RESULTS.filter(
          (r) =>
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.address.toLowerCase().includes(query.toLowerCase()),
        );
        setResults(filtered.length > 0 ? filtered : MOCK_RESULTS);
        setIsSearching(false);
      }, 400);
      return () => clearTimeout(timeout);
    } else {
      setResults(RECENT_SEARCHES);
      setIsSearching(false);
    }
  }, [query]);

  const handleSelectDestination = (place: SearchResult) => {
    Keyboard.dismiss();

    // Set pickup as current location
    setPickupLocation({
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'Current Location',
      name: 'Your Location',
    });

    // Set destination
    setDestinationLocation({
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      name: place.name,
    });

    navigation.navigate('RideOptions');
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerY.value }],
  }));

  const renderResult = ({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => handleSelectDestination(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultIcon}>
          <Text style={{ fontSize: 20 }}>{item.icon}</Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName}>{item.name}</Text>
          <Text style={styles.resultAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        <View style={styles.resultRight}>
          {item.distance && (
            <Text style={styles.resultDistance}>{item.distance}</Text>
          )}
          <View style={[styles.resultCategory]}>
            <Text style={styles.resultCategoryText}>{item.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#12121A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <BlurView intensity={60} tint="dark" style={styles.closeBtnBlur}>
            <Text style={styles.closeBtnText}>✕</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where to?</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Route inputs */}
      <Animated.View style={[styles.inputsCard, containerStyle]}>
        <BlurView intensity={40} tint="dark" style={styles.inputsBlur}>
          {/* From */}
          <View style={styles.inputRow}>
            <View style={styles.routeDotFrom} />
            <View style={styles.inputInner}>
              <Text style={styles.inputLabel}>FROM</Text>
              <Text style={styles.inputValue}>📍 Current Location</Text>
            </View>
          </View>

          {/* Divider with dashes */}
          <View style={styles.routeLine}>
            <View style={styles.routeLineDot} />
            <View style={styles.routeLineDot} />
            <View style={styles.routeLineDot} />
          </View>

          {/* To */}
          <View style={styles.inputRow}>
            <View style={styles.routeDotTo} />
            <View style={[styles.inputInner, { flex: 1 }]}>
              <Text style={styles.inputLabel}>TO</Text>
              <TextInput
                style={styles.toInput}
                placeholder="Search destination..."
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
              />
            </View>
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </Animated.View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.sectionLabel}>
          {query.length > 0 ? `Results for "${query}"` : 'Recent & Saved Places'}
        </Text>

        {isSearching ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Searching... 🔍</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            }
          />
        )}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtnBlur: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  inputsCard: {
    marginHorizontal: 16,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  inputsBlur: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  routeDotFrom: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  routeDotTo: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Colors.error,
    marginRight: 12,
  },
  routeLine: {
    marginLeft: 5,
    marginVertical: 4,
    gap: 3,
  },
  routeLineDot: {
    width: 2,
    height: 4,
    borderRadius: 1,
    backgroundColor: Colors.border,
    marginLeft: 0,
  },
  inputInner: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inputValue: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  toInput: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    padding: 0,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  resultAddress: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  resultRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 12,
  },
  resultDistance: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  resultCategory: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  resultCategoryText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
});
