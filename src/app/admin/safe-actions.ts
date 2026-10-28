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
