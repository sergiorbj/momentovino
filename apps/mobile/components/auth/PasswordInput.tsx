import { useState } from 'react'
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const BORDER = '#E8DDD4'
const INK = '#3F2A2E'
const ICON = '#6E5A5E'

export type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  /** Eye icon tint (defaults to SUBTLE palette). */
  iconColor?: string
}

/**
 * Password field with show/hide toggle (eye icon). Matches screen `styles.input` visuals.
 */
export function PasswordInput({
  iconColor = ICON,
  style,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <View style={styles.row}>
      <TextInput
        {...rest}
        style={[styles.field, style]}
        secureTextEntry={!visible}
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.eyeHit}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Ionicons
          name={visible ? 'eye-outline' : 'eye-off-outline'}
          size={22}
          color={iconColor}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingRight: 4,
  },
  field: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingRight: 8,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  eyeHit: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
