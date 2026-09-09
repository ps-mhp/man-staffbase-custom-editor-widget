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
 * Das Drahtformat für die Übersetzung des Editorinhalts.
 *
 * `POST /api/translations` übersetzt Textknoten und lässt Attribute in Ruhe —
 * beobachtet, und genau der Grund, warum der Inhalt nicht einfach im
 * `content`-Attribut mitreisen kann. Er wird deshalb als echtes HTML
 * verschickt: der Text reist dorthin, wo der Dienst ihn anfasst, die Zuordnung
 * reist im Attribut, wo er es nicht tut.
 *
 * **Warum je Textstück und nicht je Absatz zurückgelesen wird.** Ein Absatz
 * besteht aus mehreren Textstücken mit je eigenen Auszeichnungen (fett, Farbe,
 * Größe). Käme der Absatz als ein Stück Markup zurück, müssten wir aus dem
 * Ergebnis wieder Auszeichnungen herauslesen — und würden dabei alles
 * verlieren, was der Dienst unterwegs umgeformt hat. Stattdessen bekommt jedes
 * Textstück eine eigene Hülle mit laufender Nummer; zurück kommt nur der
 * Klartext, und die Auszeichnungen bleiben unangetastet im Modell.
 *
 * Der Preis davon ist ehrlich zu benennen: übersetzt der Dienst einen Satz mit
 * anderer Wortstellung, kann eine Hervorhebung am falschen Wort landen. Das
 * ist derselbe Kompromiss, den das Tabellen-Widget für seinen Rich-Text
 * eingeht — und deutlich besser als der umgekehrte Fehler, bei dem die
 * Formatierung ganz verschwindet.
 *
 * Verschachtelt statt flach: Listen bleiben Listen, Überschriften bleiben
 * Überschriften. Der Zusammenhang hilft einer maschinellen Übersetzung bei
 * kurzen Stücken messbar — und es ist dieselbe Gestalt, die der Dienst bei
 * einem gewöhnlichen Artikel ohnehin bekommt.
 */

import { EditorValue, RichElement, RichNode, RichText, parseEditorValue } from "./editor-value";

/** Kennzeichnet den Behälter, damit die Antwort in jeder Form auffindbar ist. */
export const DOC_MARKER = "data-ce-doc";

/** Die laufende Nummer eines Textstücks — das Einzige, was die Übersetzung zurückordnet. */
export const TEXT_ATTRIBUTE = "data-ce-text";

/**
 * Blocktyp zu HTML-Tag.
 *
 * Eine eigene Tabelle statt der aus `rich-content.tsx`: dieses Modul läuft im
 * `fetch`-Umweg des Übersetzungsdienstes, und dorthin gehört kein React.
 */
const BLOCK_TAGS: Record<string, string> = {
  p: "p",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  blockquote: "blockquote",
  ul: "ul",
  ol: "ol",
  li: "li",
  lic: "span",
  a: "span",
};

/**
 * Blöcke, deren Inhalt nicht übersetzt werden darf.
 *
 * Code ist keine Sprache, die jemand übersetzen will — ein übersetztes
 * Schlüsselwort ist kaputter Code. `hr` hat gar keinen Text.
 */
const UNTRANSLATABLE = new Set(["code_block", "code_line", "hr"]);

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Läuft den Baum in Dokumentreihenfolge ab und ruft `onText` für jedes
 * Textstück auf, das nicht in einem unübersetzbaren Block liegt.
 */
function walk(nodes: readonly RichNode[], onText: (node: RichText) => void): void {
  for (const node of nodes) {
    if ("text" in node) {
      onText(node);
      continue;
    }
    if (UNTRANSLATABLE.has(node.type)) continue;
    walk(node.children, onText);
  }
}

/**
 * Die laufenden Nummern aller übersetzbaren Textstücke.
 *
 * Hin- und Rückweg leiten ihre Nummern aus **derselben** Funktion ab, statt
 * jeder für sich mitzuzählen. Zwei getrennte Zähler mit denselben
 * Auslassungsregeln wären genau die Art von Doppelung, die irgendwann
 * auseinanderdriftet — und eine Nummer daneben heißt: jeder Satz steht an der
 * falschen Stelle.
 *
 * Die Zuordnung geht über die Knotenidentität, nicht über einen Pfad: der
 * Baum, der hier durchlaufen wird, ist derselbe, der gleich gerendert oder
 * ersetzt wird.
 */
