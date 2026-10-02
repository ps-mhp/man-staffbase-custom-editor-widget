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
 * Die Klasse, unter der die Textregeln aus `styles/rich-content.scss` stehen.
 *
 * Sie steht in einem eigenen Modul, weil Leseansicht und Editor sie beide
 * brauchen, der Editor aber nur nachgeladen wird: läge die Konstante bei ihm,
 * zöge die Leseansicht Plate ins Bundle.
 */
export const CONTENT_CLASS = "custom-editor-content";

/**
 * Die Klasse, die eine Textstelle in Kleinbuchstaben setzt.
 *
 * Entstanden ist sie als Ausnahme von den Versalien, die die MAN-CI früher für
 * Überschriften vorschrieb — für Eigennamen, die klein beginnen („iPhone",
 * „eTGX"). Craft kennt keine Versalien mehr (`man-type` in
 * `src/shared/stylings/_man-tokens.scss` setzt `text-transform: none`); die
 * Klasse bleibt, weil gespeicherte Inhalte sie tragen und eine Wirtsseite
 * noch Versalien hineintragen kann.
 *
 * Der Name ist nicht frei gewählt: `man-theme` definiert sie global als
 * `.page .text-lowercase`, und `table-widget` erzeugt dieselbe. Ein eigener
 * Name hier hieße, dass dieselbe Ausnahme je nach Widget anders heißt.
 */
export const LOWERCASE_CLASS = "text-lowercase";
