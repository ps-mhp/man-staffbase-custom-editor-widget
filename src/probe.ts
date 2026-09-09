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
 * Vorabtest: wie viele Zeichen überlebt eine Custom Property?
 *
 * Es gibt keinen dokumentierten Grenzwert, also wird er gemessen. Der Test
 * braucht einen String, dem man ansieht, wo er abgeschnitten wurde — deshalb
 * trägt jeder 20-Zeichen-Block seine eigene Endposition. Kommt hinten
 * `00120000` an, sind 120000 Zeichen durchgekommen, auch wenn der Rest fehlt.
 *
 * Der Kopf `PROBE:<soll>:` hält fest, wie lang der String beim Absenden war,
 * damit die Ansicht Soll und Ist ohne zweite Quelle vergleichen kann.
 *
 * Zeichenvorrat bewusst nur A-Z0-9 und Punkt: keine Anführungszeichen, kein
 * `&`, kein `<` — sonst misst man HTML-Escaping statt der Speichergrenze.
 */

const BLOCK = 20;
const HEADER = "PROBE";

/** Erzeugt einen Messstring von exakt `total` Zeichen. */
export function makeProbeString(total: number): string {
  const head = `${HEADER}:${total}:`;
  const parts: string[] = [head];
  let length = head.length;

  while (length < total) {
    const end = length + BLOCK;
    parts.push(`${String(end).padStart(8, "0")}............`);
    length = end;
  }

  return parts.join("").slice(0, total);
}

export interface ProbeReport {
  /** Zeichen, die tatsächlich im Widget ankamen. */
  received: number;
  /** Zeichen, die laut Kopf abgeschickt wurden; `null` bei fremdem Inhalt. */
  expected: number | null;
  /** Letzte vollständig angekommene Blockposition; `null` wenn keine. */
  lastMarker: number | null;
  /** Ob weniger ankam als abgeschickt wurde. */
  truncated: boolean;
  /** Die letzten Zeichen — zeigt, ob mitten im Block gekappt wurde. */
  tail: string;
}

/** Wertet aus, was von einem Messstring angekommen ist. */
export function describeProbe(raw: string): ProbeReport {
  const received = raw.length;
  const header = /^PROBE:(\d+):/.exec(raw);
  const expected = header ? Number(header[1]) : null;

  const markers = raw.match(/\d{8}\.{12}/g);
  const last = markers?.[markers.length - 1];
  const lastMarker = last ? Number(last.slice(0, 8)) : null;

  return {
    received,
    expected,
    lastMarker,
    truncated: expected !== null && received < expected,
    tail: raw.slice(-40),
  };
}
