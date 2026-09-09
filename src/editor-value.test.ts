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

import {
  EditorValue,
  emptyValue,
  encodeEditorAttribute,
  isEmptyValue,
  isSafeUrl,
  parseEditorValue,
} from "./editor-value";

const doc: EditorValue = [
  { type: "h1", children: [{ text: "Titel" }] },
  { type: "p", align: "center", children: [{ text: "fett", bold: true }, { text: " normal" }] },
  { type: "ul", children: [{ type: "li", children: [{ type: "lic", children: [{ text: "Punkt" }] }] }] },
];

describe("Runde durch das Attribut", () => {
  it("gibt zurück, was hineingegeben wurde", () => {
    expect(parseEditorValue(encodeEditorAttribute(doc))).toEqual(doc);
  });

  it("übersteht Umlaute und Sonderzeichen", () => {
    const value: EditorValue = [{ type: "p", children: [{ text: "Übersicht — 100 % „geprüft“ ✓" }] }];

    expect(parseEditorValue(encodeEditorAttribute(value))).toEqual(value);
  });

  it("legt den Inhalt als Base64-Nutzlast ab", () => {
    expect(encodeEditorAttribute(doc)).toMatch(/^b64:/);
  });

  it("liest auch unverpacktes JSON, wie es von Hand im Feld stehen könnte", () => {
    expect(parseEditorValue(JSON.stringify(doc))).toEqual(doc);
  });
});

