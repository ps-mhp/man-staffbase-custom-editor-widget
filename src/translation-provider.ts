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

import { TranslationProvider } from "@shared/translation/carriers";

import { encodeEditorAttribute, parseEditorValue } from "./editor-value";
import {
  applyTranslatedTexts,
  editorValueToTranslatableHtml,
  hasTranslatableText,
  isTranslatedEditorHtml,
  readTranslatedTexts,
} from "./translation-payload";

/**
 * Wie der Editorinhalt durch Staffbases Inhaltsübersetzung reist.
 *
 * Der Inhalt liegt im `content`-Attribut, weil Attribute die einzige
 * Speicherung sind, die das Widget-SDK anbietet — und `POST /api/translations`
 * übersetzt Textknoten, während es Attribute unangetastet lässt. Ohne diesen
 * Anbieter bliebe der ganze Text also in der Ausgangssprache stehen, während
 * der Artikel ringsum übersetzt ist.
 *
 * Die gemeinsame Registrierung schickt den Text als eigene Anfrage neben der
 * des Editors los und schreibt das Ergebnis ins Attribut zurück, bevor der
 * Editor die Antwort überhaupt zu sehen bekommt.
 */
export const customEditorTranslationProvider: TranslationProvider = {
  id: "custom-editor-widget",
  label: "Editor-Widget",
  ref: { tagName: "custom-editor-widget", attribute: "content" },

  toTranslatable: (stored) => {
    // Ein leeres Attribut heißt: das Widget wurde eingefügt, aber nie
    // befüllt. Dafür eine Übersetzung anzufordern kostet nur Zeit.
    if (!stored) return null;
    const value = parseEditorValue(stored);
    return hasTranslatableText(value) ? editorValueToTranslatableHtml(value) : null;
  },

  fromTranslated: (html, stored) =>
    encodeEditorAttribute(applyTranslatedTexts(parseEditorValue(stored ?? undefined), readTranslatedTexts(html))),

  acceptsTranslated: isTranslatedEditorHtml,
};
