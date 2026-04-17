import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

import { ProgressBar } from '../../components/onboarding/ProgressBar'

export default function PainScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={2} total={6} />
        <View style={styles.center}>
          <Text style={styles.title}>Pain (placeholder)</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/demo')}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EBE0' },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24, padding: 24 },
  title: { fontSize: 24, fontFamily: 'DMSerifDisplay_400Regular', color: '#722F37' },
  btn: { backgroundColor: '#722F37', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50 },
  btnText: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 16 },
})
