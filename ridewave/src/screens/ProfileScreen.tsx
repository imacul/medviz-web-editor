import React, { useEffect } from 'react';
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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, BorderRadius } from '../theme';
import { useStore } from '../store/useStore';

const MENU_ITEMS = [
  { id: 'payment', icon: '💳', label: 'Payment Methods', sub: '•••• 4242 · Visa', color: Colors.primary },
  { id: 'promos', icon: '🎁', label: 'Promotions', sub: '2 active promo codes', color: '#FBBF24' },
  { id: 'safety', icon: '🛡️', label: 'Safety', sub: 'Emergency contacts, RideCheck', color: Colors.accent },
  { id: 'support', icon: '💬', label: 'Help & Support', sub: 'FAQs, contact us', color: Colors.info },
  { id: 'settings', icon: '⚙️', label: 'Settings', sub: 'Notifications, privacy', color: Colors.textMuted },
  { id: 'about', icon: 'ℹ️', label: 'About RideWave', sub: 'v1.0.0', color: Colors.textMuted },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, setAuthenticated, setUser, tripHistory } = useStore();

  const headerY = useSharedValue(-30);
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerY.value = withSpring(0, { damping: 15 });
    headerOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const handleSignOut = () => {
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0F', '#12121A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <Text style={styles.screenTitle}>Profile</Text>
        </Animated.View>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCard}>
          <LinearGradient
            colors={['#1A1A28', '#12121A']}
            style={styles.profileCardGradient}
          >
            {/* Avatar */}
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.profileAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.profileAvatarText}>{user?.avatar || 'U'}</Text>
            </LinearGradient>

            {/* Info */}
            <Text style={styles.profileName}>{user?.name || 'Rider'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || '+1 (555) 000-0000'}</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.totalTrips || 0}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.ratingRow}>
                  <Text style={styles.statValue}>{user?.rating.toFixed(1) || '5.0'}</Text>
                  <Text style={styles.starIcon}>⭐</Text>
                </View>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.primary }]}>Gold</Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
            </View>

            {/* Edit button */}
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Reward banner */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <LinearGradient
            colors={[Colors.accent, Colors.primary]}
            style={styles.rewardBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.rewardContent}>
              <Text style={styles.rewardEmoji}>🏆</Text>
              <View>
                <Text style={styles.rewardTitle}>Gold Member</Text>
                <Text style={styles.rewardSub}>127 more trips to Platinum!</Text>
              </View>
            </View>
            <View style={styles.rewardProgressTrack}>
              <LinearGradient
                colors={['#fff', 'rgba(255,255,255,0.6)']}
                style={[styles.rewardProgressFill, { width: '46%' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(300 + index * 60)}
            >
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(700)}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
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
  header: {
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  profileCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  profileAvatarText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  editBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  editBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  rewardBanner: {
    borderRadius: BorderRadius.xl,
    padding: 20,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  rewardEmoji: {
    fontSize: 36,
  },
  rewardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
    marginBottom: 2,
  },
  rewardSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  rewardProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rewardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  menuSection: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  signOutBtn: {
    padding: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '50',
    backgroundColor: Colors.error + '10',
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },
});
