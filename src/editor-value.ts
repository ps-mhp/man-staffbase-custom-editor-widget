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
 * Was in der Custom Property liegt.
 *
 * Gespeichert wird der Dokumentbaum des Editors, nicht sein HTML. HTML aus
 * einer Property wieder in die Seite zu setzen hieße, fremde Auszeichnung
 * ungeprüft zu übernehmen; ein Baum aus bekannten Knotentypen lässt sich
 * dagegen beim Lesen auf genau diese Typen zurückschneiden. Die Leseansicht
 * rendert ihn deshalb selbst (`rich-content.tsx`) und braucht kein Plate — das
 * hält das Bundle auf jeder Seite klein, auf der nur gelesen wird.
 *
 * Der Vorabtest vom 09.09.2026 hat gemessen, dass die Grenze nicht an der
 * Property hängt, sondern am gesamten Beitragsdokument (16 MiB, hart
 * abgelehnt statt abgeschnitten). Für Fließtext ist das keine Schranke, also
 * wird hier nicht komprimiert — lesbares JSON ist beim Nachsehen mehr wert.
 */

import { encodePayload, decodePayload, isPayload } from "@shared/payload";

/** Auszeichnungen, die eine Textstelle entweder trägt oder nicht. */
export const MARKS = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "code",
  "highlight",
  "kbd",
  "superscript",
  "subscript",
  // Hebt die Versal-Regel der MAN-Überschriften für eine Stelle auf; siehe
  // `LOWERCASE_CLASS` in `content-class.ts`.
  "lowercase",
] as const;
export type Mark = (typeof MARKS)[number];

/**
 * Auszeichnungen mit einem Wert statt eines Ja/Nein.
 *
 * Sie stehen getrennt, weil sie anders geprüft werden müssen: ein `true` ist
 * unbedenklich, eine Zeichenkette landet dagegen in einem Style-Attribut und
 * wird deshalb unten gegen ein Muster gehalten.
 */
export const STYLE_MARKS = ["color", "backgroundColor", "fontSize"] as const;
export type StyleMark = (typeof STYLE_MARKS)[number];

/** Ein Textstück mit seinen Auszeichnungen. */
export type RichText = { text: string } & Partial<Record<Mark, boolean>> &
  Partial<Record<StyleMark, string>>;

/** Blocktypen, die der Editor kennt — und nur diese überleben das Lesen. */
export const BLOCK_TYPES = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "lic",
  "hr",
  "code_block",
  "code_line",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type TextAlign = "left" | "center" | "right" | "justify";

/** So weit lässt sich ein Block einrücken — darüber hinaus bliebe kein Text. */
export const MAX_INDENT = 10;

export interface RichElement {
  type: BlockType | "a";
  children: RichNode[];
  /** Nur bei `a`. */
  url?: string;
  /** Nur bei Blöcken. */
  align?: TextAlign;
  /** Einrücktiefe eines Blocks, gezählt in Stufen. */
  indent?: number;
}

export type RichNode = RichText | RichElement;

/** Der Dokumentbaum. */
export type EditorValue = RichElement[];

/** Ein leeres Dokument — Plate verlangt mindestens einen Block. */
export function emptyValue(): EditorValue {
  return [{ type: "p", children: [{ text: "" }] }];
}

const BLOCK_SET = new Set<string>(BLOCK_TYPES);
const ALIGNS = new Set<string>(["left", "center", "right", "justify"]);

/**
 * Was als Farbe durchgeht.
 *
 * Nur Hex und `rgb()`/`rgba()` mit Zahlen — also genau das, was die Farbwahl
 * des Editors erzeugt. Ein freier Farbstring käme in ein Style-Attribut, und
 * CSS erlaubt dort mehr als Farben (`url(...)` etwa).
 */
const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.\s,%/]+\))$/;

/** Schriftgrößen kommen als Pixel- oder em-Wert aus der Werkzeugleiste. */
const FONT_SIZE_PATTERN = /^\d{1,3}(\.\d+)?(px|em|rem|pt)$/;

