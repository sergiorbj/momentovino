import { View, Text, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-serif text-primary mb-2">MomentoVino</Text>
          <Text className="text-lg font-sans-medium text-muted-foreground">Wine Tracking App</Text>
        </View>

        {/* Button Examples */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>UI component examples</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
            </View>
          </CardContent>
        </Card>

        {/* Badge Examples */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </View>
          </CardContent>
        </Card>

        {/* Colors Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Design System Colors</CardTitle>
            <CardDescription>Wine and Gold palette</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row gap-2 mb-2">
              <View className="w-8 h-8 rounded bg-wine-500" />
              <View className="w-8 h-8 rounded bg-wine-400" />
              <View className="w-8 h-8 rounded bg-wine-300" />
              <View className="w-8 h-8 rounded bg-wine-200" />
              <View className="w-8 h-8 rounded bg-wine-100" />
            </View>
            <View className="flex-row gap-2">
              <View className="w-8 h-8 rounded bg-gold-500" />
              <View className="w-8 h-8 rounded bg-gold-400" />
              <View className="w-8 h-8 rounded bg-gold-300" />
              <View className="w-8 h-8 rounded bg-gold-200" />
              <View className="w-8 h-8 rounded bg-gold-100" />
            </View>
          </CardContent>
        </Card>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  )
}
