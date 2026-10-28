// Client-side copies of ./actions that never throw (see safe-action.ts). Buttons import from here.
import { safe } from "@/lib/safe-action";
import * as a from "./actions";

export const saveBasics = safe(a.saveBasics);
export const saveExperience = safe(a.saveExperience);
export const saveAbout = safe(a.saveAbout);
export const chooseProfileType = safe(a.chooseProfileType);
export const publishProfile = safe(a.publishProfile);
export const setPublished = safe(a.setPublished);
export const setVisibility = safe(a.setVisibility);
export const setPaused = safe(a.setPaused);
export const setTextOnly = safe(a.setTextOnly);
export const setShareLink = safe(a.setShareLink);
export const respondToRequest = safe(a.respondToRequest);
export const blockCompany = safe(a.blockCompany);
export const reportCompany = safe(a.reportCompany);
export const startVideo = safe(a.startVideo);
export const makePrimary = safe(a.makePrimary);
export const changeVideoLanguage = safe(a.changeVideoLanguage);
export const removeVideo = safe(a.removeVideo);
