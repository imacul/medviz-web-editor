import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../theme';
import { useStore } from '../store/useStore';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

interface OnboardingSlide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradientColors: string[];
  accentColor: string;
  bgEmojis: string[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    emoji: '🗺️',
    title: 'Your city,\nyour ride',
    subtitle: 'Get a reliable ride in minutes. Track your driver in real-time, every time.',
    gradientColors: ['#0A0A0F', '#0D1A2E', '#0A0A0F'],
    accentColor: Colors.primary,
    bgEmojis: ['🚗', '🏙️', '⚡', '🛣️'],
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'Fast &\nreliable',
    subtitle: 'Match with top-rated drivers instantly. Average pickup time under 4 minutes.',
    gradientColors: ['#0A0A0F', '#1A0A2E', '#0A0A0F'],
    accentColor: Colors.accent,
    bgEmojis: ['✨', '🌟', '💫', '⭐'],
  },
  {
    id: '3',
    emoji: '🔒',
    title: 'Safe &\nsecure',
    subtitle: 'Every ride is insured. Share your trip with loved ones. Arrive safely, always.',
    gradientColors: ['#0A0A0F', '#0A1A0F', '#0A0A0F'],
    accentColor: '#00E5B3',
    bgEmojis: ['🛡️', '💚', '✅', '🔐'],
  },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlide>);

export default function OnboardingScreen({ navigation }: Props) {
  const { setHasCompletedOnboarding } = useStore();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      setHasCompletedOnboarding(true);
      navigation.replace('Auth');
    }
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const renderSlide = ({ item, index }: ListRenderItemInfo<OnboardingSlide>) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const emojiStyle = useAnimatedStyle(() => {
      const scale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
      const translateY = interpolate(scrollX.value, inputRange, [40, 0, 40], Extrapolation.CLAMP);
      return { transform: [{ scale }, { translateY }], opacity };
    });

    const textStyle = useAnimatedStyle(() => {
      const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
      const translateX = interpolate(scrollX.value, inputRange, [60, 0, -60], Extrapolation.CLAMP);
      return { opacity, transform: [{ translateX }] };
    });

    return (
      <View style={styles.slide}>
        <LinearGradient
          colors={item.gradientColors as [string, string, string]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Floating background emojis */}
        <View style={styles.bgEmojiContainer}>
          {item.bgEmojis.map((emoji, i) => (
            <Text
              key={i}
              style={[
                styles.bgEmoji,
                {
                  top: `${15 + i * 20}%` as any,
                  left: `${(i % 2 === 0 ? 10 : 70) + (i * 5)}%` as any,
                  opacity: 0.06,
                  fontSize: 60 + i * 10,
                },
              ]}
            >
              {emoji}
            </Text>
          ))}
        </View>

        {/* Main emoji */}
        <Animated.View style={[styles.mainEmojiContainer, emojiStyle]}>
          <LinearGradient
            colors={[item.accentColor + '33', item.accentColor + '11']}
            style={styles.emojiGlow}
          />
          <Text style={styles.mainEmoji}>{item.emoji}</Text>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          <View style={[styles.accentLine, { backgroundColor: item.accentColor }]} />
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <AnimatedFlatList
        ref={flatListRef as any}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              const active = Math.round(scrollX.value / width) === i;
              return {
                width: withSpring(active ? 24 : 8),
                backgroundColor: withTiming(active ? Colors.primary : Colors.border),
              };
            });
            return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
          })}
        </View>

        {/* Next button */}
        <Animated.View style={buttonStyle}>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.9}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.nextButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === SLIDES.length - 1 ? "Let's Ride! 🚀" : 'Next →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Skip */}
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => {
              setHasCompletedOnboarding(true);
              navigation.replace('Auth');
            }}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
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
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgEmojiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgEmoji: {
    position: 'absolute',
    transform: [{ rotate: '-15deg' }],
  },
  mainEmojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  emojiGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  mainEmoji: {
    fontSize: 100,
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black,
    textAlign: 'center',
    lineHeight: FontSize.display * 1.2,
    marginBottom: 20,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.lg * 1.6,
    marginBottom: 20,
  },
  accentLine: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  nextButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  skipButton: {
    marginTop: 20,
    padding: 8,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
