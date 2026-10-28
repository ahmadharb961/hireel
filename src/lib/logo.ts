/** Address of a company's logo, or null if it has none. The version makes browsers fetch a new logo after a change. */
export function logoUrl(c: { id: string; logoUpdatedAt: Date | string | null }) {
  return c.logoUpdatedAt ? `/api/company-logo/${c.id}?v=${new Date(c.logoUpdatedAt).getTime()}` : null;
}

export function bannerUrl(c: { id: string; bannerUpdatedAt: Date | string | null }) {
  return c.bannerUpdatedAt ? `/api/company-banner/${c.id}?v=${new Date(c.bannerUpdatedAt).getTime()}` : null;
}
