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
 * Die Hilfe des Editors in der Leiste des Rahmens. Tasten des Rahmens und
 * den Satz zu „Übernehmen“ ergänzt der Rahmen selbst.
 *
 * Ein aufklappbarer Abschnitt je Thema, wie bei der Tabelle: die Leiste ist
 * schmal, und wer „Wie setze ich einen Link?“ sucht, liest nur das.
 */

import React, { ReactElement } from "react";

interface HelpTopic {
  id: string;
  label: string;
  entries: ReadonlyArray<{ title: string; text: string }>;
}

const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "write",
    label: "Schreiben",
    entries: [
      {
        title: "Wie auf der Seite",
        text: "Die Schreibfläche zeigt Schriften, Größen und Abstände der veröffentlichten Seite. Eine Vorschau braucht es deshalb nicht.",
      },
      {
        title: "Absätze und Zeilen",
        text: "Eingabetaste beginnt einen neuen Absatz, Umschalt+Eingabe eine neue Zeile im selben Absatz.",
      },
      {
        title: "Absatzformat",
        text: "Fließtext, Überschrift 1 bis 6, Zitat oder Codeblock – gilt für den Absatz, in dem die Schreibmarke steht.",
      },
    ],
  },
  {
    id: "format",
    label: "Auszeichnen",
    entries: [
      {
        title: "Fett, kursiv, unterstrichen",
        text: "Text markieren und das Werkzeug wählen, oder ⌘/Strg B, I, U. Durchgestrichen und Code stehen daneben.",
      },
      {
        title: "Weitere Auszeichnungen (…)",
        text: "Hervorgehoben, hochgestellt, tiefgestellt, Taste – und „Formatierung entfernen“ für alles auf einmal.",
      },
      {
        title: "Größe und Farben",
        text: "Schriftgröße, Textfarbe und Texthintergrund stehen am Ende der Leiste. „Standard“ nimmt die eigene Farbe wieder weg.",
      },
    ],
  },
  {
    id: "structure",
    label: "Listen und Ausrichtung",
    entries: [
      {
        title: "Aufzählung und Nummerierung",
        text: "Eingabetaste legt den nächsten Punkt an, zweimal beendet sie die Liste. Tab rückt einen Punkt ein, Umschalt+Tab wieder aus.",
      },
      {
        title: "Ein- und Ausrücken",
        text: "Rückt Absätze, Überschriften und Zitate stufenweise ein.",
      },
      {
        title: "Ausrichtung",
        text: "Linksbündig, zentriert, rechtsbündig oder Blocksatz – gilt für den Absatz an der Schreibmarke.",
      },
    ],
  },
  {
    id: "links",
    label: "Links und Trennlinien",
    entries: [
      {
        title: "Link setzen",
        text: "Text markieren, „Link“ wählen, Adresse eintragen – vollständig mit https://, oder mailto: bzw. tel:. Steht die Marke in einem Link, ändert dasselbe Werkzeug ihn.",
      },
      {
        title: "Link entfernen",
        text: "Schreibmarke in den Link setzen und „Link entfernen“ wählen; der Text bleibt.",
      },
      {
        title: "Trennlinie",
        text: "Fügt an der Schreibmarke eine waagerechte Linie ein.",
      },
    ],
  },
  {
    id: "undo",
    label: "Rückgängig",
    entries: [
      {
        title: "Im Text",
        text: "⌘/Strg Z nimmt die letzte Eingabe zurück, solange die Schreibmarke im Text steht.",
      },
      {
        title: "Im Kopf",
        text: "Rückgängig und Wiederholen oben gehen schrittweise durch alle Stände seit dem Öffnen.",
      },
    ],
  },
];

export function CustomEditorHelp(): ReactElement {
  return (
    <div className="flex flex-col gap-2" data-testid="custom-editor-help">
      {HELP_TOPICS.map((topic, index) => (
        <details key={topic.id} className="rounded-md border px-3" open={index === 0}>
          <summary className="flex min-h-10 cursor-pointer items-center text-[13px] font-semibold text-foreground">
            {topic.label}
          </summary>
          <dl className="flex flex-col gap-2 pb-3">
            {topic.entries.map((entry) => (
              <div key={entry.title}>
                <dt className="font-semibold text-foreground">{entry.title}</dt>
                <dd className="text-muted-foreground">{entry.text}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  );
}
