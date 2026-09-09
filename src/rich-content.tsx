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
 * Die Leseansicht des Dokuments.
 *
 * Bewusst ohne Plate: der Editor wiegt ein Vielfaches des Widgets, und auf
 * einer veröffentlichten Seite wird nur gelesen. Der Baum besteht nach
 * `parseEditorValue` ausschließlich aus bekannten Knotentypen, also genügt
 * eine Abbildung Typ -> Element. `dangerouslySetInnerHTML` kommt nicht vor.
 */

import React, { ReactElement, ReactNode } from "react";

import { RichNode, RichText, RichElement, EditorValue, MARKS, STYLE_MARKS } from "./editor-value";
import { LOWERCASE_CLASS } from "./content-class";

const BLOCK_TAGS: Record<string, keyof React.JSX.IntrinsicElements> = {
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
  lic: "div",
  hr: "hr",
  // Ein Codeblock ist außen `pre` (bewahrt Umbrüche), seine Zeilen sind die
  // Kinder — deshalb steht hier `pre` und nicht `pre > code`.
  code_block: "pre",
  code_line: "div",
};

/** Wie weit eine Einrückstufe den Block nach rechts schiebt. */
const INDENT_STEP_EM = 1.5;

/** Die Auszeichnungen mit Wert übersetzen sich eins zu eins in CSS. */
function styleFromMarks(node: RichText): React.CSSProperties | undefined {
  let style: React.CSSProperties | undefined;
  for (const mark of STYLE_MARKS) {
    const value = node[mark];
    if (value === undefined) continue;
    style = { ...style, [mark]: value };
  }
  return style;
}

function renderText(node: RichText, key: number): ReactNode {
  // Ein leerer Textknoten am Blockende ist eine leere Zeile und muss sie
  // bleiben: ohne Zero-Width-Space fällt der Absatz auf Höhe null zusammen.
  let content: ReactNode = node.text === "" ? "\u200B" : node.text;

  for (const mark of MARKS) {
    if (node[mark] !== true) continue;
    if (mark === "bold") content = <strong>{content}</strong>;
    if (mark === "italic") content = <em>{content}</em>;
    if (mark === "underline") content = <u>{content}</u>;
    if (mark === "strikethrough") content = <s>{content}</s>;
    if (mark === "code") content = <code>{content}</code>;
    if (mark === "kbd") content = <kbd>{content}</kbd>;
    if (mark === "highlight") content = <mark>{content}</mark>;
    if (mark === "superscript") content = <sup>{content}</sup>;
    if (mark === "subscript") content = <sub>{content}</sub>;
    if (mark === "lowercase") content = <span className={LOWERCASE_CLASS}>{content}</span>;
  }

  // Farbe, Schriftgröße und Schriftart hängen zusammen an einer Hülle statt an
  // je einem eigenen Element: sie beschreiben dieselbe Textstelle.
  const style = styleFromMarks(node);
  if (style !== undefined) content = <span style={style}>{content}</span>;

  return <React.Fragment key={key}>{content}</React.Fragment>;
}

function renderNode(node: RichNode, key: number): ReactNode {
  if ("text" in node) return renderText(node, key);

  const children = node.children.map(renderNode);

  if (node.type === "a") {
    return (
      <a key={key} href={node.url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  const element = node as RichElement;
  const Tag = BLOCK_TAGS[element.type] ?? "p";

  let style: React.CSSProperties | undefined;
  if (element.align !== undefined) style = { ...style, textAlign: element.align };
  if (element.indent !== undefined && element.indent > 0) {
    style = { ...style, marginInlineStart: `${element.indent * INDENT_STEP_EM}em` };
  }

  // `hr` ist leer; ein Kind darin wäre ein Laufzeitfehler in React.
  if (Tag === "hr") return <hr key={key} />;

  return (
    <Tag key={key} style={style}>
      {children}
    </Tag>
  );
}

export interface RichContentProps {
  value: EditorValue;
  className?: string;
}

/** Stellt den gespeicherten Baum dar. */
export function RichContent({ value, className }: RichContentProps): ReactElement {
  return <div className={className}>{value.map(renderNode)}</div>;
}
