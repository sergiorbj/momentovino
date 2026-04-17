import { StyleSheet, View } from 'react-native'

const WINE = '#722F37'
const TRACK = '#E8DDD4'

export type ProgressBarProps = {
  step: number
  total: number
}

export function ProgressBar({ step, total }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(step, total))
  const pct = total <= 0 ? 0 : (clamped / total) * 100
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: TRACK,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginTop: 8,
  },
  fill: {
    height: '100%',
    backgroundColor: WINE,
    borderRadius: 2,
  },
})
