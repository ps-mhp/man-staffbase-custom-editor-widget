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
 * Der Editor für sich, ohne Rahmen: Werkzeugleiste wie im Screen, Abgleich
 * mit Ständen von außen, Link-Formular und Farbwahl.
 */

import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import CustomPlateEditor from "./plate-editor";
import { EditorValue, RichElement } from "./editor-value";

const paragraph = (text: string): EditorValue => [{ type: "p", children: [{ text }] }];

function setup(value: EditorValue = paragraph("Hallo")) {
  const onChange = jest.fn<void, [EditorValue]>();
  const view = render(<CustomPlateEditor value={value} onChange={onChange} />);
  return { ...view, onChange };
}

const surface = (): HTMLElement => document.querySelector<HTMLElement>('[contenteditable="true"]')!;
const toolbar = (): HTMLElement => screen.getByRole("toolbar", { name: "Format" });
const lastValue = (onChange: jest.Mock<void, [EditorValue]>): EditorValue =>
  onChange.mock.calls[onChange.mock.calls.length - 1][0];

/** Setzt die Marke ans Ende des Textes – wie ein Klick neben das Blatt. */
async function caretToEnd(): Promise<void> {
  await act(async () => {
    fireEvent.mouseDown(surface().closest(".bg-secondary")!);
  });
}

