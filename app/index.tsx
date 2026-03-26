import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PatientTheme, SharedColors } from "../constants/theme";
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 56;

export default function SplashScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const arrowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(arrowPulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    setActiveIndex(index);
  };

  return (
    <LinearGradient
      colors={[...PatientTheme.authGradient]}
      locations={[0, 0.55, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <View style={{ flex: 1 }} />

      {/* Logo Area */}
      <View style={styles.logoArea}>
        <Text style={styles.logo}>🦷</Text>
        <Text style={styles.title}>Concourse</Text>
      </View>

      {/* Swipeable Cards */}
      <View style={{ marginBottom: 48 }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={CARD_WIDTH}
          decelerationRate="fast"
        >
          {/* Card 1: Subtitle */}
          <View style={[styles.card, { width: CARD_WIDTH }]}>
            <Text style={styles.subtitle}>
              Receive <Text style={styles.bold}>premium</Text> dental care in South Korea by{' '}
              <Text style={styles.bold}>U.S. licensed</Text> Dentists at a price up to{' '}
              <Text style={styles.bold}>70%</Text> less
            </Text>
            <Text style={styles.swipeHint}>→ Swipe to see pricing</Text>
          </View>

          {/* Card 2: Pricing */}
          <View style={[styles.card, { width: CARD_WIDTH }]}>
            <View style={styles.pricingCard}>
              <View style={styles.section}>
                <Text style={styles.label}>DENTAL IMPLANT</Text>
                <View style={styles.priceRow}>
                  <View style={styles.countryBox}>
                    <Text style={styles.flag}>🇺🇸</Text>
                    <Text style={styles.price}>$3,000+</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={styles.countryBox}>
                    <Text style={styles.flag}>🇰🇷</Text>
                    <Text style={styles.price}>$800+</Text>
                  </View>
                </View>
                <Text style={styles.savings}>
                  Save <Text style={styles.savingsBold}>$2,200</Text> per tooth
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.label}>PORCELAIN VENEER</Text>
                <View style={styles.priceRow}>
                  <View style={styles.countryBox}>
                    <Text style={styles.flag}>🇺🇸</Text>
                    <Text style={styles.price}>$1,500+</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={styles.countryBox}>
                    <Text style={styles.flag}>🇰🇷</Text>
                    <Text style={styles.price}>$450+</Text>
                  </View>
                </View>
                <Text style={styles.savings}>
                  Save <Text style={styles.savingsBold}>$1,050</Text> per tooth
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          <View style={[styles.dot, activeIndex === 0 && styles.dotActive]} />
          <View style={[styles.dot, activeIndex === 1 && styles.dotActive]} />
        </View>
      </View>

      <View style={{ height: 16 }} />

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/auth/role-select')}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>Get Started</Text>
          <Animated.View style={[styles.arrowCircle, {
            transform: [
              { translateX: arrowPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) },
              { scale: arrowPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1] }) },
            ],
          }]}>
            <View style={styles.chevron} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Founder Line */}
      <Text style={styles.founderText}>
        Founded by graduates of NYU College of Dentistry 2018
      </Text>

      <View style={{ height: 16 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 56,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: SharedColors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: '400',
  },
  bold: {
    fontWeight: '700',
    color: SharedColors.white,
  },
  swipeHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    width: '100%',
  },
  section: {
    marginBottom: 0,
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  countryBox: {
    flex: 1,
    alignItems: 'center',
  },
  flag: {
    fontSize: 20,
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: SharedColors.white,
  },
  arrow: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  savings: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  savingsBold: {
    color: SharedColors.white,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: SharedColors.white,
    width: 20,
  },
  button: {
    backgroundColor: SharedColors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: PatientTheme.primary,
    letterSpacing: 0.3,
  },
  arrowCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: PatientTheme.primary,
    transform: [{ rotate: '45deg' }],
  },
  founderText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
});
