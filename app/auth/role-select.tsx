import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const T = {
  teal: "#4A0080",
  white: "#ffffff",
};

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#7B2FBE', '#3A0068', '#1A002E']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      {/* Back Button - replace로 변경 */}
      <TouchableOpacity
        onPress={() => router.replace('/')}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      {/* Spacer Top */}
      <View style={{ flex: 1 }} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>How would you like to continue?</Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          {/* Patient Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/auth/patient-login')}
          >
            <Text style={styles.cardEmoji}>🙋</Text>
            <Text style={styles.cardTitle}>I'm a Patient</Text>
            <Text style={styles.cardSubtitle}>
              Find affordable dental care in Korea
            </Text>
          </TouchableOpacity>

          {/* Doctor Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/auth/doctor-login')}
          >
            <Text style={styles.cardEmoji}>👨‍⚕️</Text>
            <Text style={styles.cardTitle}>I'm a Dentist</Text>
            <Text style={styles.cardSubtitle}>
              Connect with international patients
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer Bottom */}
      <View style={{ flex: 1.5 }} />

      {/* Dev Menu */}
      <TouchableOpacity
        style={{ alignSelf: "center", paddingVertical: 10, marginBottom: 10 }}
        onPress={() => router.push("/dev-menu" as any)}
      >
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>🛠 Dev Menu</Text>
      </TouchableOpacity>
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
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  content: {
    gap: 24,
  },
  header: {
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: T.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '300',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.white,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300',
  },
});
