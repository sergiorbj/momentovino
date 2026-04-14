import { useEffect, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const DEFAULT_ACCENT = '#722F37'

type Props = {
  labelPhotoUrl?: string | null
  size?: number
  accent?: string
}

export function WineRowAvatar({ labelPhotoUrl, size = 36, accent = DEFAULT_ACCENT }: Props) {
  const [loadFailed, setLoadFailed] = useState(false)
  const uri = typeof labelPhotoUrl === 'string' ? labelPhotoUrl.trim() : ''

  useEffect(() => {
    setLoadFailed(false)
  }, [uri])

  const r = size / 2

  if (!uri || loadFailed) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: r }]}>
        <Ionicons name="wine" size={Math.round(size * 0.45)} color={accent} />
      </View>
    )
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: r }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessibilityLabel="Wine label photo"
        onError={() => setLoadFailed(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#F0E6E8',
  },
  placeholder: {
    backgroundColor: '#FDF2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
