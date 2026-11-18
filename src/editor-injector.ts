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

import React from "react";
import { Type } from "lucide-react";

import { FieldModalShellOptions, startFieldModalInjector } from "@shared/config-modal";

import { EditorValue, parseEditorValue, serializeEditorValue } from "./editor-value";

const FIELD_KEY = "content";

/**
 * Der Editor kommt erst, wenn ein Dialog ihn zeigt: Plate samt Slate und
 * `@man/config-ui` (Radix, Tailwind) wiegen ein Vielfaches des Widgets, und
 * auf einer veröffentlichten Seite öffnet niemand den Dialog. Hier bleibt nur,
 * was der Rahmen braucht, bevor der Editor da ist: Name, Icon, Status.
 */
const loadEditor = () => import("./plate-editor");

const LazyEditor = React.lazy(loadEditor);

/** Die Hilfe aus demselben Chunk wie der Editor; ihr Text gehört nicht ins Seitenbündel. */
const LazyEditorHelp = React.lazy(() => loadEditor().then((module) => ({ default: module.CustomEditorHelp })));

const LOADING = React.createElement("p", { className: "p-6 text-sm text-muted-foreground" }, "Editor wird geladen …");

/**
 * Was der gemeinsame Rahmen vom Editor wissen muss. Offengelegt für Tests.
 *
 * Keine Vorschau: die Schreibfläche zeigt schon Schriften und Abstände der
 * Seite, eine zweite Ansicht desselben Textes brächte nichts. Keine Prüfung:
 * jeder Baum lässt sich schreiben, `parseEditorValue` schneidet beim Lesen
 * alles Unbekannte weg, und eine unsichere Adresse lässt schon das
 * Link-Formular nicht durch.
 */
export const customEditorShell: FieldModalShellOptions<EditorValue> = {
  widgetName: "Editor",
  title: "Text bearbeiten",
  icon: Type,
  preview: false,
  help: React.createElement(React.Suspense, { fallback: null }, React.createElement(LazyEditorHelp)),
  // Der Rahmen fragt nur, solange der Entwurf vom Übernommenen abweicht –
  // eine feste Zeile genügt.
  statusText: () => "Text geändert",
};

/**
 * Setzt den Editor an die Stelle des `content`-Feldes im Dialog.
 *
 * Geschrieben wird `serializeEditorValue`: derselbe Base64-Baum wie bisher,
 * aber ohne Plates Knotenkennungen. Der Rahmen vergleicht über genau diese
 * Form – ein Klick in den Text ist so keine Änderung, „Übernehmen“ bleibt
 * aus, und ein unveränderter Block wird nie neu geschrieben.
 */
export function startEditorInjector(root: ParentNode = document): () => void {
  return startFieldModalInjector<EditorValue>({
    fieldKey: FIELD_KEY,
    root,
    reopenLabel: "Inhalt bearbeiten",
    modalTestId: "custom-editor-modal",
    reopenTestId: "custom-editor-reopen",
    parse: parseEditorValue,
    serialize: serializeEditorValue,
    shell: customEditorShell,
    render: ({ value, onChange }) =>
      React.createElement(React.Suspense, { fallback: LOADING }, React.createElement(LazyEditor, { value, onChange })),
  });
}
