import { StyleSheet } from 'react-native'

/** Shared layout + typography for “Continue with email / Apple / Google” stacks. */
export const AUTH_PROVIDER = {
  btnHeight: 52,
  iconSize: 20,
  labelFontSize: 15,
  columnGap: 10,
  pillRadius: 50,
} as const

type Palette = { wine: string; ink: string; border: string }

export function createProviderAuthStyles(p: Palette) {
  const label = {
    fontFamily: 'DMSans_600SemiBold' as const,
    fontSize: AUTH_PROVIDER.labelFontSize,
  }
  return StyleSheet.create({
    buttons: { gap: AUTH_PROVIDER.columnGap },
    authBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: AUTH_PROVIDER.columnGap,
      borderRadius: AUTH_PROVIDER.pillRadius,
      height: AUTH_PROVIDER.btnHeight,
    },
    authGoogle: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: p.border,
    },
    authGoogleText: {
      ...label,
      color: p.ink,
    },
    authEmail: { backgroundColor: p.wine },
    authEmailText: {
      ...label,
      color: '#FFFFFF',
    },
    /** Custom row (same geometry as Google/email) — native ASAuthorizationAppleIDButton ignores height. */
    authApple: { backgroundColor: '#000000' },
    authAppleText: {
      ...label,
      color: '#FFFFFF',
    },
  })
}