describe("CustomPlateEditor", () => {
  it("ordnet die Werkzeuge wie im Screen und hängt die übrigen an ihre Gruppe", () => {
    setup();

    const names = Array.from(toolbar().querySelectorAll("[data-tool-item]")).map((control) =>
      control.getAttribute("aria-label"),
    );

    expect(names).toEqual([
      "Absatzformat",
      "Fett",
      "Kursiv",
      "Unterstrichen",
      "Durchgestrichen",
      "Code",
      "Weitere Auszeichnungen",
      "Aufzählung",
      "Nummerierte Liste",
      "Ausrücken",
      "Einrücken",
      "Linksbündig",
      "Zentriert",
      "Rechtsbündig",
      "Blocksatz",
      "Trennlinie einfügen",
      "Link einfügen",
      "Link entfernen",
      "Schriftgröße",
      "Textfarbe: Standard",
      "Texthintergrund: Standard",
    ]);
  });

  it("zeigt Tastenkürzel im Tooltip und den Link-Knopf mit Text", () => {
    setup();

    expect(within(toolbar()).getByRole("button", { name: "Fett" })).toHaveAttribute("title", "Fett (⌘/Strg B)");
    expect(within(toolbar()).getByRole("button", { name: "Link einfügen" })).toHaveTextContent("Link");
    expect(within(toolbar()).getByRole("button", { name: "Link entfernen" })).toBeDisabled();
    expect(within(toolbar()).getByRole("button", { name: "Linksbündig" })).toHaveAttribute("aria-pressed", "true");
    expect(within(toolbar()).getByRole("combobox", { name: "Absatzformat" })).toHaveValue("p");
  });

  it("zeichnet keine eigenen Knöpfe für Speichern, Schließen oder Rückgängig", () => {
    setup();

    for (const name of ["Speichern", "Editor schließen", "Rückgängig", "Wiederholen"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("legt die Schreibfläche als Blatt mit der Klasse der Seite an", () => {
    setup();

    expect(surface()).toHaveAttribute("aria-label", "Text");
    expect(surface()).toHaveClass("custom-editor-content");
    expect(surface()).toHaveTextContent("Hallo");
  });

  it("meldet eine Änderung über die Werkzeugleiste als neuen Baum", async () => {
    const { onChange } = setup();

    await act(async () => {
      within(toolbar()).getByRole("button", { name: "Trennlinie einfügen" }).click();
    });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastValue(onChange).map((block) => block.type)).toContain("hr");
  });

  it("baut die Fläche nicht neu auf, wenn der eigene Stand zurückkommt", async () => {
    const { onChange, rerender } = setup();
    const before = surface();

    await act(async () => {
      within(toolbar()).getByRole("button", { name: "Trennlinie einfügen" }).click();
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());

    rerender(<CustomPlateEditor value={lastValue(onChange)} onChange={onChange} />);

    expect(surface()).toBe(before);
    expect(surface().querySelector("hr")).not.toBeNull();
  });

  it("übernimmt einen Stand von außen – etwa Rückgängig im Kopf", async () => {
    const { onChange, rerender } = setup();

    rerender(<CustomPlateEditor value={paragraph("Früherer Stand")} onChange={onChange} />);

    await waitFor(() => expect(surface()).toHaveTextContent("Früherer Stand"));
    expect(surface()).not.toHaveTextContent("Hallo");
  });

  describe("Werkzeuge an der Marke", () => {
    const tool = (name: string): HTMLElement => within(toolbar()).getByRole("button", { name });
    const press = async (name: string): Promise<void> => {
      await act(async () => {
        tool(name).click();
      });
    };
    const choose = async (label: string, value: string): Promise<void> => {
      await act(async () => {
        fireEvent.change(within(toolbar()).getByRole("combobox", { name: label }), { target: { value } });
      });
    };

    it("wechselt das Absatzformat, auch in einen Codeblock und zurück", async () => {
      const { onChange } = setup();
      await caretToEnd();

      await choose("Absatzformat", "h2");
      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("h2"));
      expect(within(toolbar()).getByRole("combobox", { name: "Absatzformat" })).toHaveValue("h2");

      await choose("Absatzformat", "code_block");
      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("code_block"));

      await choose("Absatzformat", "blockquote");
      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("blockquote"));
      // Plate legt das Zitat um den Absatz; die Liste zeigt trotzdem „Zitat“.
      expect(within(toolbar()).getByRole("combobox", { name: "Absatzformat" })).toHaveValue("blockquote");

      await choose("Absatzformat", "h3");
      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("h3"));

      await choose("Absatzformat", "blockquote");
      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("blockquote"));

      await choose("Absatzformat", "p");
      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("p"));
      expect(surface()).toHaveTextContent("Hallo");
    });

    it("richtet den Absatz aus und zeigt die Ausrichtung als gedrückt", async () => {
      const { onChange } = setup();
      await caretToEnd();

      await press("Zentriert");

      await waitFor(() => expect(lastValue(onChange)[0].align).toBe("center"));
      expect(tool("Zentriert")).toHaveAttribute("aria-pressed", "true");
      expect(tool("Linksbündig")).toHaveAttribute("aria-pressed", "false");
    });

    it("schaltet Auszeichnungen und Größe für das Folgende um", async () => {
      setup();
      await caretToEnd();

      await press("Fett");
      expect(tool("Fett")).toHaveAttribute("aria-pressed", "true");

      await choose("Schriftgröße", "24");
      expect(within(toolbar()).getByRole("combobox", { name: "Schriftgröße" })).toHaveValue("24");

      await act(async () => {
        tool("Weitere Auszeichnungen").click();
      });
      await act(async () => {
        within(screen.getByTestId("custom-editor-more-marks-menu")).getByRole("button", { name: "Hochgestellt" }).click();
      });
      await act(async () => {
        tool("Weitere Auszeichnungen").click();
      });
      expect(within(screen.getByTestId("custom-editor-more-marks-menu")).getByRole("button", { name: "Hochgestellt" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await act(async () => {
        within(screen.getByTestId("custom-editor-more-marks-menu"))
          .getByRole("button", { name: "Formatierung entfernen" })
          .click();
      });
      expect(tool("Fett")).toHaveAttribute("aria-pressed", "false");
      expect(within(toolbar()).getByRole("combobox", { name: "Schriftgröße" })).toHaveValue("16");
    });

    it("rückt einen Absatz ein und wieder aus", async () => {
      const { onChange } = setup();
      await caretToEnd();

      await press("Einrücken");
      await waitFor(() => expect(lastValue(onChange)[0].indent).toBe(1));

      await press("Ausrücken");
      await waitFor(() => expect(lastValue(onChange)[0].indent).toBeUndefined());
    });

    it("macht aus dem Absatz eine Aufzählung", async () => {
      const { onChange } = setup();
      await caretToEnd();

      await press("Aufzählung");

      await waitFor(() => expect(lastValue(onChange)[0].type).toBe("ul"));
      expect(tool("Aufzählung")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Link", () => {
    const openForm = async (): Promise<HTMLElement> => {
      await act(async () => {
        within(toolbar()).getByRole("button", { name: "Link einfügen" }).click();
      });
      return screen.getByTestId("custom-editor-link-form");
    };

    it("meldet ein verbotenes Schema sofort und eine leere Adresse erst beim Einfügen", async () => {
      setup();
      const form = await openForm();
      const address = within(form).getByLabelText(/Adresse/);

      expect(within(form).queryByRole("alert")).toBeNull();
      await act(async () => {
        within(form).getByRole("button", { name: "Link einfügen" }).click();
      });
      expect(within(form).getByRole("alert")).toHaveTextContent("Bitte eine Adresse eintragen.");

      fireEvent.change(address, { target: { value: "javascript:alert(1)" } });
      expect(within(form).getByRole("alert")).toHaveTextContent("nicht erlaubt");
      expect(address).toHaveAttribute("aria-invalid", "true");
    });

    it("setzt den Link an der Marke und schließt das Formular", async () => {
      const { onChange } = setup();
      await caretToEnd();
      const form = await openForm();

      fireEvent.change(within(form).getByLabelText(/Adresse/), { target: { value: "https://www.man.eu" } });
      fireEvent.change(within(form).getByLabelText(/^Text/), { target: { value: "MAN" } });
      await act(async () => {
        within(form).getByRole("button", { name: "Link einfügen" }).click();
      });

      expect(screen.queryByTestId("custom-editor-link-form")).toBeNull();
      await waitFor(() => expect(surface().querySelector("a")).toHaveAttribute("href", "https://www.man.eu"));
      const link = (lastValue(onChange)[0].children as RichElement[]).find((node) => node.type === "a");
      expect(link).toMatchObject({ type: "a", url: "https://www.man.eu" });
    });

    it("schließt mit Abbrechen, ohne etwas zu ändern", async () => {
      const { onChange } = setup();
      const form = await openForm();

      await act(async () => {
        within(form).getByRole("button", { name: "Abbrechen" }).click();
      });

      expect(screen.queryByTestId("custom-editor-link-form")).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("Listen", () => {
    it("bietet die zwölf Farben mit Namen und „Standard“", async () => {
      setup();

      await act(async () => {
        within(toolbar()).getByRole("button", { name: "Textfarbe: Standard" }).click();
      });

      const swatches = screen.getByTestId("custom-editor-color-swatches");
      expect(within(swatches).getAllByRole("button")).toHaveLength(12);
      expect(within(swatches).getByRole("button", { name: "Rot" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByTestId("custom-editor-color-reset")).toHaveTextContent("Standard");
    });

    it("färbt den markierten Text und zeigt die Farbe am Werkzeug", async () => {
      const { onChange } = setup();
      await caretToEnd();
      await act(async () => {
        within(toolbar()).getByRole("button", { name: "Textfarbe: Standard" }).click();
      });
      await act(async () => {
        within(screen.getByTestId("custom-editor-color-swatches")).getByRole("button", { name: "Rot" }).click();
      });

      // Ohne markierten Text gilt die Farbe dem, was als Nächstes getippt
      // wird: das Werkzeug zeigt sie, der Baum bleibt, wie er ist.
      expect(within(toolbar()).getByRole("button", { name: "Textfarbe: Rot" })).toBeInTheDocument();
      expect(onChange.mock.calls.every(([value]) => JSON.stringify(value) === JSON.stringify(paragraph("Hallo")))).toBe(true);
    });

    it("führt die weiteren Auszeichnungen und „Formatierung entfernen“", async () => {
      setup();

      await act(async () => {
        within(toolbar()).getByRole("button", { name: "Weitere Auszeichnungen" }).click();
      });

      const menu = screen.getByTestId("custom-editor-more-marks-menu");
      expect(within(menu).getAllByRole("button").map((item) => item.textContent)).toEqual([
        "Hervorgehoben",
        "Hochgestellt",
        "Tiefgestellt",
        "Taste",
        "Formatierung entfernen",
      ]);
    });
  });
});
