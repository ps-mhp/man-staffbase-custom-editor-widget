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
import { render, act, waitFor } from "@testing-library/react";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";

import { startEditorInjector } from "./editor-injector";
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
    const node = document.body.querySelector<HTMLElement>('[contenteditable="true"]');
    if (node === null) throw new Error("Schreibfläche noch nicht da");
    return node;
  });

describe("startEditorInjector", () => {
  it("nimmt die Stelle des content-Feldes ein und blendet es aus", async () => {
    const container = renderDialog();

    let stop = (): void => {};
    await act(async () => {
      stop = startEditorInjector(container);
    });

    const field = container.querySelector<HTMLTextAreaElement>("#root_content")!;
    expect(field.style.display).toBe("none");
    expect(document.body.querySelector('[data-testid="custom-editor-modal"]')).not.toBeNull();

    await act(async () => {
      stop();
    });
  });

  it("lädt den Editor nach und zeigt den vorhandenen Inhalt", async () => {
    const container = renderDialog(
      encodeEditorAttribute([{ type: "h2", children: [{ text: "Vorhandener Titel" }] }]),
    );

    let stop = (): void => {};
    await act(async () => {
      stop = startEditorInjector(container);
    });

    const surface = await editable();
    await waitFor(() => expect(surface.querySelector("h2")).toHaveTextContent("Vorhandener Titel"));

    await act(async () => {
      stop();
    });
  });

  it("schreibt beim Speichern in das Feld zurück, aus dem der Dialog liest", async () => {
    const container = renderDialog();

    let stop = (): void => {};
    await act(async () => {
      stop = startEditorInjector(container);
    });

    await editable();

    const bold = await waitFor(() => {
      // Gesucht wird über den barrierefreien Namen, nicht über `title`: den
      // trägt kein Werkzeug mehr, seit die Leiste eigene Hinweise zeigt.
      const button = document.body.querySelector<HTMLButtonElement>('[aria-label^="Fett"]');
      if (button === null) throw new Error("Werkzeugleiste noch nicht da");
      return button;
    });
    expect(bold).toBeInTheDocument();

    // Speichern trägt nur noch ein Symbol; gesucht wird über seinen Namen.
    const save = document.body.querySelector<HTMLButtonElement>('[aria-label="Speichern"]')!;
    // Speichern steht im festen linken Ende der Leiste, damit es nicht mit den
    // Werkzeugen aus dem Bild läuft.
    expect(save.closest(".custom-editor__bar-lead")).not.toBeNull();
    expect(document.body.querySelector('[aria-label="Editor schließen"]')).not.toBeNull();
    await act(async () => {
      save.click();
    });

    const field = container.querySelector<HTMLTextAreaElement>("#root_content")!;
    expect(field.value).toMatch(/^b64:/);
    expect(parseEditorValue(field.value)).toEqual([{ type: "p", children: [{ text: "" }] }]);

    // Nach dem Speichern schließt der Dialog und bietet das Wiederöffnen an.
    expect(document.body.querySelector('[data-testid="custom-editor-reopen"]')).not.toBeNull();

    await act(async () => {
      stop();
    });
  });
});
