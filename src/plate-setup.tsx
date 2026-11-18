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
 * Plugins und Knoten-Komponenten des Plate-Editors.
 *
 * Nur aus nachgeladenem Code importieren (`plate-editor.tsx`): hier stehen
 * die statischen Importe von `platejs`, und Plate samt Slate wiegt ein
 * Vielfaches des Widgets. Auf einer veröffentlichten Seite darf davon nichts
 * ankommen.
 *
 * Jeder Knotentyp erzeugt exakt das Markup, das die Leseansicht
 * (`rich-content.tsx`) aus demselben Baum wieder aufbaut – so gelten für
 * Schreibfläche und Seite dieselben Regeln aus `rich-content.scss`.
 */

import React, { ReactElement } from "react";

import { PlateElement, PlateLeaf } from "platejs/react";
import type { PlateElementProps, PlateLeafProps } from "platejs/react";
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HighlightPlugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  KbdPlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { FontBackgroundColorPlugin, FontColorPlugin, FontSizePlugin } from "@platejs/basic-styles/react";
import { IndentPlugin } from "@platejs/indent/react";
import { CodeBlockPlugin, CodeLinePlugin } from "@platejs/code-block/react";
import {
  BulletedListPlugin,
  ListItemContentPlugin,
  ListItemPlugin,
  ListPlugin,
  NumberedListPlugin,
} from "@platejs/list-classic/react";
import { LinkPlugin } from "@platejs/link/react";

import { TextAlign } from "./editor-value";

// Plate rendert jeden Knotentyp über eine Komponente. `PlateElement` bringt
// die Slate-Attribute mit; `as` bestimmt nur noch das Tag.
const block =
  (tag: keyof React.JSX.IntrinsicElements) =>
  (props: PlateElementProps): ReactElement => {
    const element = props.element as { align?: TextAlign; indent?: number };
    const style: React.CSSProperties = {};
    if (element.align !== undefined) style.textAlign = element.align;
    if (element.indent !== undefined && element.indent > 0) {
      style.marginInlineStart = `${element.indent * 1.5}em`;
    }
    return (
      <PlateElement {...props} as={tag as "div"} style={Object.keys(style).length > 0 ? style : undefined} />
    );
  };

const mark =
  (tag: "strong" | "em" | "u" | "s" | "code" | "mark" | "kbd" | "sup" | "sub") =>
  (props: PlateLeafProps): ReactElement =>
    <PlateLeaf {...props} as={tag} />;

function LinkElement(props: PlateElementProps): ReactElement {
  const url = (props.element as { url?: string }).url ?? "";
  return <PlateElement {...props} as="a" attributes={{ ...props.attributes, href: url }} />;
}

function HorizontalRuleElement(props: PlateElementProps): ReactElement {
  // Ein `hr` ist ein Void-Element: Slates Kinder müssen im Baum bleiben, dürfen
  // aber nicht ins `hr` — sonst wirft React.
  return (
    <PlateElement {...props} as="div">
      <div contentEditable={false}>
        <hr />
      </div>
      {props.children}
    </PlateElement>
  );
}

export const COMPONENTS = {
  p: block("p"),
  h1: block("h1"),
  h2: block("h2"),
  h3: block("h3"),
  h4: block("h4"),
  h5: block("h5"),
  h6: block("h6"),
  blockquote: block("blockquote"),
  ul: block("ul"),
  ol: block("ol"),
  li: block("li"),
  lic: block("div"),
  code_block: block("pre"),
  code_line: block("div"),
  hr: HorizontalRuleElement,
  a: LinkElement,
  bold: mark("strong"),
  italic: mark("em"),
  underline: mark("u"),
  strikethrough: mark("s"),
  code: mark("code"),
  highlight: mark("mark"),
  kbd: mark("kbd"),
  superscript: mark("sup"),
  subscript: mark("sub"),
};

// Die Einrückung hängt als Zahl am Block. Ohne diese Liste wüsste das Plugin
// nicht, welche Blöcke sie überhaupt tragen dürfen — Listenpunkte etwa rücken
// über ihre Verschachtelung ein und nicht über diese Eigenschaft.
const INDENTABLE = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"];

export const PLUGINS = [
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
  CodeBlockPlugin,
  CodeLinePlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  HighlightPlugin,
  KbdPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  FontColorPlugin,
  FontBackgroundColorPlugin,
  FontSizePlugin,
  IndentPlugin.configure({ inject: { targetPlugins: INDENTABLE } }),
  ListPlugin,
  BulletedListPlugin,
  NumberedListPlugin,
  ListItemPlugin,
  ListItemContentPlugin,
  LinkPlugin,
];
