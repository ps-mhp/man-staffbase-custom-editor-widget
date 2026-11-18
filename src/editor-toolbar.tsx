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
 * Die Werkzeugleiste „Format“ über der Schreibfläche, aus den Bausteinen
 * von `@man/config-ui`.
 *
 * Reihenfolge wie im Screen: Absatzformat · Fett, Kursiv, Unterstrichen,
 * Durchgestrichen, Code · Aufzählung, Nummerierung · Ausrichtung ·
 * Trennlinie, Link. Was der Editor darüber hinaus kann, steht am Ende der
 * jeweiligen Gruppe (Ein-/Ausrücken, Blocksatz, Link entfernen) oder hinter
 * einer Liste (weitere Auszeichnungen, Farben) – so passt die Leiste in eine
 * Zeile, und kein Werkzeug des Bestands geht verloren.
 *
 * Die Leiste zeichnet nur: was ein Werkzeug tut, steht in
 * `editor-commands.ts`, und `run` gibt danach der Schreibfläche den Fokus
 * zurück.
 */

import React, { ReactElement } from "react";
import {
  Baseline,
  Bold,
  Check,
  Code,
  Ellipsis,
  Highlighter,
  Italic,
  Keyboard,
  Link,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Minus,
  PaintBucket,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Underline,
  Unlink,
} from "lucide-react";
import type { PlateEditor } from "platejs/react";
import { indent, outdent } from "@platejs/indent";
import { unwrapLink } from "@platejs/link";
import { useListToolbarButton, useListToolbarButtonState } from "@platejs/list-classic/react";

import type { IconComponent } from "@man/config-ui/form/segmented";
import { ToolButton, ToolSelect } from "@man/config-ui/toolbar/tool-button";
import { ToolMenu, ToolMenuItem } from "@man/config-ui/toolbar/tool-menu";
import { ToolSeparator, Toolbar } from "@man/config-ui/toolbar/toolbar";

import { ColorMenu } from "./color-menu";
import {
  BLOCK_OPTIONS,
  blockOptionOf,
  clearFormatting,
  currentAlign,
  currentBlockType,
  fontSizeOptions,
  insertRule,
  linkAtSelection,
  readFontSize,
  setAlign,
  setBlockType,
  setFontSize,
  setStyleMark,
  toggleMark,
} from "./editor-commands";
import { TextAlign } from "./editor-value";

interface MarkTool {
  key: string;
  label: string;
  icon: IconComponent;
  shortcut?: string;
}

/** Die Auszeichnungen des Screens, als eigene Knöpfe. */
const MARK_TOOLS: readonly MarkTool[] = [
  { key: "bold", label: "Fett", icon: Bold, shortcut: "⌘/Strg B" },
  { key: "italic", label: "Kursiv", icon: Italic, shortcut: "⌘/Strg I" },
  { key: "underline", label: "Unterstrichen", icon: Underline, shortcut: "⌘/Strg U" },
  { key: "strikethrough", label: "Durchgestrichen", icon: Strikethrough },
  { key: "code", label: "Code", icon: Code },
];

/** Die übrigen Auszeichnungen des Bestands, hinter „Weitere Auszeichnungen“. */
const MORE_MARK_TOOLS: readonly MarkTool[] = [
  { key: "highlight", label: "Hervorgehoben", icon: Highlighter },
  { key: "superscript", label: "Hochgestellt", icon: Superscript },
  { key: "subscript", label: "Tiefgestellt", icon: Subscript },
  { key: "kbd", label: "Taste", icon: Keyboard },
];

const ALIGN_TOOLS: ReadonlyArray<{ value: TextAlign; label: string; icon: IconComponent }> = [
  { value: "left", label: "Linksbündig", icon: TextAlignStart },
  { value: "center", label: "Zentriert", icon: TextAlignCenter },
  { value: "right", label: "Rechtsbündig", icon: TextAlignEnd },
  { value: "justify", label: "Blocksatz", icon: TextAlignJustify },
];

// Ein Eintrag einer Liste darf der Schreibfläche den Fokus nicht nehmen:
// der Befehl gilt dem markierten Text.
const keepSelection = (event: React.MouseEvent): void => event.preventDefault();

/**
 * Ein Listenknopf. Eigene Komponente, weil Plates Listen-Hooks den Editor
 * aus dem Kontext ziehen und unterhalb von `<Plate>` laufen müssen.
 */
function ListButton({ type, label, icon }: { type: string; label: string; icon: IconComponent }): ReactElement {
  const state = useListToolbarButtonState({ nodeType: type });
  const { props } = useListToolbarButton(state);
  return <ToolButton label={label} icon={icon} pressed={props.pressed} onClick={props.onClick} />;
}

