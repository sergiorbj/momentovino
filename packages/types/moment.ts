export interface MomentPhoto {
  id: string
  momentId: string
  url: string
  position: number
  isCover: boolean
  createdAt: string
}

export interface Moment {
  id: string
  userId: string
  wineId: string | null
  title: string
  description: string | null
  happenedAt: string
  locationName: string
  latitude: number
  longitude: number
  rating: number | null
  coverPhotoUrl: string | null
  createdAt: string
  updatedAt: string
}
