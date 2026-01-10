export interface Event {
  id: string
  title: string
  description?: string
  date: Date
  location?: string
  userId: string
  wineIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface EventWithDetails extends Event {
  userName: string
  wineCount: number
}