export interface EditorToolbarProps {
  editor: PlateEditor;
  /** Führt einen Befehl aus, gibt der Schreibfläche den Fokus zurück und zeichnet die Leiste neu. */
  run: (change: () => void) => void;
  /** Öffnet das Formular für einen Link an der Einfügemarke. */
  onLink: () => void;
}

function MoreMarksMenu({ editor, run, marks }: Pick<EditorToolbarProps, "editor" | "run"> & { marks: Record<string, unknown> }): ReactElement {
  return (
    <ToolMenu label="Weitere Auszeichnungen" icon={Ellipsis} testId="custom-editor-more-marks">
      {(close) => (
        <>
          {MORE_MARK_TOOLS.map(({ key, label, icon }) => {
            const active = marks[key] === true;
            return (
              <ToolMenuItem
                key={key}
                icon={icon}
                aria-pressed={active}
                onMouseDown={keepSelection}
                onClick={() => {
                  run(() => toggleMark(editor, key));
                  close();
                }}
              >
                <span className="flex-1">{label}</span>
                {active && <Check aria-hidden className="size-4 shrink-0 text-primary" />}
              </ToolMenuItem>
            );
          })}
          <div aria-hidden className="my-1 h-px bg-border" />
          <ToolMenuItem
            icon={RemoveFormatting}
            onMouseDown={keepSelection}
            onClick={() => {
              run(() => clearFormatting(editor));
              close();
            }}
          >
            Formatierung entfernen
          </ToolMenuItem>
        </>
      )}
    </ToolMenu>
  );
}

export function EditorToolbar({ editor, run, onLink }: EditorToolbarProps): ReactElement {
  const blockType = currentBlockType(editor);
  const align = currentAlign(editor);
  const marks = (editor.api.marks() ?? {}) as Record<string, unknown>;
  const fontSize = readFontSize(marks.fontSize);
  const inLink = linkAtSelection(editor) !== undefined;
  const colorOf = (key: string): string | undefined => (typeof marks[key] === "string" ? (marks[key] as string) : undefined);

  return (
    <Toolbar aria-label="Format" data-testid="custom-editor-toolbar">
      <ToolSelect
        label="Absatzformat"
        className="min-w-[150px]"
        value={blockOptionOf(blockType)}
        onChange={(event) => {
          const next = event.target.value;
          run(() => setBlockType(editor, next));
        }}
      >
        {BLOCK_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </ToolSelect>

      <ToolSeparator />

      {MARK_TOOLS.map(({ key, label, icon, shortcut }) => (
        <ToolButton
          key={key}
          label={label}
          icon={icon}
          title={shortcut === undefined ? label : `${label} (${shortcut})`}
          pressed={marks[key] === true}
          onClick={() => run(() => toggleMark(editor, key))}
        />
      ))}
      <MoreMarksMenu editor={editor} run={run} marks={marks} />

      <ToolSeparator />

      <ListButton type="ul" label="Aufzählung" icon={List} />
      <ListButton type="ol" label="Nummerierte Liste" icon={ListOrdered} />
      <ToolButton label="Ausrücken" icon={ListIndentDecrease} onClick={() => run(() => outdent(editor))} />
      <ToolButton label="Einrücken" icon={ListIndentIncrease} onClick={() => run(() => indent(editor))} />

      <ToolSeparator />

      {ALIGN_TOOLS.map(({ value, label, icon }) => (
        <ToolButton key={value} label={label} icon={icon} pressed={align === value} onClick={() => run(() => setAlign(editor, value))} />
      ))}

      <ToolSeparator />

      <ToolButton label="Trennlinie einfügen" icon={Minus} onClick={() => run(() => insertRule(editor))} />
      <ToolButton label={inLink ? "Link bearbeiten" : "Link einfügen"} icon={Link} onClick={onLink}>
        Link
      </ToolButton>
      <ToolButton label="Link entfernen" icon={Unlink} disabled={!inLink} onClick={() => run(() => unwrapLink(editor))} />

      <ToolSeparator />

      <ToolSelect
        label="Schriftgröße"
        value={String(fontSize)}
        onChange={(event) => {
          const next = Number(event.target.value);
          run(() => setFontSize(editor, next));
        }}
      >
        {fontSizeOptions(fontSize).map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </ToolSelect>
      <ColorMenu
        label="Textfarbe"
        icon={Baseline}
        testId="custom-editor-color"
        value={colorOf("color")}
        standardBar="var(--foreground)"
        onPick={(color) => run(() => setStyleMark(editor, "color", color))}
      />
      <ColorMenu
        label="Texthintergrund"
        icon={PaintBucket}
        testId="custom-editor-background"
        value={colorOf("backgroundColor")}
        standardBar="transparent"
        onPick={(color) => run(() => setStyleMark(editor, "backgroundColor", color))}
      />
    </Toolbar>
  );
}
