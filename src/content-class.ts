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
