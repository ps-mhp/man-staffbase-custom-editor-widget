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
 * Der WYSIWYG-Editor auf Basis von Plate (https://platejs.org/) im Rahmen
 * von `@man/config-ui`.
 *
 * Dieses Modul wird ausschließlich über `React.lazy` geladen (siehe
 * `editor-injector.ts`). Plate samt Slate wiegt ein Vielfaches des Widgets,
 * und gebraucht wird es nur im Studio – auf einer veröffentlichten Seite darf
 * dieser Code nicht mitgeladen werden.
 *
 * Aufbau wie im Screen: oben die Werkzeugleiste „Format“, darunter auf
 * grauem Grund ein Blatt in Seitenbreite. Das Blatt trägt dieselbe Klasse wie
 * die Leseansicht (`custom-editor-content`), damit beim Schreiben steht, was
 * später auf der Seite steht – deshalb auch keine Vorschau im Kopf.
 * Übernehmen, Abbrechen, Rückgängig und Hilfe zeichnet der Rahmen.
 */

import React, { ReactElement, useCallback, useLayoutEffect, useRef, useState } from "react";

import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import type { PlateEditor } from "platejs/react";
import type { Value } from "platejs";

import { ConfigWorkspace } from "@man/config-ui/layout/config-workspace";
import { useHotStyle } from "@shared/hot-style";

import { CONTENT_CLASS } from "./content-class";
import { applyLink, linkAtSelection, selectedText } from "./editor-commands";
import { EditorToolbar } from "./editor-toolbar";
import { EditorValue } from "./editor-value";
import { useLinkPanel } from "./link-panel";
import { COMPONENTS, PLUGINS } from "./plate-setup";
import editorCss from "./styles/editor.scss";
import richContentCss from "./styles/rich-content.scss";

/**
 * Mitgeliefert für den Rahmen: der Injektor lädt die Hilfe aus diesem Modul
 * nach, damit sie im selben Chunk wie der Editor liegt und nicht im
 * Seitenbündel.
 */
export { CustomEditorHelp } from "./editor-help";

const WIDGET = "custom-editor-widget";

export interface PlateEditorProps {
  /** Der Entwurf des Rahmens. */
  value: EditorValue;
  /** Bekommt jeden neuen Baum; übernommen wird erst über den Kopf. */
  onChange: (value: EditorValue) => void;
}

/**
 * Die Schreibfläche: ein Blatt in Seitenbreite auf grauem Grund. Ein Klick
 * neben das Blatt oder in seinen Rand setzt die Marke ans Ende – sonst wäre
 * die Fläche um den Text herum tot.
 */
function Sheet({ editor }: { editor: PlateEditor }): ReactElement {
  const focusEnd = (event: React.MouseEvent<HTMLElement>): void => {
    const target = event.target as HTMLElement;
    if (target.closest("[contenteditable]") !== null) return;
    // Wer die Bildlaufleiste der Fläche greift, will blättern, nicht ans Ende springen.
    const area = event.currentTarget.getBoundingClientRect();
    const onScrollbar =
      event.clientX - area.left > event.currentTarget.clientWidth ||
      event.clientY - area.top > event.currentTarget.clientHeight;
    if (target === event.currentTarget && onScrollbar) return;
    event.preventDefault();
    editor.tf.focus({ edge: "end" });
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-secondary px-6 py-8 max-sm:px-3 max-sm:py-4" onMouseDown={focusEnd}>
      <div
        className={
          // Der Fokusring liegt am Blatt, nicht am Text: um die Schreibfläche
          // stünde er mitten auf der Seite.
          "mx-auto box-border w-full max-w-[760px] border bg-background px-12 py-10 max-sm:px-5 max-sm:py-6 " +
          "focus-within:ring-[3px] focus-within:ring-ring/20"
        }
      >
        <PlateContent
          className={`custom-editor__editable ${CONTENT_CLASS}`}
          placeholder="Text eingeben …"
          aria-label="Text"
        />
      </div>
    </div>
  );
}

interface SurfaceProps {
  initialValue: EditorValue;
  onChange: (value: EditorValue) => void;
}

/**
 * Ein Plate-Editor über einem festen Startwert. Plate führt den Baum ab da
 * selbst; ein neues `value` bei jedem Tastendruck setzte den Cursor zurück.
 * Kommt ein Stand von außen, baut `CustomPlateEditor` die Fläche neu auf.
 */
function Surface({ initialValue, onChange }: SurfaceProps): ReactElement {
  const editor = usePlateEditor({
    plugins: PLUGINS,
    components: COMPONENTS,
    value: initialValue as unknown as Value,
  });

  // Die Werkzeugleiste muss den Zustand an der Einfügemarke zeigen. Plate
  // meldet Auswahländerungen nicht als React-State; ein Zähler, den jedes
  // Ereignis hochdreht, das die Marke bewegen kann, zeichnet sie neu.
  const [, bump] = useState(0);
  const refresh = useCallback(() => bump((count) => count + 1), []);

  /** Führt eine Änderung aus und gibt Fokus und Werkzeugleiste nach. */
  const run = useCallback(
    (change: () => void): void => {
      change();
      editor.tf.focus();
      refresh();
    },
    [editor, refresh],
  );

  const link = useLinkPanel((url, text) => {
    const done = applyLink(editor, url, text);
    if (done) run(() => undefined);
    return done;
  });

  const openLink = (): void => {
    const current = linkAtSelection(editor);
    link.open(
      current === undefined
        ? { url: "", text: selectedText(editor), editing: false }
        : { url: current.url, text: current.text, editing: true },
    );
  };

  return (
    <Plate
      editor={editor}
      onChange={({ value }: { value: unknown }) => {
        onChange(value as EditorValue);
        refresh();
      }}
      onSelectionChange={refresh}
    >
      <div className="flex h-full min-h-0 flex-col">
        <EditorToolbar editor={editor} run={run} onLink={openLink} />
        {link.inline}
        <Sheet editor={editor} />
      </div>
    </Plate>
  );
}

/**
 * Hält Plate und den Entwurf des Rahmens beieinander.
 *
 * Plate hat einen eigenen Verlauf (⌘/Strg Z im Text), der Rahmen einen
 * zweiten (Rückgängig im Kopf). Jeder Baum, den Plate meldet, geht als
 * Entwurf an den Rahmen und wird hier vermerkt. Kommt danach ein Stand
 * zurück, der nicht der zuletzt gemeldete ist, hat ihn der Rahmen gesetzt –
 * dann wird die Fläche mit ihm neu aufgebaut, samt frischem Plate-Verlauf:
 * Schritte, die zu einem anderen Baum gehören, nähme Plate sonst auf einem
 * falschen zurück.
 */
function useExternalValue(
  value: EditorValue,
  onChange: (value: EditorValue) => void,
): { seed: { value: EditorValue; key: number }; emit: (value: EditorValue) => void } {
  const [seed, setSeed] = useState({ value, key: 0 });
  const emitted = useRef(value);

  useLayoutEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setSeed((previous) => ({ value, key: previous.key + 1 }));
  }, [value]);

  const emit = useCallback(
    (next: EditorValue): void => {
      emitted.current = next;
      onChange(next);
    },
    [onChange],
  );

  return { seed, emit };
}

/** Der Editor im Rumpf des Rahmens. */
export default function CustomPlateEditor({ value, onChange }: PlateEditorProps): ReactElement {
  const hotEditorCss = useHotStyle(editorCss, WIDGET, "styles/editor.scss");
  const hotContentCss = useHotStyle(richContentCss, WIDGET, "styles/rich-content.scss");
  const { seed, emit } = useExternalValue(value, onChange);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="custom-editor">
      <style>{`${hotEditorCss}\n${hotContentCss}`}</style>
      <ConfigWorkspace className="min-h-0 flex-1">
        <Surface key={seed.key} initialValue={seed.value} onChange={emit} />
      </ConfigWorkspace>
    </div>
  );
}
