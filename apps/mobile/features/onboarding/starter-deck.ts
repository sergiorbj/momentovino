import type { WineInput } from '../moments/schema'

export type StarterWine = {
  key: string
  wine: Required<Pick<WineInput, 'name'>> & WineInput
  flag: string
  latitude: number
  longitude: number
  locationName: string
  image: number
}

export const STARTER_DECK: StarterWine[] = [
  {
    key: 'antinori-chianti-classico-reserva',
    wine: {
      name: 'Chianti Classico Riserva',
      producer: 'Marchesi Antinori',
      region: 'Tuscany',
      country: 'Italy',
      type: 'RED',
    },
    flag: '🇮🇹',
    latitude: 43.47,
    longitude: 11.34,
    locationName: 'Chianti Classico, Tuscany',
    image: require('../../assets/onboarding-wines/antinori-chianti-classico-reserva.png'),
  },
  {
    key: 'catena-zapata-malbec',
    wine: {
      name: 'Malbec',
      producer: 'Catena Zapata',
      region: 'Mendoza',
      country: 'Argentina',
      type: 'RED',
    },
    flag: '🇦🇷',
    latitude: -32.89,
    longitude: -68.84,
    locationName: 'Mendoza',
    image: require('../../assets/onboarding-wines/catena-zapata-malbec.png'),
  },
  {
    key: 'henri-bourgeois-sancerre',
    wine: {
      name: 'Sancerre Les Baronnes',
      producer: 'Henri Bourgeois',
      region: 'Loire Valley',
      country: 'France',
      type: 'WHITE',
    },
    flag: '🇫🇷',
    latitude: 47.33,
    longitude: 2.84,
    locationName: 'Sancerre, Loire Valley',
    image: require('../../assets/onboarding-wines/henri-bourgeois-sancerre.png'),
  },
  {
    key: 'quinta-do-castro-vinhas-velhas',
    wine: {
      name: 'Vinhas Velhas Reserva',
      producer: 'Quinta do Crasto',
      region: 'Douro',
      country: 'Portugal',
      type: 'RED',
    },
    flag: '🇵🇹',
    latitude: 41.23,
    longitude: -7.6,
    locationName: 'Douro Valley',
    image: require('../../assets/onboarding-wines/quinta-do-castro-vinhas-velhas.png'),
  },
  {
    key: 'rioja-alta-gran-reserva',
    wine: {
      name: 'Gran Reserva 904',
      producer: 'La Rioja Alta',
      region: 'Rioja',
      country: 'Spain',
      type: 'RED',
    },
    flag: '🇪🇸',
    latitude: 42.57,
    longitude: -2.88,
    locationName: 'Haro, Rioja',
    image: require('../../assets/onboarding-wines/rioja-alta-gran-reserva.png'),
  },
  {
    key: 'whispering-angel',
    wine: {
      name: 'Whispering Angel',
      producer: "Château d'Esclans",
      region: 'Côtes de Provence',
      country: 'France',
      type: 'ROSE',
    },
    flag: '🇫🇷',
    latitude: 43.47,
    longitude: 6.46,
    locationName: 'Côtes de Provence',
    image: require('../../assets/onboarding-wines/whispering-angel.png'),
  },
]

export const STARTER_PICK_COUNT = 3

export function getStarterWine(key: string): StarterWine | undefined {
  return STARTER_DECK.find((w) => w.key === key)
}
