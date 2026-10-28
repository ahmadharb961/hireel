// Client-side copies of ./actions that never throw (see safe-action.ts). Buttons import from here.
import { safe } from "@/lib/safe-action";
import * as a from "./actions";

export const toggleSave = safe(a.toggleSave);
export const requestIntro = safe(a.requestIntro);
export const reportCandidate = safe(a.reportCandidate);
export const updateCompanyProfile = safe(a.updateCompanyProfile);
