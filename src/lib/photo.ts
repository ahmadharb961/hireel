/** Address of a candidate's profile photo, or null if they have none. The version makes browsers fetch a new photo after a change. */
export function photoUrl(p: { id: string; photoUpdatedAt: Date | string | null }) {
  return p.photoUpdatedAt ? `/api/photo/${p.id}?v=${new Date(p.photoUpdatedAt).getTime()}` : null;
}
