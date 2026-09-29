"use client";

import { KEYBOARD_ROWS, type LetterState } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import { BackspaceIcon } from "./Icons";
import { StateMark, stateLabel } from "./Tile";

const KEY_FILL: Record<LetterState | "unused", string> = {
  unused: "bg-limestone-200 text-ink border-limestone-300 hover:bg-limestone-300",
  correct: "bg-tile-correct text-tile-correct-fg border-tile-correct",
  present: "bg-tile-present text-tile-present-fg border-tile-present",
  absent: "bg-tile-absent text-tile-absent-fg border-tile-absent",
};

/**
 * Eleven units per row: row 1 has 10 letters with half-unit insets, row 2 has 11,
 * row 3 has ENTER and ⌫ at 1.5 units each. Letter keys are 28–42px wide, 50px tall.
 */
export function Keyboard({
  states,
  onKey,
  disabled,
  d,
}: {
  states: Record<string, LetterState>;
  onKey: (key: string) => void;
  disabled: boolean;
  d: Dict;
}) {
  return (
    <div
      role="group"
      aria-label={d.keyboardAria}
      data-keyboard
      className="mx-auto flex w-full max-w-[500px] shrink-0 select-none flex-col gap-[6px] px-[6px] pb-[max(8px,env(safe-area-inset-bottom))] pt-1"
    >
      {KEYBOARD_ROWS.map((row, r) => (
        <div key={r} className="grid grid-cols-[repeat(22,minmax(0,1fr))] gap-x-[4px]">
          {r === 0 && <span className="col-span-1" aria-hidden />}
          {row.map((key) => {
            const wide = key === "ENTER" || key === "BACKSPACE";
            const st = states[key];
            const fill = KEY_FILL[st ?? "unused"];
            const label =
              key === "ENTER" ? d.enterAria : key === "BACKSPACE" ? d.backspaceAria : st ? `${key}, ${stateLabel(st, d)}` : key;
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-disabled={disabled || undefined}
                onClick={() => onKey(key)}
                className={`relative flex h-[50px] items-center justify-center rounded-tile border-b-[3px] font-bold leading-none transition-colors duration-150 active:translate-y-[2px] active:border-b-0 ${
                  wide ? "col-span-3 text-[12px] tracking-wide" : "col-span-2 text-[17px]"
                } ${wide ? KEY_FILL.unused : fill}`}
              >
                {key === "BACKSPACE" ? <BackspaceIcon className="size-6" /> : key === "ENTER" ? d.enterKey : key}
                {!wide && st && <StateMark state={st} small />}
              </button>
            );
          })}
          {r === 0 && <span className="col-span-1" aria-hidden />}
        </div>
      ))}
    </div>
  );
}
