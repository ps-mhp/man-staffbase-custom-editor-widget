/*!
 * Copyright 2026, MHP Management und IT-Beratung GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Die Farbwahl der Werkzeugleiste: ein Werkzeug mit Farbbalken, darunter
 * eine Liste fester Farbfelder und „Standard“.
 *
 * Eine feste Auswahl statt eines freien Farbwählers: sie hält die Seite bei
 * einer überschaubaren Zahl von Tönen, und die Prüfung beim Lesen
 * (`editor-value.ts`) muss keinen beliebigen CSS-Wert durchlassen.
 */

import React, { ReactElement } from "react";
import type { IconComponent } from "@man/config-ui/form/segmented";
import { cn } from "@man/config-ui/primitives/utils";
import { ToolMenu, ToolMenuItem } from "@man/config-ui/toolbar/tool-menu";

/** Die Farbfelder, mit Namen für Screenreader. Werte unverändert aus dem Bestand. */
export const SWATCHES: ReadonlyArray<{ color: string; name: string }> = [
  { color: "#1f2933", name: "Anthrazit" },
  { color: "#5b6672", name: "Grau" },
  { color: "#9aa5b1", name: "Hellgrau" },
  { color: "#ffffff", name: "Weiß" },
  { color: "#c0362c", name: "Rot" },
  { color: "#e8590c", name: "Orange" },
  { color: "#f59f00", name: "Gelb" },
  { color: "#2f9e44", name: "Grün" },
  { color: "#0074d9", name: "Blau" },
  { color: "#5f3dc4", name: "Violett" },
  { color: "#c2255c", name: "Magenta" },
  { color: "#0b7285", name: "Petrol" },
];

/**
 * „Keine Farbe gesetzt“: weiße Fläche mit rotem Schrägstrich, aus den Tokens
 * des Rahmens – wie bei der Tabelle.
 */
const STANDARD_SWATCH =
  "linear-gradient(to top right, var(--background) 0 40%, var(--destructive) 40% 60%, var(--background) 60% 100%)";

/** Der Name einer Farbe: aus der Liste, sonst ihr Wert. */
function nameOf(color: string | undefined): string {
  if (color === undefined) return "Standard";
  return SWATCHES.find((swatch) => swatch.color.toLowerCase() === color.toLowerCase())?.name ?? color;
}

// Die Wahl darf der Schreibfläche weder Fokus noch Markierung nehmen: die
// Farbe gilt dem markierten Text.
const keepSelection = (event: React.MouseEvent): void => event.preventDefault();

export interface ColorMenuProps {
  /** „Textfarbe“, „Texthintergrund“: Name des Werkzeugs und der Liste. */
  label: string;
  icon: IconComponent;
  /** Die Farbe an der Einfügemarke, oder `undefined` für keine eigene. */
  value: string | undefined;
  /** Der Balken ohne eigene Farbe, als Token. */
  standardBar: string;
  /** Eine Farbe der Liste, oder `undefined` für „Standard“. */
  onPick: (color: string | undefined) => void;
  testId: string;
}

export function ColorMenu({ label, icon, value, standardBar, onPick, testId }: ColorMenuProps): ReactElement {
  return (
    <ToolMenu
      label={`${label}: ${nameOf(value)}`}
      title={label}
      icon={icon}
      testId={testId}
      text={<span aria-hidden className="h-[3px] w-4 rounded-full" style={{ background: value ?? standardBar }} />}
    >
      {(close) => {
        const pick = (color: string | undefined): void => {
          onPick(color);
          close();
        };
        return (
          <>
            <div className="grid grid-cols-4 gap-1 p-1" data-testid={`${testId}-swatches`}>
              {SWATCHES.map((swatch) => {
                const active = value?.toLowerCase() === swatch.color;
                return (
                  <button
                    key={swatch.color}
                    type="button"
                    data-tool-menu-item=""
                    aria-label={swatch.name}
                    aria-pressed={active}
                    title={swatch.name}
                    className={cn(
                      "flex size-10 cursor-pointer items-center justify-center rounded-md outline-none",
                      "hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40",
                      active && "bg-primary-soft",
                    )}
                    onMouseDown={keepSelection}
                    onClick={() => pick(swatch.color)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-7 rounded-md border border-input",
                        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      style={{ background: swatch.color }}
                    />
                  </button>
                );
              })}
            </div>
            <ToolMenuItem data-testid={`${testId}-reset`} onMouseDown={keepSelection} onClick={() => pick(undefined)}>
              <span aria-hidden className="size-4 shrink-0 rounded-sm border border-input" style={{ background: STANDARD_SWATCH }} />
              Standard
            </ToolMenuItem>
          </>
        );
      }}
    </ToolMenu>
  );
}
