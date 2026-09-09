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

import { startFieldModalInjector } from "@shared/config-modal";

import { EditorValue, parseEditorValue, encodeEditorAttribute } from "./editor-value";
import { EditorModal } from "./editor-modal";

const FIELD_KEY = "content";

/** Setzt den Editor an die Stelle des `content`-Feldes im Dialog. */
export function startEditorInjector(root: ParentNode = document): () => void {
  return startFieldModalInjector<EditorValue>({
    fieldKey: FIELD_KEY,
    root,
    reopenLabel: "Inhalt bearbeiten",
    modalTestId: "custom-editor-modal",
    reopenTestId: "custom-editor-reopen",
    // Der Editor bringt seine eigenen Ränder mit: die Werkzeugleiste liegt
    // bündig an der Oberkante, die Schreibfläche polstert ihren Text selbst.
    // Die Polsterung des Panels legte um beides einen zweiten weißen Rand und
    // nähme der Schreibfläche Platz, auf den es hier ankommt. `overflow:
    // hidden` hält dabei die abgerundeten Ecken: ohne den Beschnitt schöbe die
    // bündige Leiste ihre eckigen Kanten über den Radius des Panels.
    panelStyle: { padding: 0, overflow: "hidden" },
    parse: parseEditorValue,
    serialize: encodeEditorAttribute,
    render: ({ value, onChange, onSave, onClose, dirty }) =>
      React.createElement(EditorModal, { value, onChange, onSave, onClose, dirty }),
  });
}
