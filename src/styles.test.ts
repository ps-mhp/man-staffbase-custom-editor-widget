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
 * Wächter über die Stylesheets, die die Seite zeigen.
 *
 * jsdom rechnet keine Kaskade; ob die Schreibfläche nach Craft aussieht, fiele
 * in den übrigen Tests nie auf. Geprüft wird deshalb das kompilierte CSS —
 * dasselbe, das der Build einbettet (siehe `test/scss-transform.js`).
 */

import editorCss from "./styles/editor.scss";
import richContentCss from "./styles/rich-content.scss";

// Die Regeln eines Selektors, ohne verschachtelte Blöcke.
const block = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return new RegExp(String.raw`(?:^|\})\s*${escaped}\s*\{([^}]*)\}`).exec(css)?.[1] ?? "";
};

describe("Stylesheets", () => {
  describe("Seite (rich-content.scss)", () => {
    it("setzt keine Versalien und keine Laufweite", () => {
      // Craft kennt keine Versalien und keine Laufweiten; `man-type` hebt
      // beides ausdrücklich auf. Erlaubt ist nur dieses Aufheben.
      expect(richContentCss).not.toMatch(/uppercase/);
      const spacings = richContentCss.match(/letter-spacing:[^;]*/g) ?? [];
      expect(spacings.filter((value) => !/:\s*normal\b/.test(value))).toEqual([]);
    });

    it("kennt die entfernte Kleinschreibung nicht mehr", () => {
      // Die Funktion ist entfernt; eine verbliebene Regel `.text-lowercase`
      // setzte gespeicherten Text weiter klein, sobald die Klasse irgendwo
      // auftaucht.
      expect(richContentCss).not.toMatch(/lowercase/);
    });

    it("nennt keine der alten Schriften und keine alten Gewichte", () => {
      expect(richContentCss).not.toMatch(/MANEurope|MAN Europe/);
      expect(richContentCss).not.toMatch(/font-weight:\s*(300|500|600)\b/);
    });

    it("stellt keine Überschrift kleiner als body-m", () => {
      // Der Fließtext steht bei 16px; `h5` darf nicht darunter fallen, `h6`
      // höchstens eine Stufe.
      expect(block(richContentCss, ".custom-editor-content h5")).toMatch(/font-size:\s*16px/);
      expect(block(richContentCss, ".custom-editor-content h6")).toMatch(/font-size:\s*14px/);
    });
  });

  describe("Schriften der Schreibfläche (editor.scss)", () => {
    const faces = editorCss.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    const face = (family: string, weight: number): string | undefined =>
      faces.find(
        (rule) =>
          rule.includes(`font-family: "${family}"`) &&
          new RegExp(String.raw`font-weight:\s*${weight}\b`).test(rule),
      );

    it("bettet die Craft-Schnitte ein", () => {
      expect(faces).toHaveLength(3);
      expect(face("Man Europe", 400)).toContain("ManEurope_Regular.woff2");
      expect(face("Man Europe", 700)).toContain("ManEurope_Bold.woff2");
      expect(face("Man Europe Condensed", 700)).toContain("ManEuropeCondensed_Bold.woff2");
    });

    it("verweist nicht mehr auf die alten Dateien", () => {
      expect(faces.join("\n")).not.toMatch(/MANEurope|maneurope/);
    });
  });
});
