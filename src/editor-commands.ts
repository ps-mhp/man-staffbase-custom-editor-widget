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
 * Was die Werkzeuge mit dem Plate-Editor tun – und was sie an der
 * Einfügemarke ablesen.
 *
 * Getrennt von der Leiste, damit die Leiste nur zeichnet und die Befehle für
 * sich prüfbar bleiben. Nur aus nachgeladenem Code importieren: die Befehle
 * ziehen `@platejs/*` nach sich.
 */

import type { PlateEditor } from "platejs/react";
import { toggleCodeBlock } from "@platejs/code-block";
import { upsertLink } from "@platejs/link";

import { MARKS, STYLE_MARKS, TextAlign, isSafeUrl } from "./editor-value";

/** Die Absatzformate der Auswahlliste, in ihrer Reihenfolge. */
export const BLOCK_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "p", label: "Fließtext" },
  { value: "h1", label: "Überschrift 1" },
  { value: "h2", label: "Überschrift 2" },
  { value: "h3", label: "Überschrift 3" },
  { value: "h4", label: "Überschrift 4" },
  { value: "h5", label: "Überschrift 5" },
  { value: "h6", label: "Überschrift 6" },
  { value: "blockquote", label: "Zitat" },
  { value: "code_block", label: "Codeblock" },
];

/** Die Stufen der Schriftgröße in Pixeln; 16 ist der Fließtext. */
export const FONT_SIZES: readonly number[] = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
export const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 144;

const LINK_TYPE = "a";

type ToggleTransforms = Record<string, { toggle?: () => void } | undefined>;

const isCodeType = (type: string): boolean => type === "code_block" || type === "code_line";

const QUOTE_TYPE = "blockquote";

/** Der Typ des innersten Blocks an der Einfügemarke; `p`, wenn nichts ausgewählt ist. */
function innerBlockType(editor: PlateEditor): string {
  const entry = editor.api.block();
  const node = entry?.[0] as { type?: string } | undefined;
  return node?.type ?? "p";
}

/**
 * Steht die Marke in einem Zitat? Plate legt ein Zitat als Hülle um seine
 * Absätze (`blockquote > p`); der innerste Block hieße dort nur „Absatz“.
 */
function inQuote(editor: PlateEditor): boolean {
  if (editor.selection === null) return false;
  return editor.api.above({ match: (node: unknown) => (node as { type?: string }).type === QUOTE_TYPE }) !== undefined;
}

/**
 * Das Absatzformat an der Einfügemarke; `p`, wenn nichts ausgewählt ist.
 * Ein Absatz in einem Zitat zählt als Zitat – so zeigt es die Auswahlliste.
 */
export function currentBlockType(editor: PlateEditor): string {
  const inner = innerBlockType(editor);
  return inner !== QUOTE_TYPE && !isCodeType(inner) && inQuote(editor) ? QUOTE_TYPE : inner;
}

/** Was die Auswahlliste „Absatzformat“ zeigt; Unbekanntes zählt als Fließtext. */
export function blockOptionOf(type: string): string {
  if (type === "code_line") return "code_block";
  return BLOCK_OPTIONS.some((option) => option.value === type) ? type : "p";
}

/** Die Ausrichtung des Blocks an der Einfügemarke. */
export function currentAlign(editor: PlateEditor): TextAlign {
  const entry = editor.api.block();
  const node = entry?.[0] as { align?: TextAlign } | undefined;
  return node?.align ?? "left";
}

/** Die Schriftgröße an der Einfügemarke, in Pixeln und ohne Einheit. */
export function readFontSize(raw: unknown): number {
  if (typeof raw !== "string") return DEFAULT_FONT_SIZE;
  const size = Number.parseFloat(raw);
  return Number.isFinite(size) ? Math.round(size) : DEFAULT_FONT_SIZE;
}

/** Die Stufen der Liste – um eine fremde Größe an der Marke ergänzt, damit die Liste sie zeigen kann. */
export function fontSizeOptions(current: number): number[] {
  return FONT_SIZES.includes(current) ? [...FONT_SIZES] : [...FONT_SIZES, current].sort((a, b) => a - b);
}

/**
 * Schaltet eine Auszeichnung um. Die Auszeichnungen aus den Plate-Paketen
 * bringen einen eigenen Umschalter mit; fehlt einer, übernimmt der allgemeine
 * Weg über die Marks.
 */
export function toggleMark(editor: PlateEditor, key: string): void {
  const transforms = editor.tf as unknown as ToggleTransforms;
  const toggle = transforms[key]?.toggle;
  if (typeof toggle === "function") {
    toggle.call(transforms[key]);
    return;
  }
  if (editor.api.marks()?.[key] === true) editor.tf.removeMarks(key);
  else editor.tf.addMarks({ [key]: true });
}