const STYLE_MARK_PATTERNS: Record<StyleMark, RegExp> = {
  color: COLOR_PATTERN,
  backgroundColor: COLOR_PATTERN,
  fontSize: FONT_SIZE_PATTERN,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Schneidet einen Knoten auf das zurück, was die Leseansicht darstellen kann.
 *
 * Alles Unbekannte fällt weg statt durchgereicht zu werden: der Baum stammt
 * zwar aus dem eigenen Editor, kommt aber über ein frei beschreibbares
 * Textfeld — und was nicht ankommt, kann auch nicht falsch gerendert werden.
 */
function sanitizeNode(node: unknown): RichNode | null {
  if (!isRecord(node)) return null;

  if (typeof node.text === "string") {
    const text: RichText = { text: node.text };
    for (const mark of MARKS) {
      if (node[mark] === true) text[mark] = true;
    }
    for (const mark of STYLE_MARKS) {
      const value = node[mark];
      if (typeof value === "string" && STYLE_MARK_PATTERNS[mark].test(value.trim())) {
        text[mark] = value.trim();
      }
    }
    return text;
  }

  const type = node.type;
  if (typeof type !== "string") return null;

  if (type === "a") {
    const url = typeof node.url === "string" ? node.url : "";
    if (!isSafeUrl(url)) return null;
    return { type: "a", url, children: sanitizeChildren(node.children) };
  }

  if (!BLOCK_SET.has(type)) return null;

  const element: RichElement = { type: type as BlockType, children: sanitizeChildren(node.children) };
  if (typeof node.align === "string" && ALIGNS.has(node.align)) {
    element.align = node.align as TextAlign;
  }
  if (typeof node.indent === "number" && Number.isFinite(node.indent) && node.indent > 0) {
    element.indent = Math.min(Math.floor(node.indent), MAX_INDENT);
  }
  return element;
}

function sanitizeChildren(children: unknown): RichNode[] {
  if (!Array.isArray(children)) return [{ text: "" }];
  const kept = children.map(sanitizeNode).filter((child): child is RichNode => child !== null);
  return kept.length > 0 ? kept : [{ text: "" }];
}

/**
 * Ob eine Verweisadresse gerendert werden darf.
 *
 * `javascript:` und `data:` sind die beiden Schemata, mit denen ein Verweis
 * Code ausführt; relative Adressen und die üblichen Schemata bleiben erlaubt.
 */
export function isSafeUrl(url: string): boolean {
  const scheme = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  if (scheme === null) return true;
  return ["http", "https", "mailto", "tel"].includes(scheme[1].toLowerCase());
}

/** Die Entitäten, die ein HTML-Maskierer üblicherweise erzeugt. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

/**
 * Macht die HTML-Maskierung eines Attributwerts rückgängig.
 *
 * Der Wert steht in einem Attribut der Artikel-HTML, und auf dem Weg zur
 * veröffentlichten Seite läuft diese HTML durch mehrere Hände: Bereinigung,
 * Übersetzung, Zwischenspeicher. Manche davon maskieren beim erneuten
 * Ausgeben mehr, als der Browser beim Einlesen wieder auflöst — vor allem der
 * Schrägstrich (`&#x2F;`), den strenge Maskierer aus alter Gewohnheit
 * mitnehmen. Genau der kommt in Base64 laufend vor, und ein einziger davon
 * ließ bisher das ganze Dokument durchfallen: die Prüfung in `decodePayload`
 * lehnt ab, `parseEditorValue` fällt auf ein leeres Dokument zurück, und die
 * Seite zeigt nichts an, obwohl der Inhalt gespeichert ist.
 *
 * Die Schleife läuft mehrfach, weil zweimaliges Maskieren (`&amp;#x2F;`)
 * ebenso vorkommt. Drei Durchgänge sind reichlich; die Grenze verhindert nur,
 * dass eine boshafte Eingabe hier ewig kreist.
 */
function decodeEntities(text: string): string {
  let current = text;

  for (let pass = 0; pass < 3 && current.includes("&"); pass += 1) {
    const next = current.replace(/&(#[Xx]?[0-9A-Fa-f]+|[A-Za-z]+);/g, (whole, body: string) => {
      if (body.startsWith("#")) {
        const hex = body[1] === "x" || body[1] === "X";
        const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
        // Ungültige Zahlen bleiben stehen: lieber unverändert als zerstört.
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    });

    if (next === current) break;
    current = next;
  }

  return current;
}

/** Liest den Baum aus dem Attributwert; liefert bei allem Unbrauchbaren ein leeres Dokument. */
export function parseEditorValue(raw: string | undefined): EditorValue {
  if (!raw) return emptyValue();

  const text = decodeEntities(raw).trim();
  // Base64 kennt keinen Zwischenraum. Steht doch einer drin, hat ihn ein
  // Umbruch beim Ausgeben der HTML hinterlassen — er darf die Prüfung nicht
  // scheitern lassen.
  const attribute = isPayload(text) ? text.replace(/\s+/g, "") : text;

  const json = isPayload(attribute) ? decodePayload(attribute) : attribute;
  if (json === null) return emptyValue();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return emptyValue();
  }

  if (!Array.isArray(parsed)) return emptyValue();

  const blocks = parsed
    .map(sanitizeNode)
    .filter((node): node is RichElement => node !== null && "type" in node);

  return blocks.length > 0 ? blocks : emptyValue();
}

/** Schreibt den Baum so, wie er im Attribut steht. */
export function encodeEditorAttribute(value: EditorValue): string {
  return encodePayload(JSON.stringify(value));
}

/** Ob das Dokument nichts als leere Blöcke enthält. */
export function isEmptyValue(value: EditorValue): boolean {
  const text = (node: RichNode): string =>
    "text" in node ? node.text : node.children.map(text).join("");
  const hasVoid = value.some((block) => block.type === "hr");
  return value.map(text).join("").trim() === "" && !hasVoid;
}
