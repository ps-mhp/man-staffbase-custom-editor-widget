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

import React, { ReactElement, useEffect, useMemo } from "react";

import { useHotStyle } from "@shared/hot-style";
import { BlockAttributes } from "widget-sdk";

import { CONTENT_CLASS } from "./content-class";
import { parseEditorValue, isEmptyValue } from "./editor-value";
import { RichContent } from "./rich-content";
import richContentCss from "./styles/rich-content.scss";

export type CustomEditorWidgetProps = BlockAttributes & {
  content?: string;
};

/**
 * Die veröffentlichte Ansicht.
 *
 * Kein Plate: der Editor wird nur im Konfigurationsdialog nachgeladen (siehe
 * `editor-modal.tsx`), hier läuft der eigene Renderer über denselben Baum.
 *
 * Ein leeres Dokument gibt gar nichts aus. Ein frisch eingefügtes Widget ohne
 * Inhalt soll auf der Seite keinen leeren Kasten hinterlassen.
 */
export function CustomEditorWidget({ content }: CustomEditorWidgetProps): ReactElement | null {
  const value = useMemo(() => parseEditorValue(content), [content]);
  const css = useHotStyle(richContentCss, "custom-editor-widget", "styles/rich-content.scss");
  const empty = isEmptyValue(value);

  // Ein unlesbarer Attributwert sähe für die Leserin genauso aus wie ein
  // leeres Widget — und für die Redaktion wie verlorene Arbeit. Nach außen
  // bleibt beides still, aber in der Konsole steht dann, woran es lag: das ist
  // der Unterschied zwischen „ist nichts drin“ und „kommt nicht durch“.
  useEffect(() => {
    if (empty && content !== undefined && content.trim() !== "") {
      console.warn(
        "custom-editor-widget: Der gespeicherte Inhalt ließ sich nicht lesen.",
        `Anfang des Attributs: ${content.slice(0, 120)}`,
      );
    }
  }, [empty, content]);

  if (empty) return null;

  return (
    <>
      <style>{css}</style>
      <RichContent value={value} className={CONTENT_CLASS} />
    </>
  );
}
