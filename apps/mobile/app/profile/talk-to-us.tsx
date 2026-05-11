import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

const WINE = '#722F37'
const BG = '#F5EBE0'
const SUBTLE = '#C2703E'
const INK = '#3F2A2E'

const EMAIL = 'feedback@sergiobernardi.dev'

export default function TalkToUsScreen() {
  const openEmail = () => {
    Linking.openURL(`mailto:${EMAIL}?subject=MomentoVino Feedback`)
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.title}>Talk to Us</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.heroIcon}>
            <Ionicons name="chatbubbles-outline" size={48} color={WINE} />
          </View>

          <Text style={styles.heading}>We'd love to hear from you!</Text>
          <Text style={styles.description}>
            Whether you have an idea to make MomentoVino better, want to share feedback about your
            experience, or just want to tell us about a cool wine moment... we're all ears.
          </Text>

          <TouchableOpacity style={styles.emailBtn} onPress={openEmail} activeOpacity={0.85}>
            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emailBtnText}>Send us an email</Text>
          </TouchableOpacity>

          <Text style={styles.emailHint}>{EMAIL}</Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: WINE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#722F3715',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: INK,
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#5C4033',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#5C4033',
    borderRadius: 50,
    height: 56,
    width: '100%',
    marginBottom: 12,
  },
  emailBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  emailHint: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
})
