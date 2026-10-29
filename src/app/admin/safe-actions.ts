// Client-side copies of ./actions that never throw (see safe-action.ts). Buttons import from here.
import { safe } from "@/lib/safe-action";
import * as a from "./actions";

export const moderateVideo = safe(a.moderateVideo);
export const setCompanyStatus = safe(a.setCompanyStatus);
export const setCompanyPlan = safe(a.setCompanyPlan);
export const savePlans = safe(a.savePlans);
export const resolveReport = safe(a.resolveReport);
export const setCandidateSuspended = safe(a.setCandidateSuspended);
export const unpublishCandidate = safe(a.unpublishCandidate);
export const removeCandidatePhoto = safe(a.removeCandidatePhoto);
export const addCategory = safe(a.addCategory);
export const editCategory = safe(a.editCategory);
export const showCategory = safe(a.showCategory);
export const reorderCategory = safe(a.reorderCategory);
export const setFeatured = safe(a.setFeatured);
export const reorderFeatured = safe(a.reorderFeatured);
