export type OnboardingGoal =
  | 'remember'
  | 'travels'
  | 'share'
  | 'discover'

export type OnboardingPain =
  | 'forget_names'
  | 'buried_photos'
  | 'friend_asks'
  | 'trip_blur'

export type OnboardingSelections = {
  goals: OnboardingGoal[]
  painPoints: OnboardingPain[]
  pickedWineKeys: string[]
}

let state: OnboardingSelections = {
  goals: [],
  painPoints: [],
  pickedWineKeys: [],
}

export function getSelections(): OnboardingSelections {
  return {
    goals: [...state.goals],
    painPoints: [...state.painPoints],
    pickedWineKeys: [...state.pickedWineKeys],
  }
}

export function setGoals(goals: OnboardingGoal[]): void {
  state.goals = goals
}

export function setPainPoints(points: OnboardingPain[]): void {
  state.painPoints = points
}

export function setPickedWineKeys(keys: string[]): void {
  state.pickedWineKeys = keys
}

export function resetSelections(): void {
  state = { goals: [], painPoints: [], pickedWineKeys: [] }
}
