import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

const WINE = '#722F37'
const BG = '#F5EBE0'

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Welcome (placeholder)</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/goal')}>
          <Text style={styles.btnText}>Get started</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24, padding: 24 },
  title: { fontSize: 24, fontFamily: 'DMSerifDisplay_400Regular', color: WINE },
  btn: { backgroundColor: WINE, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50 },
  btnText: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 16 },
})
