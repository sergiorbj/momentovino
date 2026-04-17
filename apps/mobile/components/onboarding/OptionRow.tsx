import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const WINE = '#722F37'
const INK = '#3F2A2E'
const BORDER = '#E8DDD4'

export type OptionRowProps = {
  emoji: string
  label: string
  selected: boolean
  onPress: () => void
  /** Show a circle (single-select) or a checkbox (multi-select) */
  mode: 'single' | 'multi'
}

export function OptionRow({ emoji, label, selected, onPress, mode }: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole={mode === 'multi' ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <View style={[styles.indicator, mode === 'multi' ? styles.indicatorSquare : styles.indicatorCircle, selected && styles.indicatorSelected]}>
        {selected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowSelected: {
    borderColor: WINE,
    backgroundColor: '#FBF4F5',
  },
  emoji: { fontSize: 22 },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  labelSelected: {
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
  indicator: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D4C4B8',
    backgroundColor: '#FFFFFF',
  },
  indicatorCircle: { borderRadius: 11 },
  indicatorSquare: { borderRadius: 6 },
  indicatorSelected: {
    backgroundColor: WINE,
    borderColor: WINE,
  },
})
