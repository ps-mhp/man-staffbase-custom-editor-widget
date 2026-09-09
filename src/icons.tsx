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
 * Die Symbole der Werkzeugleiste.
 *
 * Selbst gezeichnet und nicht aus einer Icon-Bibliothek geholt: es sind ein
 * gutes Dutzend geometrischer Formen, und ein Paket dafür hinge als weitere
 * Abhängigkeit im Chunk, der ohnehin schon Plate und Slate trägt.
 *
 * Alle Symbole teilen dieselbe Zeichenfläche (24×24) und dieselbe Strichbreite.
 * Sie erben die Farbe vom Knopf (`stroke="currentColor"`), damit der gedrückte
 * Zustand sie ohne eigene Regel mitfärbt.
 */

import React, { ReactElement } from "react";

/** Die gemeinsame Hülle: Größe, Strichführung, Farbe. */
function Glyph({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <svg
      className="custom-editor__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconUndo = (): ReactElement => (
  <Glyph>
    <path d="M4 8h9a5 5 0 0 1 0 10H8" />
    <path d="M8 4 4 8l4 4" />
  </Glyph>
);

export const IconRedo = (): ReactElement => (
  <Glyph>
    <path d="M20 8h-9a5 5 0 0 0 0 10h5" />
    <path d="m16 4 4 4-4 4" />
  </Glyph>
);

export const IconBold = (): ReactElement => (
  <Glyph>
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" />
    <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" />
  </Glyph>
);

export const IconItalic = (): ReactElement => (
  <Glyph>
    <path d="M15 5h-5" />
    <path d="M14 19H9" />
    <path d="m14 5-4 14" />
  </Glyph>
);

export const IconUnderline = (): ReactElement => (
  <Glyph>
    <path d="M7 4v6a5 5 0 0 0 10 0V4" />
    <path d="M5 20h14" />
  </Glyph>
);

export const IconStrikethrough = (): ReactElement => (
  <Glyph>
    <path d="M16 5H9.5a2.75 2.75 0 0 0-1.4 5" />
    <path d="M13.5 14a2.75 2.75 0 0 1-1.4 5H8" />
    <path d="M4 12h16" />
  </Glyph>
);

export const IconCode = (): ReactElement => (
  <Glyph>
    <path d="m9 7-5 5 5 5" />
    <path d="m15 7 5 5-5 5" />
  </Glyph>
);

export const IconLink = (): ReactElement => (
  <Glyph>
    <path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1" />
    <path d="M14 11a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 11.7 18l1.1-1.1" />
  </Glyph>
);

export const IconUnlink = (): ReactElement => (
  <Glyph>
    <path d="M15 8.5 16.5 7A4 4 0 0 1 22 12.7" />
    <path d="M9 15.5 7.5 17A4 4 0 0 1 2 11.3" />
    <path d="m3 3 18 18" />
  </Glyph>
);

export const IconBulletedList = (): ReactElement => (
  <Glyph>
    <path d="M9 6h11" />
    <path d="M9 12h11" />
    <path d="M9 18h11" />
    <path d="M4.5 6h.01" />
    <path d="M4.5 12h.01" />
    <path d="M4.5 18h.01" />
  </Glyph>
);

export const IconNumberedList = (): ReactElement => (
  <Glyph>
    <path d="M10 6h10" />
    <path d="M10 12h10" />
    <path d="M10 18h10" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M4 15h2v1.5H4V19h2" />
  </Glyph>
);

export const IconAlignLeft = (): ReactElement => (
  <Glyph>
    <path d="M4 6h16" />
    <path d="M4 12h10" />
    <path d="M4 18h13" />
  </Glyph>
);

export const IconAlignCenter = (): ReactElement => (
  <Glyph>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M5.5 18h13" />
  </Glyph>
);

export const IconAlignRight = (): ReactElement => (
  <Glyph>
    <path d="M4 6h16" />
    <path d="M10 12h10" />
    <path d="M7 18h13" />
  </Glyph>
);

export const IconAlignJustify = (): ReactElement => (
  <Glyph>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </Glyph>
);

export const IconRule = (): ReactElement => (
  <Glyph>
    <path d="M4 12h16" />
    <path d="M6 7h12" opacity="0.35" />
    <path d="M6 17h12" opacity="0.35" />
  </Glyph>
);

export const IconChevronDown = (): ReactElement => (
  <Glyph>
    <path d="m7 10 5 5 5-5" />
  </Glyph>
);

export const IconChevronLeft = (): ReactElement => (
  <Glyph>
    <path d="m14 7-5 5 5 5" />
  </Glyph>
);

export const IconChevronRight = (): ReactElement => (
  <Glyph>
    <path d="m10 7 5 5-5 5" />
  </Glyph>
);

export const IconClose = (): ReactElement => (
  <Glyph>
    <path d="M6 6 18 18" />
    <path d="M18 6 6 18" />
  </Glyph>
);

export const IconSave = (): ReactElement => (
  <Glyph>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M9 4v5h6V4" />
    <path d="M8 13h8v7H8z" />
  </Glyph>
);

export const IconCheck = (): ReactElement => (
  <Glyph>
    <path d="m5 13 4 4L19 7" />
  </Glyph>
);

export const IconSuperscript = (): ReactElement => (
  <Glyph>
    <path d="m4 7 8 11" />
    <path d="m12 7-8 11" />
    <path d="M17 8a2 2 0 1 1 3.4 1.4L17 13h4" />
  </Glyph>
);

export const IconSubscript = (): ReactElement => (
  <Glyph>
    <path d="m4 5 8 11" />
    <path d="m12 5-8 11" />
    <path d="M17 14a2 2 0 1 1 3.4 1.4L17 19h4" />
  </Glyph>
);

export const IconHighlight = (): ReactElement => (
  <Glyph>
    <path d="m9 13 6-6 3 3-6 6H9z" />
    <path d="M14 5.5 16.5 3 21 7.5 18.5 10" />
    <path d="M4 20h16" />
  </Glyph>
);

export const IconKbd = (): ReactElement => (
  <Glyph>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
  </Glyph>
);

export const IconTextColor = (): ReactElement => (
  <Glyph>
    <path d="m5 15 5-11 5 11" />
    <path d="M6.8 11h6.4" />
    <path d="M4 19h16" strokeWidth="3" />
  </Glyph>
);

export const IconFillColor = (): ReactElement => (
  <Glyph>
    <path d="M9 4 4 9l7 7 7-7-5-5z" />
    <path d="M4 9h14" />
    <path d="M20 14s2 2.5 2 4a2 2 0 1 1-4 0c0-1.5 2-4 2-4z" />
  </Glyph>
);

export const IconIndent = (): ReactElement => (
  <Glyph>
    <path d="M10 6h10" />
    <path d="M10 12h10" />
    <path d="M10 18h10" />
    <path d="m3 8 3 4-3 4" />
  </Glyph>
);

export const IconOutdent = (): ReactElement => (
  <Glyph>
    <path d="M10 6h10" />
    <path d="M10 12h10" />
    <path d="M10 18h10" />
    <path d="m6 8-3 4 3 4" />
  </Glyph>
);

export const IconCodeBlock = (): ReactElement => (
  <Glyph>
    <rect x="2.5" y="4" width="19" height="16" rx="2" />
    <path d="m9 10-2 2 2 2" />
    <path d="m15 10 2 2-2 2" />
  </Glyph>
);

export const IconClearFormat = (): ReactElement => (
  <Glyph>
    <path d="M8 5h11" />
    <path d="M13 5 9 19" />
    <path d="M6 19h6" />
    <path d="m3 4 18 16" />
  </Glyph>
);

export const IconPlus = (): ReactElement => (
  <Glyph>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Glyph>
);

export const IconMinus = (): ReactElement => (
  <Glyph>
    <path d="M5 12h14" />
  </Glyph>
);
