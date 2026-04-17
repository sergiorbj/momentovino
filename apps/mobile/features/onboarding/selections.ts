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
  goal: OnboardingGoal | null
  painPoints: OnboardingPain[]
  pickedWineKeys: string[]
}

let state: OnboardingSelections = {
  goal: null,
  painPoints: [],
  pickedWineKeys: [],
}

export function getSelections(): OnboardingSelections {
  return {
    goal: state.goal,
    painPoints: [...state.painPoints],
    pickedWineKeys: [...state.pickedWineKeys],
  }
}

export function setGoal(goal: OnboardingGoal): void {
  state.goal = goal
}

export function setPainPoints(points: OnboardingPain[]): void {
  state.painPoints = points
}

export function setPickedWineKeys(keys: string[]): void {
  state.pickedWineKeys = keys
}

export function resetSelections(): void {
  state = { goal: null, painPoints: [], pickedWineKeys: [] }
}
