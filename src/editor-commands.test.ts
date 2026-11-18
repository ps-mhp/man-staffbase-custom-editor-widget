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

import { createPlateEditor } from "platejs/react";
import type { PlateEditor } from "platejs/react";
import type { Value } from "platejs";

import {
  BLOCK_OPTIONS,
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  blockOptionOf,
  fontSizeOptions,
  applyLink,
  clearFormatting,
  currentAlign,
  currentBlockType,
  insertRule,
  linkAtSelection,
  linkProblem,
  readFontSize,
  selectedText,
  setAlign,
  setBlockType,
  setFontSize,
  toggleMark,
} from "./editor-commands";
import { EditorValue } from "./editor-value";
import { PLUGINS } from "./plate-setup";

/** Ein Editor ohne Oberfläche, die Marke an `path`/`offset`. */
function editorAt(value: EditorValue, path: number[], offset = 0): PlateEditor {
  const editor = createPlateEditor({ plugins: PLUGINS, value: value as unknown as Value });
  editor.tf.select({ path, offset });
  return editor;
}

const tree = (editor: PlateEditor): unknown => JSON.parse(JSON.stringify(editor.children, (key, value) => (key === "id" ? undefined : value)));

describe("Absatzformat", () => {
  it("führt Fließtext, sechs Überschriften, Zitat und Codeblock", () => {
    expect(BLOCK_OPTIONS.map((option) => option.value)).toEqual([
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code_block",
    ]);
    expect(BLOCK_OPTIONS[0].label).toBe("Fließtext");
  });

  it("zeigt eine Codezeile als Codeblock und Unbekanntes als Fließtext", () => {
    expect(blockOptionOf("code_line")).toBe("code_block");
    expect(blockOptionOf("h3")).toBe("h3");
    expect(blockOptionOf("lic")).toBe("p");
  });
});

describe("Schriftgröße", () => {
  it("liest Pixel und fällt ohne Wert auf den Fließtext zurück", () => {
    expect(readFontSize("24px")).toBe(24);
    expect(readFontSize("13.6px")).toBe(14);
    expect(readFontSize(undefined)).toBe(DEFAULT_FONT_SIZE);
    expect(readFontSize("groß")).toBe(DEFAULT_FONT_SIZE);
  });

  it("nimmt eine fremde Größe in die Liste auf, damit die Auswahl sie zeigen kann", () => {
    expect(fontSizeOptions(16)).toEqual([...FONT_SIZES]);
    expect(fontSizeOptions(15)).toEqual([12, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]);
  });

  it("verändert die Stufenliste nicht", () => {
    const before = [...FONT_SIZES];
    fontSizeOptions(15);
    expect(FONT_SIZES).toEqual(before);
  });
});

describe("linkProblem", () => {
  it("verlangt eine Adresse", () => {
    expect(linkProblem("")).toBe("empty");
    expect(linkProblem("   ")).toBe("empty");
  });

  it("lässt nur die sicheren Schemata und relative Adressen durch", () => {
    expect(linkProblem("https://www.man.eu")).toBeUndefined();
    expect(linkProblem("mailto:kommunikation@man.eu")).toBeUndefined();
    expect(linkProblem("tel:+4989")).toBeUndefined();
    expect(linkProblem("/intranet/seite")).toBeUndefined();
    expect(linkProblem("javascript:alert(1)")).toBe("unsafe");
    expect(linkProblem("data:text/html,x")).toBe("unsafe");
  });
});

describe("Befehle am Editor", () => {
  const linked: EditorValue = [
    { type: "p", children: [{ text: "Vor " }, { type: "a", url: "https://www.man.eu", children: [{ text: "MAN" }] }, { text: "" }] },
  ];

  it("liest den Link an der Marke und ändert ihn", () => {
    const editor = editorAt(linked, [0, 1, 0], 1);

    expect(linkAtSelection(editor)).toEqual({ url: "https://www.man.eu", text: "MAN" });
    expect(applyLink(editor, " https://www.man.eu/de ", "MAN")).toBe(true);
    expect(linkAtSelection(editor)?.url).toBe("https://www.man.eu/de");
  });

  it("setzt keinen Link mit verbotener Adresse", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "Text" }] }], [0, 0], 2);

    expect(applyLink(editor, "javascript:alert(1)", "x")).toBe(false);
    expect(tree(editor)).toEqual([{ type: "p", children: [{ text: "Text" }] }]);
  });

  it("schlägt den markierten Text als Linktext vor", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "Hallo Welt" }] }], [0, 0]);
    editor.tf.select({ anchor: { path: [0, 0], offset: 6 }, focus: { path: [0, 0], offset: 10 } });

    expect(selectedText(editor)).toBe("Welt");
    expect(linkAtSelection(editor)).toBeUndefined();
  });

  it("zählt einen Absatz im Zitat als Zitat und holt ihn wieder heraus", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "Zitat" }] }], [0, 0], 1);

    setBlockType(editor, "blockquote");
    expect(currentBlockType(editor)).toBe("blockquote");

    setBlockType(editor, "h2");
    expect(tree(editor)).toEqual([{ type: "h2", children: [{ text: "Zitat" }] }]);

    setBlockType(editor, "p");
    expect(currentBlockType(editor)).toBe("p");
  });

  it("wechselt zwischen Codeblock und Überschrift", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "x = 1" }] }], [0, 0], 1);

    setBlockType(editor, "code_block");
    expect(currentBlockType(editor)).toBe("code_line");

    setBlockType(editor, "h1");
    expect(tree(editor)).toEqual([{ type: "h1", children: [{ text: "x = 1" }] }]);
  });

  it("richtet aus und liest die Ausrichtung", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "Mitte" }] }], [0, 0]);

    expect(currentAlign(editor)).toBe("left");
    setAlign(editor, "center");
    expect(currentAlign(editor)).toBe("center");
  });

  it("zeichnet markierten Text aus und nimmt alles wieder weg", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "Fett" }] }], [0, 0]);
    editor.tf.select({ anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 4 } });

    toggleMark(editor, "bold");
    toggleMark(editor, "highlight");
    setFontSize(editor, 24);
    expect(tree(editor)).toEqual([{ type: "p", children: [{ text: "Fett", bold: true, highlight: true, fontSize: "24px" }] }]);

    // Die Größe des Fließtexts heißt „keine eigene“.
    setFontSize(editor, 16);
    expect(tree(editor)).toEqual([{ type: "p", children: [{ text: "Fett", bold: true, highlight: true }] }]);

    clearFormatting(editor);
    expect(tree(editor)).toEqual([{ type: "p", children: [{ text: "Fett" }] }]);
  });

  it("fügt eine Trennlinie ein", () => {
    const editor = editorAt([{ type: "p", children: [{ text: "Oben" }] }], [0, 0], 4);

    insertRule(editor);

    expect((editor.children as Array<{ type: string }>).map((node) => node.type)).toContain("hr");
  });
});
