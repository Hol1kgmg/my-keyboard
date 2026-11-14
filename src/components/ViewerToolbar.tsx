import type { ViewPreset, ViewRequest } from "./CameraController";
import type { KeyInteraction } from "../hooks/useKeyInteraction";

function ViewIcon({ preset }: { preset: ViewPreset }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {preset === "top" ? (
        <rect x="3" y="6" width="18" height="12" rx="2" />
      ) : preset === "low" ? (
        <path d="m3 12 15-3 3 4-16 3-2-4Zm2 4v2l16-3v-2" />
      ) : (
        <path d="m3 10 12-5 6 9-12 5-6-9Zm0 0v3l6 9 12-5v-3M9 19v3" />
      )}
    </svg>
  );
}

export function ViewerToolbar({
  view,
  setView,
  interaction,
}: {
  view: ViewRequest;
  setView: (preset: ViewPreset) => void;
  interaction: KeyInteraction;
}) {
  return (
    <div className="viewer-toolbar" aria-label="ビューアの操作">
      <div className="view-presets" role="group" aria-label="視点">
        {(
          [
            ["perspective", "斜め"],
            ["top", "真上"],
            ["low", "低い位置"],
          ] as const
        ).map(([preset, label]) => (
          <button
            key={preset}
            className="view-button"
            aria-pressed={view.preset === preset}
            onClick={() => setView(preset)}
          >
            <ViewIcon preset={preset} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <span className="toolbar-divider" />
      <button
        className="reset-button"
        onClick={() => setView("perspective")}
        aria-label="初期視点に戻す"
        title="初期視点に戻す"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
        </svg>
      </button>
      <span className="toolbar-divider input-divider" />
      <button
        className="input-toggle"
        aria-pressed={interaction.physicalInput}
        onClick={() => interaction.setPhysicalInput(!interaction.physicalInput)}
      >
        <span className="toggle-track">
          <span />
        </span>
        キーボード入力
      </button>
    </div>
  );
}
