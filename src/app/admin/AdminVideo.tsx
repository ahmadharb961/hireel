"use client";
import { Player } from "@/components/Player";

/** Small player with controls, for watching any video (approved or not) from admin. */
export function AdminVideo({ hls, poster, landscape }: { hls: string | null; poster: string | null; landscape: boolean }) {
  return (
    <div className="avid-media">
      {hls ? <Player src={hls} poster={poster} landscape={landscape} active={false} load muted={false} controls loop={false} /> : <span className="note" style={{ color: "#9fb0a8" }}>—</span>}
    </div>
  );
}
