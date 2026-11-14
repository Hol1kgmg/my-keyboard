import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { keys } from "../data/keyboard";
import type { KeyInteraction } from "../hooks/useKeyInteraction";

export function KeyList({ interaction }: { interaction: KeyInteraction }) {
  const [focused, setFocused] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  function navigate(event: KeyboardEvent, index: number) {
    let next = index;
    const current = keys[index];
    if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "ArrowRight") next = Math.min(keys.length - 1, index + 1);
    else if (event.key === "Home") next = keys.findIndex((key) => key.row === current.row);
    else if (event.key === "End") next = keys.findLastIndex((key) => key.row === current.row);
    else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const row = current.row + (event.key === "ArrowUp" ? -1 : 1);
      const closest = keys
        .filter((key) => key.row === row)
        .sort(
          (a, b) => Math.abs(a.centerU - current.centerU) - Math.abs(b.centerU - current.centerU),
        )[0];
      if (closest) next = keys.indexOf(closest);
    } else return;
    event.preventDefault();
    event.stopPropagation();
    setFocused(next);
    buttons.current.get(next)?.focus();
  }
  return (
    <details className="key-list" onToggle={interaction.clear}>
      <summary>
        キー一覧から操作する<span aria-hidden="true">＋</span>
      </summary>
      <div className="key-list-content">
        <p id="key-list-instructions">矢印キーで移動し、EnterまたはSpaceで押せます。</p>
        <div
          className="key-grid"
          role="group"
          aria-label="51個のキー"
          aria-describedby="key-list-instructions"
        >
          {[0, 1, 2, 3].map((row) => (
            <div className="key-row" key={row}>
              {keys
                .filter((key) => key.row === row)
                .map((key) => {
                  const index = keys.indexOf(key);
                  return (
                    <button
                      key={key.id}
                      ref={(element) => {
                        if (element) buttons.current.set(index, element);
                        else buttons.current.delete(index);
                      }}
                      style={{ flexGrow: key.widthU }}
                      tabIndex={focused === index ? 0 : -1}
                      aria-label={`${key.label} キー`}
                      aria-pressed={interaction.pressedIds.has(key.id)}
                      onFocus={() => {
                        setFocused(index);
                        interaction.setHoveredId(key.id);
                      }}
                      onBlur={() => {
                        interaction.release(`list:${key.id}`);
                        interaction.setHoveredId(null);
                      }}
                      onKeyDown={(event) => {
                        navigate(event, index);
                        if (["Enter", " "].includes(event.key)) {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!event.repeat) interaction.press(`list:${key.id}`, key.id);
                        }
                      }}
                      onKeyUp={(event) => {
                        if (["Enter", " "].includes(event.key)) {
                          event.preventDefault();
                          event.stopPropagation();
                          interaction.release(`list:${key.id}`);
                        }
                      }}
                      onClick={(event) => {
                        if (event.detail !== 0 || !interaction.pressedIds.has(key.id))
                          interaction.pulse(key.id);
                      }}
                    >
                      {key.legend || key.label.replace("無刻印 ", "◇ ")}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
