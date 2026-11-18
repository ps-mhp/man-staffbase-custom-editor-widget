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
 * Der Editor im gemeinsamen Rahmen von `@man/config-ui`: Kopf, Status,
 * Übernehmen, Rückgängig, Hilfe und Rückfrage kommen vom Rahmen; der Editor
 * zeichnet keine eigenen Knöpfe dafür mehr.
 */

import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";

import { decodePayload } from "@shared/payload";
import { modalRoot, queryDeep, queryInModal, settleModal } from "@shared/ui/config-modal.testing";

import { customEditorShell, startEditorInjector } from "./editor-injector";
import { configurationSchema, uiSchema } from "./configuration-schema";
import { encodeEditorAttribute, parseEditorValue } from "./editor-value";

const renderDialog = (content?: string): HTMLElement => {
  const { container } = render(
    <Form
      schema={configurationSchema}
      uiSchema={uiSchema}
      validator={validator}
      formData={content === undefined ? undefined : { content }}
      onSubmit={jest.fn()}
    />,
  );
  return container;
};

/** Wartet, bis der nachgeladene Plate-Chunk gemountet ist. */
const editable = async (): Promise<HTMLElement> =>
  waitFor(() => {
    const node = queryInModal<HTMLElement>('[contenteditable="true"]');
    if (node === null) throw new Error("Schreibfläche noch nicht da");
    return node;
  });

async function open(content?: string): Promise<{ container: HTMLElement; stop: () => void }> {
  const container = renderDialog(content);
  let stop = (): void => {};
  await act(async () => {
    stop = startEditorInjector(container);
  });
  await editable();
  return { container, stop };
}

const field = (container: HTMLElement): HTMLTextAreaElement =>
  container.querySelector<HTMLTextAreaElement>("#root_content")!;

const click = async (selector: string): Promise<void> => {
  const target = queryInModal<HTMLElement>(selector);
  if (target === null) throw new Error(`${selector} fehlt`);
  await act(async () => {
    target.click();
  });
};

/** Eine Änderung über die Werkzeugleiste: Plate meldet sie wie einen Tastendruck. */
const insertRule = async (): Promise<void> => {
  await click('[aria-label="Trennlinie einfügen"]');
  await settleModal();
};

