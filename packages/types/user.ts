export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile extends User {
  bio?: string
  avatar?: string
  location?: string
}
