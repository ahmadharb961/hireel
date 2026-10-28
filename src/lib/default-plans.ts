/** The plans that must always exist. Admins change their names, prices and limits from the admin screen. */
export const DEFAULT_PLANS = [
  { key: "free", nameEn: "Freemium", nameAr: "المجاني", priceLabelEn: "Free", priceLabelAr: "مجاناً", monthlyIntroRequests: 5, monthlyCvRequests: 2, maxSaved: 20, isDefault: true, sortOrder: 0 },
  { key: "premium", nameEn: "Premium", nameAr: "المميّز", priceLabelEn: "Price set by Hireel", priceLabelAr: "يحدّد Hireel السعر", monthlyIntroRequests: 60, monthlyCvRequests: 30, maxSaved: 500, isDefault: false, sortOrder: 1 },
];
