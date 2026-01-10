export interface Wine {
  id: string
  name: string
  type: WineType
  vintage?: number
  region?: string
  producer?: string
  rating?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export enum WineType {
  RED = 'red',
  WHITE = 'white',
  ROSE = 'rose',
  SPARKLING = 'sparkling',
  DESSERT = 'dessert',
}
