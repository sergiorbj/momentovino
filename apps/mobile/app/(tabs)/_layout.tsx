import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTranslation } from '../../features/i18n/hooks'

type IconName = React.ComponentProps<typeof Ionicons>['name']
type TabRoute = BottomTabBarProps['state']['routes'][number]

const WINE = '#722F37'
const BAR_BG = '#F5EBE0'

const TAB_ICONS: Record<string, IconName> = {
  moments: 'globe',
  family: 'people',
  scanner: 'camera',
  wines: 'wine',
  profile: 'person',
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation()
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        {state.routes.map((route: TabRoute, index: number) => {
          const focused = state.index === index
          const icon = TAB_ICONS[route.name]
          if (!icon) return null

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
          const isWines = route.name === 'wines'

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabActive]}
            >
              <View style={styles.tabIconSlot}>
                {isWines ? (
                  <Image
                    source={require('../../assets/glass.png')}
                    style={[styles.tabWineIcon, { tintColor: fg }]}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={icon} size={22} color={fg} />
                )}
              </View>
              <Text style={[styles.label, { color: fg }]}>{t(`tabs.${route.name}`)}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function TabsLayout() {
  const { t } = useTranslation()
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="moments" options={{ title: t('tabs.moments') }} />
      <Tabs.Screen name="family" options={{ title: t('tabs.family') }} />
      <Tabs.Screen name="scanner" options={{ title: t('tabs.scanner') }} />
      <Tabs.Screen name="wines" options={{ title: t('tabs.wines') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: BAR_BG,
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    marginTop: 3,
  },
  /** Same bounding box as Ionicons `size={22}` for row alignment */
  tabIconSlot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabWineIcon: {
    width: 34,
    height: 34,
  },
})
