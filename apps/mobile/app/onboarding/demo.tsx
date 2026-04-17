import { useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { STARTER_DECK, STARTER_PICK_COUNT, type StarterWine } from '../../features/onboarding/starter-deck'
import { setPickedWineKeys } from '../../features/onboarding/selections'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const CARD_BG = '#FFFFFF'
const BORDER = '#E8DDD4'
const GREEN = '#2E7D5B'
const REJECT = '#B85C5C'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_W * 0.25
const SWIPE_OUT_X = SCREEN_W * 1.4
const ROT_AT_EDGE = 10
const CARD_W = Math.min(SCREEN_W - 48, 340)
const CARD_H = Math.min(SCREEN_H * 0.52, 520)
const BOTTLE_H = CARD_H - 140

export default function DemoScreen() {
  const [deck, setDeck] = useState<StarterWine[]>(() => [...STARTER_DECK])
  const [picks, setPicks] = useState<string[]>([])

  // Each card gets its OWN pan, keyed by wine key. Sharing a single pan caused
  // the outgoing card to snap back to center (when pan was reset) in the same
  // frame as the next card was promoted — producing the overlap flash.
  const pansRef = useRef<Map<string, Animated.ValueXY>>(new Map())
  const animatingRef = useRef(false)

  const getPan = (key: string): Animated.ValueXY => {
    let p = pansRef.current.get(key)
    if (!p) {
      p = new Animated.ValueXY()
      pansRef.current.set(key, p)
    }
    return p
  }

  const topCard = deck[0]
  const nextCard = deck[1]
  const topPan = topCard ? getPan(topCard.key) : null

  const canPick = picks.length < STARTER_PICK_COUNT
  const complete = picks.length === STARTER_PICK_COUNT

  const swipeOff = (direction: 'left' | 'right') => {
    if (!topCard || animatingRef.current) return
    animatingRef.current = true
    const leavingKey = topCard.key
    const pan = getPan(leavingKey)
    Animated.timing(pan, {
      toValue: { x: direction === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X, y: 0 },
      duration: 240,
      useNativeDriver: false,
    }).start(() => {
      // Drop the leaving card's pan so if it ever re-enters (recycle path)
      // it starts fresh at (0,0) instead of at SWIPE_OUT_X.
      pansRef.current.delete(leavingKey)

      const nextDeck = deck.slice(1)
      const nextPicks =
        direction === 'right' && picks.length < STARTER_PICK_COUNT
          ? [...picks, leavingKey]
          : picks

      let refilled = nextDeck
      if (nextDeck.length === 0 && nextPicks.length < STARTER_PICK_COUNT) {
        refilled = STARTER_DECK.filter((w) => !nextPicks.includes(w.key))
      }

      setPicks(nextPicks)
      setDeck(refilled)
      animatingRef.current = false
    })
  }

  const responder = useMemo(() => {
    if (!topCard) return null
    const pan = getPan(topCard.key)
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !animatingRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !animatingRef.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          swipeOff('right')
        } else if (g.dx < -SWIPE_THRESHOLD) {
          swipeOff('left')
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start()
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCard?.key, picks.length])

  // Rotate + badges + behind-card transforms all derive from the TOP card's
  // own pan. When the deck advances, the new top binds to ITS pan (untouched
  // at 0,0), so everything snaps to resting state with no shared-state flash.
  const rotate = topPan
    ? topPan.x.interpolate({
        inputRange: [-SCREEN_W, 0, SCREEN_W],
        outputRange: [`-${ROT_AT_EDGE}deg`, '0deg', `${ROT_AT_EDGE}deg`],
        extrapolate: 'clamp',
      })
    : '0deg'
  const pickBadgeOpacity = topPan
    ? topPan.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0
  const skipBadgeOpacity = topPan
    ? topPan.x.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 0
  const behindScale = topPan
    ? topPan.x.interpolate({
        inputRange: [-SCREEN_W, 0, SCREEN_W],
        outputRange: [1, 0.94, 1],
        extrapolate: 'clamp',
      })
    : 0.94
  const behindTranslateY = topPan
    ? topPan.x.interpolate({
        inputRange: [-SCREEN_W, 0, SCREEN_W],
        outputRange: [0, 12, 0],
        extrapolate: 'clamp',
      })
    : 12
  const behindOpacity = topPan
    ? topPan.x.interpolate({
        inputRange: [-SCREEN_W, 0, SCREEN_W],
        outputRange: [1, 0.7, 1],
        extrapolate: 'clamp',
      })
    : 0.7

  const cont = () => {
    if (!complete) return
    setPickedWineKeys(picks)
    router.push('/onboarding/atlas')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={3} total={6} />

        <View style={styles.copy}>
          <Text style={styles.headline}>Pick 3 bottles to start your journal.</Text>
          <Text style={styles.sub}>
            Swipe right on the ones you'd love to try. They become your first 3 moments — polish
            them later.
          </Text>
        </View>

        <View style={styles.deckArea}>
          {!topCard ? (
            <View style={[styles.card, styles.cardEmpty]}>
              <Text style={styles.emptyText}>All done — tap “Build my atlas”.</Text>
            </View>
          ) : null}

          {/* Behind card — rendered FIRST so it's below the top card in the
              stacking order. Uses a stable `card-<key>` key, so when this
              card is promoted to "top" on the next render, React reuses the
              SAME Animated.View instance and the Image never remounts. */}
          {nextCard ? (
            <Animated.View
              key={`card-${nextCard.key}`}
              style={[
                styles.card,
                {
                  opacity: behindOpacity,
                  transform: [
                    { translateY: behindTranslateY },
                    { scale: behindScale },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              {/* Badges always present at fixed positions so child order is
                  stable across behind→top transitions. Behind just pins them
                  at opacity 0. */}
              <Animated.View
                style={[styles.badge, styles.badgePick, { opacity: 0 }]}
                pointerEvents="none"
              >
                <Text style={[styles.badgeText, { color: GREEN }]}>PICK</Text>
              </Animated.View>
              <Animated.View
                style={[styles.badge, styles.badgeSkip, { opacity: 0 }]}
                pointerEvents="none"
              >
                <Text style={[styles.badgeText, { color: REJECT }]}>SKIP</Text>
              </Animated.View>
              <CardBody wine={nextCard} />
            </Animated.View>
          ) : null}

          {topCard && topPan ? (
            <Animated.View
              key={`card-${topCard.key}`}
              {...(responder?.panHandlers ?? {})}
              style={[
                styles.card,
                {
                  transform: [
                    { translateX: topPan.x },
                    { translateY: topPan.y },
                    { rotate },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[styles.badge, styles.badgePick, { opacity: pickBadgeOpacity }]}
                pointerEvents="none"
              >
                <Text style={[styles.badgeText, { color: GREEN }]}>PICK</Text>
              </Animated.View>
              <Animated.View
                style={[styles.badge, styles.badgeSkip, { opacity: skipBadgeOpacity }]}
                pointerEvents="none"
              >
                <Text style={[styles.badgeText, { color: REJECT }]}>SKIP</Text>
              </Animated.View>
              <CardBody wine={topCard} />
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, !canPick && styles.actionDisabled]}
            onPress={() => swipeOff('left')}
            disabled={!topCard || !canPick}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={28} color={REJECT} />
          </TouchableOpacity>
          <View style={styles.counterWrap}>
            <Text style={styles.counter}>
              {picks.length} / {STARTER_PICK_COUNT}
              {complete ? ' ✓' : ''}
            </Text>
            <Text style={styles.micro}>Swipe right to pick • Left to skip</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, !canPick && styles.actionDisabled]}
            onPress={() => swipeOff('right')}
            disabled={!topCard || !canPick}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={26} color={GREEN} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !complete && styles.ctaDisabled]}
            onPress={cont}
            disabled={!complete}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Build my atlas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

function CardBody({ wine }: { wine: StarterWine }) {
  return (
    <View style={styles.cardInner}>
      <View style={styles.bottleWrap}>
        <Image source={wine.image} style={styles.bottleImg} resizeMode="contain" />
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.cardProducer} numberOfLines={1}>
          {wine.wine.producer}
        </Text>
        <Text style={styles.cardName} numberOfLines={2}>
          {wine.wine.name}
        </Text>
        <Text style={styles.cardRegion} numberOfLines={1}>
          {wine.flag}  {wine.locationName}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  copy: { paddingHorizontal: 24, paddingTop: 20, gap: 8 },
  headline: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    lineHeight: 20,
  },
  deckArea: {
    flex: 1,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardEmpty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'DMSans_500Medium', color: SUBTLE, fontSize: 15 },
  cardInner: { flex: 1, alignItems: 'center' },
  bottleWrap: {
    height: BOTTLE_H,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleImg: {
    height: '100%',
    width: '100%',
  },
  cardMeta: { alignItems: 'center', gap: 4, marginTop: 14, width: '100%' },
  cardProducer: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardName: {
    fontSize: 19,
    lineHeight: 24,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  cardRegion: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  badge: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  badgePick: {
    right: 24,
    borderColor: GREEN,
    transform: [{ rotate: '-10deg' }],
  },
  badgeSkip: {
    left: 24,
    borderColor: REJECT,
    transform: [{ rotate: '10deg' }],
  },
  badgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 18,
    letterSpacing: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: { opacity: 0.35 },
  counterWrap: { alignItems: 'center', gap: 2 },
  counter: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
  micro: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