describe("startEditorInjector", () => {
  it("nimmt die Stelle des content-Feldes ein und blendet es aus", async () => {
    const { container, stop } = await open();

    expect(field(container).style.display).toBe("none");
    expect(queryInModal('[data-testid="custom-editor-modal"]')).not.toBeNull();

    await act(async () => stop());
  });

  it("lädt den Editor nach und zeigt den vorhandenen Inhalt", async () => {
    const { stop } = await open(encodeEditorAttribute([{ type: "h2", children: [{ text: "Vorhandener Titel" }] }]));

    const surface = await editable();
    await waitFor(() => expect(surface.querySelector("h2")).toHaveTextContent("Vorhandener Titel"));

    await act(async () => stop());
  });

  it("öffnet im Rahmen: Name, Titel, Status – ohne Vorschau-Umschalter", async () => {
    const { stop } = await open();

    expect(modalRoot()!.textContent).toContain("Editor");
    expect(modalRoot()!.querySelector("h1")).toHaveTextContent("Text bearbeiten");
    // Die Schreibfläche zeigt schon die Seite; eine Vorschau gibt es nicht.
    expect(queryInModal('[aria-label="Ansicht"]')).toBeNull();
    expect(queryInModal('[data-testid="config-shell-apply"]')).toBeDisabled();
    expect(queryInModal('[role="toolbar"][aria-label="Format"]')).not.toBeNull();

    await act(async () => stop());
  });

  it("zeichnet keine eigenen Knöpfe zum Speichern, Schließen oder Zurücknehmen mehr", async () => {
    const { stop } = await open();

    const toolbar = queryInModal('[data-testid="custom-editor-toolbar"]')!;
    for (const label of ["Speichern", "Editor schließen", "Rückgängig", "Wiederholen"]) {
      expect(toolbar.querySelector(`[aria-label="${label}"]`)).toBeNull();
    }
    expect(modalRoot()!.textContent).not.toContain("Nicht gespeichert");

    await act(async () => stop());
  });

  it("lässt einen alten Block beim Öffnen und Übernehmen unverändert", async () => {
    // Altes Format: rohes JSON statt Base64, dazu die entfernte
    // Kleinschreibung. Beides liest die Seite weiter wie bisher.
    const stored = JSON.stringify([{ type: "h1", children: [{ text: "MODELL " }, { text: "eTGX", lowercase: true }] }]);
    const { container, stop } = await open(stored);

    const surface = await editable();
    await waitFor(() => expect(surface.querySelector("h1")?.textContent).toBe("MODELL eTGX"));
    await act(async () => {
      surface.focus();
      surface.click();
    });
    await settleModal();

    // Nichts geändert, also nichts zu übernehmen – auch nicht per Taste.
    expect(queryInModal('[data-testid="config-shell-apply"]')).toBeDisabled();
    await act(async () => {
      surface.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, composed: true }));
    });
    expect(field(container).value).toBe(stored);

    await act(async () => stop());
  });

  it("nennt eine Änderung im Status und schreibt sie erst beim Übernehmen", async () => {
    const stored = encodeEditorAttribute([
      { type: "p", children: [{ text: "MODELL " }, { text: "eTGX", lowercase: true } as never] },
    ]);
    const { container, stop } = await open(stored);

    await insertRule();

    expect(queryInModal('[role="status"]')).toHaveTextContent("Text geändert – nicht übernommen");
    expect(field(container).value).toBe(stored);

    await click('[data-testid="config-shell-apply"]');

    const raw = field(container).value;
    expect(raw).toMatch(/^b64:/);
    // Geprüft wird der rohe Feldwert: ohne Plates Kennungen und ohne die
    // entfernte Kleinschreibung.
    expect(decodePayload(raw)).not.toMatch(/lowercase|"id"/);
    const written = parseEditorValue(raw);
    expect(written.map((block) => block.type)).toContain("hr");
    expect(written[0].children.map((node) => ("text" in node ? node.text : "")).join("")).toBe("MODELL eTGX");

    await act(async () => stop());
  });

  it("baut die Schreibfläche mit dem früheren Stand neu auf, wenn der Kopf zurücknimmt", async () => {
    const { stop } = await open(encodeEditorAttribute([{ type: "p", children: [{ text: "Absatz" }] }]));

    await insertRule();
    expect((await editable()).querySelector("hr")).not.toBeNull();

    await click('[data-testid="config-shell-undo"]');
    await settleModal();

    const surface = await editable();
    await waitFor(() => expect(surface.querySelector("hr")).toBeNull());
    expect(surface).toHaveTextContent("Absatz");
    expect(queryInModal('[data-testid="config-shell-apply"]')).toBeDisabled();

    await click('[data-testid="config-shell-redo"]');
    await settleModal();
    await waitFor(() => expect(queryInModal('[contenteditable="true"] hr')).not.toBeNull());

    await act(async () => stop());
  });

  it("zeigt in der Hilfe des Rahmens die Hilfe des Editors", async () => {
    const { stop } = await open();

    await click('[data-testid="config-shell-help"]');
    await settleModal();

    await waitFor(() => expect(queryInModal('aside[aria-label="Hilfe"]')).toHaveTextContent("Link setzen"));
    expect(queryInModal('aside[aria-label="Hilfe"]')).toHaveTextContent("Tasten");

    await act(async () => stop());
  });

  it("öffnet das Link-Formular als Seitenleiste des Rahmens", async () => {
    const { stop } = await open();

    await click('[aria-label="Link einfügen"]');
    await settleModal();

    const form = queryInModal('[data-testid="custom-editor-link-form"]');
    expect(form).not.toBeNull();
    expect(form!.closest("[data-side-panel]")).not.toBeNull();

    await act(async () => stop());
  });

  it("schließt nach dem Übernehmen und bietet das Wiederöffnen an", async () => {
    const { container, stop } = await open();

    await insertRule();
    await click('[data-testid="config-shell-apply"]');
    await settleModal();

    expect(queryInModal('[data-testid="custom-editor"]')).toBeNull();
    expect(queryDeep(container, '[data-testid="custom-editor-reopen"]')).not.toBeNull();

    await act(async () => stop());
  });
});

describe("customEditorShell", () => {
  it("meldet den Text als geändert und prüft nichts", () => {
    expect(customEditorShell.statusText?.([], [])).toBe("Text geändert");
    expect(customEditorShell.validate).toBeUndefined();
    expect(customEditorShell.preview).toBe(false);
  });
});
