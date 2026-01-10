import { View, Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-4xl font-bold mb-4">MomentoVino</Text>
      <Text className="text-lg text-gray-600">Mobile App</Text>
      <StatusBar style="auto" />
    </View>
  )
}
