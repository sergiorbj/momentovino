import NetInfo from '@react-native-community/netinfo'
import { router } from 'expo-router'

type PendingAction = (() => unknown | Promise<unknown>) | null
let pendingAction: PendingAction = null

export function consumePendingAction(): PendingAction {
  const action = pendingAction
  pendingAction = null
  return action
}

export function clearPendingAction(): void {
  pendingAction = null
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return state.isConnected === true && state.isInternetReachable !== false
}

export async function requireOnline(action: () => unknown | Promise<unknown>): Promise<void> {
  if (await isOnline()) {
    await action()
    return
  }
  pendingAction = action
  router.push('/no-connection')
}
