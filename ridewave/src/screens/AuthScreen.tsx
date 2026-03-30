import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../theme';
import { useStore, getMockUser } from '../store/useStore';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type AuthMode = 'welcome' | 'phone' | 'otp';

export default function AuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const { setAuthenticated, setUser } = useStore();

  // Animations
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-30);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(60);
  const buttonScale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    headerTranslateY.value = withDelay(200, withSpring(0, { damping: 15 }));
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    cardTranslateY.value = withDelay(400, withSpring(0, { damping: 15 }));
  }, []);

  const handleSignIn = async () => {
    buttonScale.value = withSequence(
      withTiming(0.96, { duration: 100 }),
      withSpring(1, { damping: 10 }),
    );

    if (mode === 'welcome') {
      setMode('phone');
      return;
    }

    if (mode === 'phone') {
      if (phone.length < 10) {
        shakeX.value = withSequence(
          withTiming(10, { duration: 60 }),
          withTiming(-10, { duration: 60 }),
          withTiming(10, { duration: 60 }),
          withTiming(-10, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        );
        return;
      }
      setMode('otp');
      return;
    }

    if (mode === 'otp') {
      const code = otp.join('');
      if (code.length < 6) return;

      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setUser(getMockUser());
      setAuthenticated(true);
      setIsLoading(false);
    }
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { translateX: shakeX.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const renderPhoneInput = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Phone Number</Text>
      <View style={styles.phoneInputRow}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>🇺🇸 +1</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="(555) 234-5678"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={14}
          autoFocus
        />
      </View>
    </View>
  );

  const renderOtpInput = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Verification Code</Text>
      <Text style={styles.inputSubLabel}>Sent to +1 {phone}</Text>
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            style={[styles.otpBox, digit && styles.otpBoxFilled]}
            value={digit}
            onChangeText={(val) => {
              const newOtp = [...otp];
              newOtp[i] = val.slice(-1);
              setOtp(newOtp);
            }}
            keyboardType="number-pad"
            maxLength={1}
            autoFocus={i === 0}
          />
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#1A0A2E', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Background decoration */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />

      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logoMini}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoMiniText}>⚡</Text>
          </LinearGradient>
          <Text style={styles.brandName}>RideWave</Text>
          <Text style={styles.headerTitle}>
            {mode === 'welcome'
              ? 'Welcome back 👋'
              : mode === 'phone'
              ? 'Enter your number'
              : 'Verify your number'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'welcome'
              ? 'Sign in to continue your journey'
              : mode === 'phone'
              ? "We'll send you a verification code"
              : 'Enter the 6-digit code we sent you'}
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, cardStyle]}>
          <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
            {mode === 'welcome' && (
              <View style={styles.welcomeOptions}>
                <Text style={styles.welcomeText}>Continue with</Text>

                <TouchableOpacity style={styles.socialBtn} onPress={() => setMode('phone')}>
                  <Text style={styles.socialBtnIcon}>📱</Text>
                  <Text style={styles.socialBtnText}>Phone Number</Text>
                  <Text style={styles.socialBtnArrow}>›</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.socialBtn, styles.googleBtn]}
                  onPress={handleSignIn}
                >
                  <Text style={styles.socialBtnIcon}>🌐</Text>
                  <Text style={styles.socialBtnText}>Continue with Google</Text>
                  <Text style={styles.socialBtnArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]}>
                  <Text style={styles.socialBtnIcon}>🍎</Text>
                  <Text style={styles.socialBtnText}>Continue with Apple</Text>
                  <Text style={styles.socialBtnArrow}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'phone' && renderPhoneInput()}
            {mode === 'otp' && renderOtpInput()}

            {mode !== 'welcome' && (
              <Animated.View style={btnStyle}>
                <TouchableOpacity onPress={handleSignIn} activeOpacity={0.9} disabled={isLoading}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.continueBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <Text style={styles.continueBtnText}>Verifying...</Text>
                    ) : (
                      <Text style={styles.continueBtnText}>
                        {mode === 'phone' ? 'Send Code' : "Let's Ride! 🚀"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {mode === 'otp' && (
              <TouchableOpacity style={styles.resendBtn} onPress={() => {}}>
                <Text style={styles.resendText}>
                  Didn't receive it? <Text style={styles.resendLink}>Resend</Text>
                </Text>
              </TouchableOpacity>
            )}

            {mode !== 'welcome' && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setMode(mode === 'otp' ? 'phone' : 'welcome')}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            )}
          </BlurView>
        </Animated.View>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  bgDecor1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.accentGlow,
  },
  bgDecor2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.primaryGlow,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMini: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  logoMiniText: {
    fontSize: 28,
  },
  brandName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: Colors.primary,
    marginBottom: 16,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: FontSize.xxl + 4,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.5,
  },
  card: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  cardBlur: {
    padding: 24,
  },
  welcomeOptions: {
    gap: 12,
  },
  welcomeText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleBtn: {
    borderColor: '#4285F430',
  },
  appleBtn: {
    borderColor: '#FFFFFF15',
  },
  socialBtnIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  socialBtnText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  socialBtnArrow: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingHorizontal: 12,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputSubLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCode: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryCodeText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  continueBtn: {
    padding: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  continueBtnText: {
    color: Colors.textInverse,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  resendLink: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  terms: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: FontSize.xs * 1.8,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});
