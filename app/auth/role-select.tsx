import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSpring, 
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const T = {
  white: "#ffffff",
  purpleDeep: "#1A002E",
  purpleMid: "#3A0068",
  purpleLight: "#7B2FBE",
};

// --- Animated Pressable Card Component ---
const RoleCard = ({ 
  title, 
  subtitle, 
  iconName, 
  onPress, 
  delay 
}: { 
  title: string, 
  subtitle: string, 
  iconName: keyof typeof Ionicons.glyphMap, 
  onPress: () => void,
  delay: number 
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 100 }));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }
      ]
    };
  });

  return (
    <View style={styles.cardWrapper}>
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          onPress={onPress}
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed
          ]}
        >
          {/* Subtle gradient border effect inside the card */}
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={32} color={T.white} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default function RoleSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Header animations
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(20);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 800 });
    headerTranslateY.value = withSpring(0, { damping: 20, stiffness: 100 });
  }, [headerOpacity, headerTranslateY]);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
      transform: [{ translateY: headerTranslateY.value }]
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background with multiple gradient layers for depth */}
      <LinearGradient
        colors={[T.purpleDeep, T.purpleMid, T.purpleLight]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      

      <View style={[styles.content, { paddingTop: Math.max(insets.top + 20, 60), paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
        
        {/* Back Button */}
        <Animated.View style={headerAnimatedStyle}>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 }
            ]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color={T.white} />
          </Pressable>
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* Header Section */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>Concourse</Text>
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>How would you like to continue?</Text>
        </Animated.View>

        {/* Cards Section */}
        <View style={styles.cardsContainer}>
          <RoleCard 
            title="I'm a Patient"
            subtitle="Find affordable dental care in Korea"
            iconName="person"
            delay={200}
            onPress={() => router.push('/auth/patient-login')}
          />
          <RoleCard 
            title="I'm a Dentist"
            subtitle="Connect with international patients"
            iconName="medkit"
            delay={400}
            onPress={() => router.push('/auth/doctor-login')}
          />
        </View>

        <View style={{ flex: 1 }} />

        {/* Dev Menu */}
        <Pressable
          style={({ pressed }) => [styles.devMenuBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.push("/dev-menu" as any)}
        >
          <Ionicons name="construct-outline" size={14} color="rgba(255,255,255,0.4)" style={{ marginRight: 6 }} />
          <Text style={styles.devMenuText}>Developer Menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A002E', // Fallback
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    zIndex: 10,
  },

  backBtn: {
    width: 44, 
    height: 44, 
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", 
    justifyContent: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  badgeText: {
    color: T.white,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: T.white,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 16,
  },
  cardWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.white,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
    lineHeight: 20,
  },
  devMenuBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    marginBottom: 10,
  },
  devMenuText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
});