/** Setzt eine Auszeichnung mit Wert — oder nimmt sie weg, wenn keiner kommt. */
export function setStyleMark(editor: PlateEditor, key: string, next: string | undefined): void {
  if (next === undefined || next === "") editor.tf.removeMarks(key);
  else editor.tf.addMarks({ [key]: next });
}

/** Setzt die Schriftgröße; die Größe des Fließtexts heißt „keine eigene“. */
export function setFontSize(editor: PlateEditor, next: number): void {
  const clamped = Math.min(Math.max(Math.round(next), MIN_FONT_SIZE), MAX_FONT_SIZE);
  setStyleMark(editor, "fontSize", clamped === DEFAULT_FONT_SIZE ? undefined : `${clamped}px`);
}

/**
 * Löst Codeblock und Zitat an der Marke auf. Beide sind keine einfachen
 * Absatztypen: ohne das Auflösen läge ein neuer Typ in ihnen statt an ihrer
 * Stelle. Ein zweites Umschalten nimmt Plate jeweils als „wieder heraus“.
 */
function leaveContainers(editor: PlateEditor): void {
  if (isCodeType(innerBlockType(editor))) toggleCodeBlock(editor);
  if (inQuote(editor)) (editor.tf as unknown as ToggleTransforms)[QUOTE_TYPE]?.toggle?.();
}

/** Wechselt das Absatzformat des Blocks an der Einfügemarke. */
export function setBlockType(editor: PlateEditor, type: string): void {
  if (blockOptionOf(currentBlockType(editor)) === type) return;
  leaveContainers(editor);
  if (type === "code_block") {
    toggleCodeBlock(editor);
    return;
  }

  const plain = innerBlockType(editor);
  const transforms = editor.tf as unknown as ToggleTransforms;
  if (type === "p") {
    // Es gibt kein `p.toggle()`; ein zweites Umschalten des aktuellen Typs
    // fällt in Plate immer auf den Absatz zurück.
    if (plain !== "p") transforms[plain]?.toggle?.();
  } else if (plain !== type) {
    transforms[type]?.toggle?.();
  }
}

/**
 * Richtet die Blöcke der Auswahl aus. Kein eigenes Plugin: die Ausrichtung
 * ist eine Eigenschaft am Block, und die Leseansicht liest sie genau so.
 */
export function setAlign(editor: PlateEditor, align: TextAlign): void {
  editor.tf.setNodes({ align } as never, {
    match: (node: unknown) => editor.api.isBlock(node as never),
  });
}

/** Nimmt alle Auszeichnungen von der Auswahl, mit Wert und ohne. */
export function clearFormatting(editor: PlateEditor): void {
  editor.tf.removeMarks([...MARKS, ...STYLE_MARKS] as unknown as string);
}

/** Fügt eine Trennlinie an der Einfügemarke ein. */
export function insertRule(editor: PlateEditor): void {
  editor.tf.insertNodes({ type: "hr", children: [{ text: "" }] } as never);
}

/** Der Link an der Einfügemarke: Adresse und sichtbarer Text, sonst `undefined`. */
export function linkAtSelection(editor: PlateEditor): { url: string; text: string } | undefined {
  if (editor.selection === null) return undefined;
  const entry = editor.api.above({ match: (node: unknown) => (node as { type?: string }).type === LINK_TYPE });
  if (entry === undefined) return undefined;
  const [node, path] = entry as unknown as [{ url?: string }, number[]];
  return { url: node.url ?? "", text: editor.api.string(path as never) ?? "" };
}

/** Der markierte Text – Vorschlag für den Text eines neuen Links. */
export function selectedText(editor: PlateEditor): string {
  return editor.selection === null ? "" : (editor.api.string(editor.selection) ?? "");
}

export type LinkProblem = "empty" | "unsafe";

/** Warum eine Adresse so nicht als Link taugt, oder `undefined`. */
export function linkProblem(url: string): LinkProblem | undefined {
  if (url.trim() === "") return "empty";
  return isSafeUrl(url) ? undefined : "unsafe";
}

/**
 * Setzt einen Link auf die Auswahl oder ändert den Link an der Marke. Eine
 * unsichere Adresse kommt nicht in den Baum; die Leseansicht verwürfe sie
 * ohnehin (`isSafeUrl`).
 *
 * @returns ob der Link gesetzt wurde.
 */
export function applyLink(editor: PlateEditor, url: string, text: string): boolean {
  if (linkProblem(url) !== undefined) return false;
  const address = url.trim();
  upsertLink(editor, { url: address, text: text.trim() || address });
  return true;
}
