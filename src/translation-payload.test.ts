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

import { EditorValue, encodeEditorAttribute, parseEditorValue } from "./editor-value";
import {
  DOC_MARKER,
  TEXT_ATTRIBUTE,
  applyTranslatedTexts,
  editorValueToTranslatableHtml,
  hasTranslatableText,
  isTranslatedEditorHtml,
  readTranslatedTexts,
} from "./translation-payload";
import { customEditorTranslationProvider as provider } from "./translation-provider";

const doc: EditorValue = [
  { type: "h1", children: [{ text: "Sicherheit" }] },
  {
    type: "p",
    children: [{ text: "Bitte ", bold: true }, { text: "anschnallen." }],
  },
  {
    type: "ul",
    children: [
      { type: "li", children: [{ type: "lic", children: [{ text: "Gurt prüfen" }] }] },
      { type: "li", children: [{ type: "lic", children: [{ text: "Spiegel stellen" }] }] },
    ],
  },
];

/** Übersetzt jedes Textstück, indem es ihm ein Kennzeichen voranstellt. */
const fakeService = (html: string, translate = (text: string) => `EN:${text}`): string =>
  html.replace(
    new RegExp(`(<span ${TEXT_ATTRIBUTE}="\\d+">)([^<]*)(</span>)`, "g"),
    (_whole, open: string, text: string, close: string) => `${open}${translate(text)}${close}`,
  );

describe("editorValueToTranslatableHtml", () => {
  it("gibt jedem Textstück eine eigene Nummer", () => {
    const html = editorValueToTranslatableHtml(doc);

    expect(html).toContain(`<div ${DOC_MARKER}="1">`);
    expect(html).toContain(`<span ${TEXT_ATTRIBUTE}="0">Sicherheit</span>`);
    expect(html).toContain(`<span ${TEXT_ATTRIBUTE}="1">Bitte </span>`);
    expect(html).toContain(`<span ${TEXT_ATTRIBUTE}="2">anschnallen.</span>`);
  });

  // Der Zusammenhang hilft der Maschine: eine Überschrift ist keine Zeile aus
  // einer Liste, auch wenn beide nur zwei Wörter lang sind.
  it("behält die Gliederung des Dokuments", () => {
    const html = editorValueToTranslatableHtml(doc);

    expect(html).toContain("<h1>");
    expect(html).toContain("<ul><li><span>");
  });

  it("maskiert Text, der wie Markup aussieht", () => {
    const html = editorValueToTranslatableHtml([
      { type: "p", children: [{ text: '<script>alert("x")</script>' }] },
    ]);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("lässt Codeblöcke aus", () => {
    const html = editorValueToTranslatableHtml([
      { type: "code_block", children: [{ type: "code_line", children: [{ text: "const x = 1;" }] }] },
      { type: "p", children: [{ text: "Danach" }] },
    ]);

    expect(html).not.toContain("const x = 1;");
    expect(html).toContain(`<span ${TEXT_ATTRIBUTE}="0">Danach</span>`);
  });
});

describe("hasTranslatableText", () => {
  it("erkennt ein Dokument aus lauter Leerzeichen als nichts zu übersetzen", () => {
    expect(hasTranslatableText([{ type: "p", children: [{ text: "   " }] }])).toBe(false);
  });

  it("erkennt echten Text", () => {
    expect(hasTranslatableText(doc)).toBe(true);
  });
});

describe("Runde durch den Übersetzungsdienst", () => {
  it("ersetzt jedes Stück und behält die Auszeichnungen", () => {
    const translated = fakeService(editorValueToTranslatableHtml(doc));
    const result = applyTranslatedTexts(doc, readTranslatedTexts(translated));

    expect(result).toEqual([
      { type: "h1", children: [{ text: "EN:Sicherheit" }] },
      { type: "p", children: [{ text: "EN:Bitte ", bold: true }, { text: "EN:anschnallen." }] },
      {
        type: "ul",
        children: [
          { type: "li", children: [{ type: "lic", children: [{ text: "EN:Gurt prüfen" }] }] },
          { type: "li", children: [{ type: "lic", children: [{ text: "EN:Spiegel stellen" }] }] },
        ],
      },
    ]);
  });

  // Der Dienst darf Stücke verschlucken; dann steht dort weiter die
  // Ausgangssprache. Ein Satz in der falschen Sprache schlägt eine leere Zeile.
  it("behält die Ausgangssprache, wo die Übersetzung nichts liefert", () => {
    const texts = readTranslatedTexts(fakeService(editorValueToTranslatableHtml(doc)));
    texts.delete(0);

    expect(applyTranslatedTexts(doc, texts)[0]).toEqual({
      type: "h1",
      children: [{ text: "Sicherheit" }],
    });
  });

  it("behält die Ausgangssprache, wo die Übersetzung nur Leerraum liefert", () => {
    const translated = fakeService(editorValueToTranslatableHtml(doc), () => "   ");

    expect(applyTranslatedTexts(doc, readTranslatedTexts(translated))).toEqual(doc);
  });

  it("nimmt kein Markup an, das der Dienst hinzuerfunden hat", () => {
    const translated = editorValueToTranslatableHtml([
      { type: "p", children: [{ text: "Hallo" }] },
    ]).replace(">Hallo<", "><b>Hallo</b><");

    expect(readTranslatedTexts(translated).get(0)).toBe("Hallo");
  });

  it("lässt eine Antwort ohne Kennzeichen unangetastet", () => {
    expect(isTranslatedEditorHtml("<p>Hallo</p>")).toBe(false);
    expect(applyTranslatedTexts(doc, readTranslatedTexts("<p>Hallo</p>"))).toEqual(doc);
  });
});

describe("customEditorTranslationProvider", () => {
  it("meldet Element und Attribut, unter denen der Inhalt zu finden ist", () => {
    expect(provider.ref).toEqual({ tagName: "custom-editor-widget", attribute: "content" });
  });

  it("fordert für ein leeres Attribut nichts an", () => {
    expect(provider.toTranslatable(null)).toBeNull();
    expect(provider.toTranslatable("")).toBeNull();
  });

  it("fordert für ein leeres Dokument nichts an", () => {
    expect(provider.toTranslatable(encodeEditorAttribute([{ type: "p", children: [{ text: "" }] }]))).toBeNull();
  });

  it("schreibt das Ergebnis wieder als Attributwert zurück", () => {
    const stored = encodeEditorAttribute(doc);
    const translated = fakeService(provider.toTranslatable(stored)!);
    const next = provider.fromTranslated(translated, stored);

    expect(next).toMatch(/^b64:/);
    expect(parseEditorValue(next!)[0]).toEqual({ type: "h1", children: [{ text: "EN:Sicherheit" }] });
  });
});