describe("parseEditorValue mit maskiertem Attribut", () => {
  const value: EditorValue = [{ type: "p", children: [{ text: "Hallo Welt & Co." }] }];

  // Auf dem Weg zur veröffentlichten Seite maskieren manche Stationen mehr,
  // als der Browser wieder auflöst. Der Schrägstrich ist der häufigste Fall —
  // und kommt in Base64 laufend vor.
  it("liest einen Wert, dessen Schrägstriche maskiert sind", () => {
    const escaped = encodeEditorAttribute(value).replace(/\//g, "&#x2F;");

    expect(parseEditorValue(escaped)).toEqual(value);
  });

  it("liest einen doppelt maskierten Wert", () => {
    const escaped = encodeEditorAttribute(value).replace(/\//g, "&amp;#x2F;");

    expect(parseEditorValue(escaped)).toEqual(value);
  });

  it("liest einen Wert, den ein Zeilenumbruch zerteilt hat", () => {
    const wrapped = encodeEditorAttribute(value).replace(/(.{20})/g, "$1\n  ");

    expect(parseEditorValue(wrapped)).toEqual(value);
  });

  it("lässt einen unmaskierten Wert unangetastet", () => {
    expect(parseEditorValue(encodeEditorAttribute(value))).toEqual(value);
  });
});

describe("parseEditorValue bei unbrauchbarem Inhalt", () => {
  it.each([
    ["fehlend", undefined],
    ["leer", ""],
    ["kein JSON", "{"],
    ["kein Array", '{"type":"p"}'],
    ["defekte Nutzlast", "b64:kein base64!!"],
  ])("liefert bei %s ein leeres Dokument", (_name, raw) => {
    expect(parseEditorValue(raw as string | undefined)).toEqual(emptyValue());
  });
});

describe("Zurückschneiden auf bekannte Knoten", () => {
  it("wirft unbekannte Blocktypen weg", () => {
    const raw = JSON.stringify([{ type: "script", children: [{ text: "x" }] }]);

    expect(parseEditorValue(raw)).toEqual(emptyValue());
  });

  it("behält nur die vereinbarten Auszeichnungen", () => {
    const raw = JSON.stringify([{ type: "p", children: [{ text: "x", bold: true, evil: true }] }]);

    expect(parseEditorValue(raw)).toEqual([{ type: "p", children: [{ text: "x", bold: true }] }]);
  });

  it("wirft eine Ausrichtung weg, die es nicht gibt", () => {
    const raw = JSON.stringify([{ type: "p", align: "diagonal", children: [{ text: "x" }] }]);

    expect(parseEditorValue(raw)).toEqual([{ type: "p", children: [{ text: "x" }] }]);
  });

  it("gibt einem Block ohne Kinder einen leeren Textknoten", () => {
    expect(parseEditorValue(JSON.stringify([{ type: "p" }]))).toEqual([{ type: "p", children: [{ text: "" }] }]);
  });

  it("entfernt einen Verweis mit ausführbarer Adresse", () => {
    const raw = JSON.stringify([
      { type: "p", children: [{ type: "a", url: "javascript:alert(1)", children: [{ text: "klick" }] }] },
    ]);

    expect(parseEditorValue(raw)).toEqual([{ type: "p", children: [{ text: "" }] }]);
  });
});

describe("isSafeUrl", () => {
  it.each(["https://man.eu", "http://man.eu", "mailto:a@man.eu", "tel:+49", "/seite", "seite.html", "#anker"])(
    "lässt %s zu",
    (url) => {
      expect(isSafeUrl(url)).toBe(true);
    },
  );

  it.each(["javascript:alert(1)", "  javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,<script>"])(
    "weist %s ab",
    (url) => {
      expect(isSafeUrl(url)).toBe(false);
    },
  );
});

describe("isEmptyValue", () => {
  it("erkennt das frische Dokument als leer", () => {
    expect(isEmptyValue(emptyValue())).toBe(true);
  });

  it("erkennt reinen Leerraum als leer", () => {
    expect(isEmptyValue([{ type: "p", children: [{ text: "   " }] }])).toBe(true);
  });

  it("hält eine Trennlinie für Inhalt", () => {
    expect(isEmptyValue([{ type: "hr", children: [{ text: "" }] }])).toBe(false);
  });

  it("erkennt Text in einer Verschachtelung", () => {
    expect(isEmptyValue(doc)).toBe(false);
  });
});

describe("Auszeichnungen mit Wert", () => {
  const roundTrip = (node: Record<string, unknown>): Record<string, unknown> => {
    const raw = encodeEditorAttribute([{ type: "p", children: [node] } as never]);
    return parseEditorValue(raw)[0].children[0] as Record<string, unknown>;
  };

  it("behält Farbe, Hintergrund, Größe und Schriftart", () => {
    const node = roundTrip({
      text: "bunt",
      color: "#0074d9",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      fontSize: "24px",
    });

    expect(node).toEqual({
      text: "bunt",
      color: "#0074d9",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      fontSize: "24px",
    });
  });

  // Der Wert landet in einem Style-Attribut; CSS erlaubt dort mehr als Farben.
  it.each(["url(javascript:alert(1))", "red; background: url(x)", "expression(alert(1))", ""])(
    "wirft die Farbe %p weg",
    (color) => {
      expect(roundTrip({ text: "x", color })).toEqual({ text: "x" });
    },
  );

  it("wirft eine Schriftgröße ohne Einheit weg", () => {
    expect(roundTrip({ text: "x", fontSize: "24" })).toEqual({ text: "x" });
  });

  it("behält die neuen Ja/Nein-Auszeichnungen", () => {
    const node = roundTrip({
      text: "x",
      highlight: true,
      kbd: true,
      superscript: true,
      subscript: true,
      lowercase: true,
    });

    expect(node).toEqual({
      text: "x",
      highlight: true,
      kbd: true,
      superscript: true,
      subscript: true,
      lowercase: true,
    });
  });
});

describe("Einrückung", () => {
  const indentOf = (indent: unknown): number | undefined => {
    const raw = encodeEditorAttribute([{ type: "p", indent, children: [{ text: "x" }] } as never]);
    return parseEditorValue(raw)[0].indent;
  };

  it("behält eine gültige Stufe", () => {
    expect(indentOf(3)).toBe(3);
  });

  it("deckelt bei der Höchsttiefe", () => {
    expect(indentOf(99)).toBe(10);
  });

  it.each([0, -2, "3", Number.NaN])("verwirft %p", (value) => {
    expect(indentOf(value)).toBeUndefined();
  });
});

describe("neue Blocktypen", () => {
  it("behält Codeblock und kleine Überschriften", () => {
    const raw = encodeEditorAttribute([
      { type: "code_block", children: [{ type: "code_line", children: [{ text: "npm test" }] }] },
      { type: "h6", children: [{ text: "klein" }] },
    ] as never);

    expect(parseEditorValue(raw).map((block) => block.type)).toEqual(["code_block", "h6"]);
  });
});
