/** Shown instantly while the next page is prepared, so a tap never looks ignored. */
export function AppSkeleton() {
  return (
    <div className="sk-page" aria-busy="true" aria-label="Loading">
      <div className="sk-shimmer sk-bar" />
      <div className="sk-shimmer sk-title" />
      <div className="sk-shimmer sk-line" />
      <div className="sk-shimmer sk-card" />
      <div className="sk-shimmer sk-card" />
      <div className="sk-shimmer sk-card" />
    </div>
  );
}

export function BrandSkeleton() {
  return (
    <div className="sk-page" aria-busy="true" aria-label="Loading">
      <div className="sk-brand"><img src="/brand/mark.png" alt="" /></div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="sk-feed" aria-busy="true" aria-label="Loading">
      <div className="sk-reel"><img src="/brand/mark.png" alt="" style={{ width: 56, opacity: 0.35, filter: "brightness(3)" }} /></div>
    </div>
  );
}