function textNumbers(value: EditorValue): Map<RichText, number> {
  const numbers = new Map<RichText, number>();
  walk(value, (node) => {
    // Leere Stücke bekommen keine Nummer: sie tragen nichts bei, und eine
    // leere Hülle lädt den Dienst nur ein, dort etwas hineinzuschreiben.
    if (node.text !== "") numbers.set(node, numbers.size);
  });
  return numbers;
}

/** Der Inhalt als übersetzbares Dokument. */
export function editorValueToTranslatableHtml(value: EditorValue): string {
  const numbers = textNumbers(value);

  const renderNodes = (nodes: readonly RichNode[]): string =>
    nodes
      .map((node) => {
        if ("text" in node) {
          const number = numbers.get(node);
          if (number === undefined) return "";
          return `<span ${TEXT_ATTRIBUTE}="${number}">${escapeHtml(node.text)}</span>`;
        }

        if (UNTRANSLATABLE.has(node.type)) return "";

        const tag = BLOCK_TAGS[node.type] ?? "div";
        return `<${tag}>${renderNodes(node.children)}</${tag}>`;
      })
      .join("");

  return `<div ${DOC_MARKER}="1">${renderNodes(value)}</div>`;
}

/** Ob eine Zeichenkette wie eine Antwort auf {@link editorValueToTranslatableHtml} aussieht. */
export const isTranslatedEditorHtml = (html: string): boolean => html.includes(TEXT_ATTRIBUTE);

/**
 * Liest die übersetzten Textstücke heraus, nach laufender Nummer.
 *
 * Nur `textContent`: was der Dienst an Markup hinzuerfindet, hat im Modell
 * nichts verloren — die Auszeichnungen stehen dort schon.
 */
export function readTranslatedTexts(html: string): Map<number, string> {
  const texts = new Map<number, string>();
  if (!isTranslatedEditorHtml(html)) return texts;

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll(`[${TEXT_ATTRIBUTE}]`).forEach((element) => {
    const key = Number(element.getAttribute(TEXT_ATTRIBUTE));
    if (!Number.isInteger(key) || texts.has(key)) return;
    texts.set(key, element.textContent ?? "");
  });

  return texts;
}

/**
 * Gibt `value` zurück, in dem jedes von der Übersetzung erfasste Textstück
 * ersetzt ist.
 *
 * Ein Stück bleibt in der Ausgangssprache, wenn die Übersetzung nichts zu
 * seiner Nummer hat oder es auf nichts zusammengestrichen hat. Beides heißt,
 * dass der Dienst Inhalt verloren statt übersetzt hat — und ein Satz in der
 * falschen Sprache ist immer noch besser als eine leere Zeile.
 */
export function applyTranslatedTexts(
  value: EditorValue,
  texts: ReadonlyMap<number, string>,
): EditorValue {
  if (texts.size === 0) return value;

  const numbers = textNumbers(value);

  const mapNodes = (nodes: readonly RichNode[]): RichNode[] =>
    nodes.map((node) => {
      if ("text" in node) {
        const number = numbers.get(node);
        if (number === undefined) return node;
        const translated = texts.get(number);
        if (translated === undefined || translated.trim() === "") return node;
        return { ...node, text: translated };
      }

      if (UNTRANSLATABLE.has(node.type)) return node;
      return { ...node, children: mapNodes(node.children) };
    });

  return mapNodes(value) as RichElement[];
}

/**
 * Ob im Dokument überhaupt etwas steht, das sich übersetzen ließe.
 *
 * Strenger als die Nummernvergabe: die zählt jedes nicht-leere Stück, hier
 * entscheidet sich, ob eine Anfrage überhaupt lohnt — ein Dokument aus lauter
 * Leerzeichen ist keine Übersetzung wert.
 */
export function hasTranslatableText(value: EditorValue): boolean {
  let found = false;
  walk(value, (node) => {
    if (node.text.trim() !== "") found = true;
  });
  return found;
}

/** Bequemlichkeit für den Anbieter: Attributwert zu Baum. */
export const readStored = (stored: string | null): EditorValue =>
  parseEditorValue(stored ?? undefined);
