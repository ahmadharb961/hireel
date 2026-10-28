/**
 * Wraps a server action for use from a button. If the call itself fails (lost connection,
 * or the site was updated while the page was open), it returns an error instead of
 * throwing, so busy buttons always reset and the person sees what to do.
 */
export function safe<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | { ok: false; error: "network" }> => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error("action failed", e);
      return { ok: false, error: "network" };
    }
  };
}
