import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight } from '../theme';
import { useStore, getMockUser } from '../store/useStore';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const ringScale1 = useSharedValue(0.3);
  const ringOpacity1 = useSharedValue(0);
  const ringScale2 = useSharedValue(0.3);
  const ringOpacity2 = useSharedValue(0);
  const ringScale3 = useSharedValue(0.3);
  const ringOpacity3 = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const { setAuthenticated, setUser, setHasCompletedOnboarding, hasCompletedOnboarding, isAuthenticated } = useStore();

  const navigateNext = () => {
    if (isAuthenticated) {
      navigation.replace('Main');
    } else if (!hasCompletedOnboarding) {
      navigation.replace('Onboarding');
    } else {
      navigation.replace('Auth');
    }
  };

  const fadeOutAndNavigate = () => {
    screenOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(navigateNext)();
    });
  };

  useEffect(() => {
    // Ring pulse animations
    ringScale1.value = withDelay(200, withSequence(
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      withTiming(1.2, { duration: 600 }),
    ));
    ringOpacity1.value = withDelay(200, withSequence(
      withTiming(0.3, { duration: 400 }),
      withTiming(0, { duration: 600 }),
    ));

    ringScale2.value = withDelay(500, withSequence(
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      withTiming(1.5, { duration: 600 }),
    ));
    ringOpacity2.value = withDelay(500, withSequence(
      withTiming(0.2, { duration: 400 }),
      withTiming(0, { duration: 600 }),
    ));

    ringScale3.value = withDelay(800, withSequence(
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      withTiming(1.8, { duration: 600 }),
    ));
    ringOpacity3.value = withDelay(800, withSequence(
      withTiming(0.15, { duration: 400 }),
      withTiming(0, { duration: 600 }),
    ));

    // Logo
    logoScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Text
    textOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    taglineOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));

    // Navigate after 2.5s
    const timer = setTimeout(() => {
      fadeOutAndNavigate();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity1.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity2.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale3.value }],
    opacity: ringOpacity3.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#1A0A2E', '#0A0A1A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Animated rings */}
      <Animated.View style={[styles.ring, ring3Style]} />
      <Animated.View style={[styles.ring, ring2Style]} />
      <Animated.View style={[styles.ring, ring1Style]} />

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.logoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoEmoji}>⚡</Text>
        </LinearGradient>
      </Animated.View>

      {/* App name */}
      <Animated.View style={textStyle}>
        <Text style={styles.appName}>RideWave</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={taglineStyle}>
        <Text style={styles.tagline}>Your city, your ride</Text>
      </Animated.View>

      {/* Bottom dot indicator */}
      <Animated.View style={[styles.loadingDots, taglineStyle]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: FontSize.xxxl + 4,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: FontWeight.medium,
  },
  loadingDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 60,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
    borderRadius: 3,
  },
});
