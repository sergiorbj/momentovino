import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type IconName = React.ComponentProps<typeof Ionicons>['name']

type TabBarProps = {
  state: {
    index: number
    routes: { key: string; name: string; params?: object }[]
  }
  navigation: {
    emit: (event: {
      type: 'tabPress'
      target: string
      canPreventDefault: true
    }) => { defaultPrevented: boolean }
    navigate: (name: string, params?: object) => void
  }
}

const WINE = '#722F37'
const BAR_BG = '#FFFFFF'

const TABS: Record<string, { icon: IconName; label: string }> = {
  moments: { icon: 'globe', label: 'Moments' },
  family: { icon: 'people', label: 'Family' },
  scanner: { icon: 'camera', label: 'Scanner' },
  profile: { icon: 'person', label: 'Profile' },
}

function CustomTabBar({ state, navigation }: TabBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const meta = TABS[route.name]
          if (!meta) return null

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          const fg = focused ? WINE : BAR_BG

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabActive]}
            >
              <Ionicons name={meta.icon} size={22} color={fg} />
              <Text style={[styles.label, { color: fg }]}>{meta.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="moments" options={{ title: 'Moments' }} />
      <Tabs.Screen name="family" options={{ title: 'Family' }} />
      <Tabs.Screen name="scanner" options={{ title: 'Scanner' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: WINE,
    paddingBottom: 20,
    paddingTop: 10,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 64,
  },
  tabActive: {
    backgroundColor: BAR_BG,
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    marginTop: 3,
  },
})
