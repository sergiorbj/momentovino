export const queryKeys = {
  profile: ['profile'] as const,
  momentStats: ['moments', 'stats'] as const,
  moments: ['moments', 'list'] as const,
  momentDetail: (id: string) => ['moments', 'detail', id] as const,
  wines: (query: string) => ['wines', 'search', query] as const,
  winesCount: ['wines', 'count'] as const,
  family: ['family', 'dashboard'] as const,
  entitlement: ['entitlement'] as const,
}
