import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

export function useFeature(featureKey: string): boolean {
  const { user, subscription } = useSelector((s: RootState) => s.auth)

  // Admins and trainers always have access
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TRAINER') {
    return true
  }

  // Check features in subscription plan
  const features: string[] = subscription?.plan?.features || []
  return features.includes(featureKey)
}

export function useFeatures(): string[] {
  const { user, subscription } = useSelector((s: RootState) => s.auth)
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TRAINER') {
    return ['all']
  }
  return subscription?.plan?.features || []
}
