import "server-only";
import { layoutEmail, sendMail } from "./mailer";

type L = "en" | "ar";

const copy = {
  verify: {
    en: { subject: "Confirm your email for Hireel", title: "Confirm your email", body: "Tap the button to confirm your email and finish creating your Hireel account. The link works for 24 hours.", cta: "Confirm email" },
    ar: { subject: "تأكيد بريدك الإلكتروني على Hireel", title: "أكّد بريدك الإلكتروني", body: "اضغط على الزر لتأكيد بريدك الإلكتروني وإكمال إنشاء حسابك على Hireel. الرابط صالح لمدة 24 ساعة.", cta: "تأكيد البريد" },
  },
  reset: {
    en: { subject: "Reset your Hireel password", title: "Reset your password", body: "Someone asked to reset the password for this email. If it was you, tap the button. The link works for 1 hour. If it wasn’t you, ignore this email.", cta: "Choose a new password" },
    ar: { subject: "إعادة تعيين كلمة المرور على Hireel", title: "إعادة تعيين كلمة المرور", body: "طلب أحدهم إعادة تعيين كلمة المرور لهذا البريد. إذا كنت أنت، اضغط على الزر. الرابط صالح لمدة ساعة واحدة. إذا لم تكن أنت، تجاهل هذه الرسالة.", cta: "اختيار كلمة مرور جديدة" },
  },
};

export async function sendVerificationEmail(to: string, url: string, locale: L) {
  const c = copy.verify[locale];
  await sendMail({ to, subject: c.subject, text: `${c.body}\n\n${url}`, html: layoutEmail(locale, c.title, c.body, { label: c.cta, url }) });
}

export async function sendResetEmail(to: string, url: string, locale: L) {
  const c = copy.reset[locale];
  await sendMail({ to, subject: c.subject, text: `${c.body}\n\n${url}`, html: layoutEmail(locale, c.title, c.body, { label: c.cta, url }) });
}
