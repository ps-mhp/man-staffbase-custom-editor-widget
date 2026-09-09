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

import { isPayload, decodePayload } from "@shared/payload";
import { BlockAttributes } from "widget-sdk";

import { describeProbe } from "./probe";

export type CustomEditorWidgetProps = BlockAttributes & {
  content?: string;
};

/**
 * Ansicht des Widgets.
 *
 * Zeigt vorerst nur den Messbericht: was in der Custom Property abgelegt wurde
 * und was davon zurückkommt. Der eigentliche Inhalt folgt, sobald feststeht,
 * wie viel Platz zur Verfügung steht.
 */
export function CustomEditorWidget({ content = "" }: CustomEditorWidgetProps): React.ReactElement {
  const decoded = isPayload(content) ? (decodePayload(content) ?? "") : content;
  const report = describeProbe(decoded);

  const rows: [string, string][] = [
    ["Attribut roh", `${content.length.toLocaleString("de-DE")} Zeichen${isPayload(content) ? " (b64:)" : ""}`],
    ["Nutzinhalt", `${report.received.toLocaleString("de-DE")} Zeichen`],
    ["Abgeschickt", report.expected === null ? "—" : `${report.expected.toLocaleString("de-DE")} Zeichen`],
    ["Letzte Marke", report.lastMarker === null ? "—" : report.lastMarker.toLocaleString("de-DE")],
    ["Abgeschnitten", report.expected === null ? "—" : report.truncated ? "JA" : "nein"],
    ["Ende", report.tail || "—"],
  ];

  return (
    <div style={{ fontFamily: "monospace", fontSize: 13, border: "1px solid #ccc", borderRadius: 4, padding: 12 }}>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>custom-editor-widget — Messbericht</div>
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ paddingRight: 12, opacity: 0.7 }}>{label}</td>
              <td style={{ wordBreak: "break-all" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
