/** The Hireel logo. `white` is for dark backgrounds. */
export function Logo({ white, height = 30 }: { white?: boolean; height?: number }) {
  const src = white ? "/brand/logo-white.png" : "/brand/logo.png";
  const ratio = white ? 3.03 : 3.26;
  return <img src={src} alt="Hireel" width={Math.round(height * ratio)} height={height} style={{ height, width: "auto", display: "block" }} />;
}
