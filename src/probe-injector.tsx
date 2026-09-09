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
 * Messpult im Konfigurationsdialog.
 *
 * Ein Klick füllt das Feld mit einem Messstring bekannter Länge — von Hand
 * lassen sich 500.000 Zeichen nicht einfügen. Speichern, Seite neu laden, und
 * die Widget-Ansicht sagt, wie viel davon zurückkam.
 *
 * Provisorium für den Vorabtest; fliegt raus, sobald der echte Editor steht.
 */

import React from "react";

import { startConfigFieldInjector, setNativeFieldValue, ConfigField } from "@shared/config-field-injector";
import { encodePayload } from "@shared/payload";

import { makeProbeString } from "./probe";

const FIELD_KEY = "content";
const SIZES = [1_000, 10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

const buttonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

function ProbePanel({ field }: { field: ConfigField }): React.ReactElement {
  const [encode, setEncode] = React.useState(false);
  const [length, setLength] = React.useState(field.value.length);

  const fill = (size: number): void => {
    const probe = makeProbeString(size);
    const value = encode ? encodePayload(probe) : probe;
    setNativeFieldValue(field, value);
    setLength(value.length);
  };

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 4, padding: 8, marginBottom: 8 }}>
      <strong style={{ fontSize: 12 }}>Vorabtest: Zeichengrenze</strong>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0" }}>
        {SIZES.map((size) => (
          <button key={size} type="button" style={buttonStyle} onClick={() => fill(size)}>
            {size.toLocaleString("de-DE")}
          </button>
        ))}
        <button key="clear" type="button" style={buttonStyle} onClick={() => { setNativeFieldValue(field, ""); setLength(0); }}>
          leeren
        </button>
      </div>
      <label style={{ fontSize: 12, display: "block" }}>
        <input type="checkbox" checked={encode} onChange={(event) => setEncode(event.target.checked)} /> als
        Base64-Payload (b64:) ablegen
      </label>
      <div style={{ fontSize: 12, marginTop: 4 }}>Feld enthält: {length.toLocaleString("de-DE")} Zeichen</div>
    </div>
  );
}

/** Hängt das Messpult vor das `content`-Feld. */
export function startProbeInjector(root: ParentNode = document): () => void {
  return startConfigFieldInjector({
    fieldKey: FIELD_KEY,
    root,
    render: (field) => React.createElement(ProbePanel, { field }),
  });
}
