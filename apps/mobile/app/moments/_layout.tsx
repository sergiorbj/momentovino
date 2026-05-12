import { Stack } from 'expo-router'

export default function MomentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="list" />
      <Stack.Screen name="new" />
      <Stack.Screen name="wine-picker" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  )
}
