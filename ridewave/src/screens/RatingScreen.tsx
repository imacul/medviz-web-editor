import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, BorderRadius } from '../theme';
import { useStore } from '../store/useStore';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Rating'>;

const COMPLIMENTS = [
  { id: '1', text: 'Great conversation', icon: '💬' },
  { id: '2', text: 'Expert navigator', icon: '🗺️' },
  { id: '3', text: 'Smooth ride', icon: '🎯' },
  { id: '4', text: 'Super clean car', icon: '✨' },
  { id: '5', text: 'Very punctual', icon: '⏱️' },
  { id: '6', text: 'Patient driver', icon: '😊' },
];

export default function RatingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { matchedDriver, currentTrip, tripHistory } = useStore();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const checkScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);
  const slideY = useSharedValue(100);
  const slideOpacity = useSharedValue(0);

  useEffect(() => {
    slideY.value = withSpring(0, { damping: 18, stiffness: 100 });
    slideOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const handleSubmit = () => {
    if (rating === 0) return;
    checkScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    confettiOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1500, withTiming(0, { duration: 500 })),
    );
    setSubmitted(true);

    setTimeout(() => {
      navigation.navigate('Main');
    }, 2500);
  };

  const toggleCompliment = (id: string) => {
    setSelectedCompliments((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const trip = tripHistory[0];
  const fare = trip?.fare || currentTrip?.fare || 0;
  const distance = trip?.distance || currentTrip?.distance || 0;
  const duration = trip?.duration || currentTrip?.duration || 0;

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: slideOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (submitted) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#0A0A0F', '#0A2E1A', '#0A0A0F']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.successContainer}>
          <Animated.View style={checkStyle}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.successCheck}
            >
              <Text style={styles.successCheckText}>✓</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.Text entering={FadeIn.delay(300)} style={styles.successTitle}>
            Thanks for the feedback!
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(500)} style={styles.successSubtitle}>
            Your rating helps make RideWave better for everyone
          </Animated.Text>

          {/* Stars display */}
          <Animated.View entering={FadeInDown.delay(700)} style={styles.starsDisplay}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text
                key={i}
                style={[styles.starDisplay, i <= rating && styles.starDisplayFilled]}
              >
                ★
              </Text>
            ))}
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#12121A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip summary */}
        <Animated.View style={[styles.tripSummary, slideStyle]}>
          <LinearGradient
            colors={[Colors.surface, Colors.surfaceElevated]}
            style={styles.tripSummaryGradient}
          >
            {/* Header */}
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryEmoji}>🏁</Text>
              <View>
                <Text style={styles.summaryTitle}>Trip Complete!</Text>
                <Text style={styles.summarySubtitle}>
                  {destinationName()} · {duration} min
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>${fare.toFixed(2)}</Text>
                <Text style={styles.summaryStatLabel}>Total Fare</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{distance.toFixed(1)} km</Text>
                <Text style={styles.summaryStatLabel}>Distance</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{duration} min</Text>
                <Text style={styles.summaryStatLabel}>Duration</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Driver info */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <View style={styles.driverCard}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.driverAvatar}
            >
              <Text style={styles.driverAvatarText}>{matchedDriver?.avatar || 'D'}</Text>
            </LinearGradient>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{matchedDriver?.name || 'Your Driver'}</Text>
              <Text style={styles.driverVehicle}>
                {matchedDriver?.vehicle.model} · {matchedDriver?.vehicle.plate}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Rating stars */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>How was your ride?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hoveredStar || rating);
              return (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    setRating(star);
                    setHoveredStar(0);
                  }}
                  onPressIn={() => setHoveredStar(star)}
                  onPressOut={() => setHoveredStar(0)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.star, filled && styles.starFilled]}>
                    {filled ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {rating > 0 && (
            <Animated.Text entering={ZoomIn.springify()} style={styles.ratingLabel}>
              {['', 'Poor 😞', 'Fair 😐', 'Good 😊', 'Great 😃', 'Excellent! 🤩'][rating]}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Compliments */}
        {rating >= 4 && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <Text style={styles.sectionTitle}>What did you love? ✨</Text>
            <View style={styles.complimentsGrid}>
              {COMPLIMENTS.map((item) => {
                const isSelected = selectedCompliments.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.complimentChip, isSelected && styles.complimentChipSelected]}
                    onPress={() => toggleCompliment(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.complimentIcon}>{item.icon}</Text>
                    <Text style={[styles.complimentText, isSelected && styles.complimentTextSelected]}>
                      {item.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Comment */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Leave a comment (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us more about your experience..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={rating === 0}
          >
            <LinearGradient
              colors={rating > 0 ? [Colors.primary, Colors.primaryDark] : [Colors.surfaceElevated, Colors.surfaceElevated]}
              style={styles.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.submitBtnText, rating === 0 && styles.submitBtnTextDisabled]}>
                Submit Rating
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipRatingBtn}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.skipRatingText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  function destinationName() {
    return trip?.destination?.name || currentTrip?.destination?.name || 'Destination';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  tripSummary: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripSummaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  summaryEmoji: {
    fontSize: 40,
  },
  summaryTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  summaryStats: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: 14,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  star: {
    fontSize: 44,
    color: Colors.border,
  },
  starFilled: {
    color: '#FBBF24',
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  complimentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  complimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  complimentChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  complimentIcon: {
    fontSize: 14,
  },
  complimentText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  complimentTextSelected: {
    color: Colors.primary,
  },
  commentInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    minHeight: 90,
  },
  submitBtn: {
    padding: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnText: {
    color: Colors.textInverse,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  submitBtnTextDisabled: {
    color: Colors.textMuted,
  },
  skipRatingBtn: {
    alignItems: 'center',
    padding: 16,
  },
  skipRatingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  successCheck: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  successCheckText: {
    fontSize: 48,
    color: '#000',
    fontWeight: FontWeight.bold,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.6,
  },
  starsDisplay: {
    flexDirection: 'row',
    gap: 8,
  },
  starDisplay: {
    fontSize: 36,
    color: Colors.border,
  },
  starDisplayFilled: {
    color: '#FBBF24',
  },
});
