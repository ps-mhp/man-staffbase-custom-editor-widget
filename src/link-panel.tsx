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
 * Link einfügen oder ändern: zwei Felder in einer Seitenleiste rechts.
 *
 * Die Leiste ist die des Rahmens (`useSidePanel`): Escape und „Zurück“
 * schließen sie, der Fokus kehrt danach in den Text zurück. Ohne Rahmen –
 * in Tests, in einer Vorschau – steht das Formular unter der
 * Werkzeugleiste.
 */

import React, { ReactElement, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Field } from "@man/config-ui/form/field";
import { Button } from "@man/config-ui/primitives/button";
import { Input } from "@man/config-ui/primitives/input";
import { useSidePanel } from "@man/config-ui/shell/side-panels";

import { LinkProblem, linkProblem } from "./editor-commands";

const LINK_PANEL_ID = "custom-editor-link";

const PROBLEM_TEXT: Readonly<Record<LinkProblem, string>> = {
  empty: "Bitte eine Adresse eintragen.",
  unsafe: "Diese Adresse ist nicht erlaubt. Möglich sind https://, http://, mailto: und tel:.",
};

/** Womit das Formular startet. */
export interface LinkRequest {
  url: string;
  text: string;
  /** Steht die Marke schon in einem Link? Dann wird er geändert. */
  editing: boolean;
}

export interface LinkFormProps extends LinkRequest {
  /** Setzt den Link; `false`, wenn die Adresse nicht taugt. */
  onApply: (url: string, text: string) => boolean;
  onCancel: () => void;
}

export function LinkForm({ url: initialUrl, text: initialText, editing, onApply, onCancel }: LinkFormProps): ReactElement {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [tried, setTried] = useState(false);
  const problem = linkProblem(url);
  // Ein verbotenes Schema meldet das Feld sofort; eine leere Adresse erst,
  // wenn jemand den Link setzen wollte – nicht schon beim Öffnen.
  const shown = problem === "unsafe" || (tried && problem !== undefined) ? problem : undefined;

  const submit = (): void => {
    setTried(true);
    if (problem === undefined) onApply(url, text);
  };

  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-5 px-5 py-4" data-testid="custom-editor-link-form">
      <Field
        label="Adresse"
        required
        hint="Vollständig mit https:// – oder mailto: bzw. tel:."
        error={shown === undefined ? undefined : PROBLEM_TEXT[shown]}
      >
        <Input
          data-autofocus=""
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={submitOnEnter}
        />
      </Field>
      <Field label="Text" hint="So steht der Link im Text. Leer bleibt die Adresse stehen.">
        <Input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={submitOnEnter} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" className="px-4" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="button" size="lg" className="px-4" onClick={submit}>
          {editing ? "Link ändern" : "Link einfügen"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Öffnet das Formular – in der Seitenleiste des Rahmens oder, ohne Rahmen,
 * unter der Werkzeugleiste (`inline`).
 *
 * Die Leiste gehört zu genau einem Editor: wird er neu aufgebaut (Rückgängig
 * im Kopf), schließt sie, statt in einen Editor zu schreiben, den es nicht
 * mehr gibt.
 */
export function useLinkPanel(apply: (url: string, text: string) => boolean): {
  open: (request: LinkRequest) => void;
  inline: ReactNode;
} {
  const panels = useSidePanel();
  const { available, close } = panels;
  const [inlineRequest, setInlineRequest] = useState<LinkRequest | null>(null);
  // `content` hält der Rahmen beim Öffnen fest; gesetzt wird über den
  // jüngsten Rückruf.
  const applyRef = useRef(apply);
  useLayoutEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => () => close(LINK_PANEL_ID), [close]);

  const open = useCallback(
    (request: LinkRequest): void => {
      if (!available) {
        setInlineRequest(request);
        return;
      }
      const finish = (): void => close(LINK_PANEL_ID);
      panels.open({
        id: LINK_PANEL_ID,
        title: request.editing ? "Link bearbeiten" : "Link einfügen",
        content: (
          <LinkForm
            {...request}
            onApply={(url, text) => {
              const done = applyRef.current(url, text);
              if (done) finish();
              return done;
            }}
            onCancel={finish}
          />
        ),
      });
    },
    [available, close, panels],
  );

  const inline =
    inlineRequest === null ? null : (
      <section
        aria-label={inlineRequest.editing ? "Link bearbeiten" : "Link einfügen"}
        className="shrink-0 border-b bg-background"
      >
        <LinkForm
          {...inlineRequest}
          onApply={(url, text) => {
            const done = applyRef.current(url, text);
            if (done) setInlineRequest(null);
            return done;
          }}
          onCancel={() => setInlineRequest(null)}
        />
      </section>
    );

  return { open, inline };
}
