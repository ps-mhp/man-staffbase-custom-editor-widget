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
import { render, screen } from "@testing-library/react";

import { CustomEditorWidget } from "./custom-editor-widget";
import { EditorValue, encodeEditorAttribute } from "./editor-value";
import { RichContent } from "./rich-content";

const renderValue = (value: EditorValue): HTMLElement => {
  const { container } = render(<RichContent value={value} />);
  return container;
};

describe("RichContent", () => {
  it("bildet Blöcke auf ihre Tags ab", () => {
    const container = renderValue([
      { type: "h1", children: [{ text: "Eins" }] },
      { type: "h2", children: [{ text: "Zwei" }] },
      { type: "h3", children: [{ text: "Drei" }] },
      { type: "blockquote", children: [{ text: "Zitat" }] },
      { type: "hr", children: [{ text: "" }] },
    ]);

    expect(container.querySelector("h1")).toHaveTextContent("Eins");
    expect(container.querySelector("h2")).toHaveTextContent("Zwei");
    expect(container.querySelector("h3")).toHaveTextContent("Drei");
    expect(container.querySelector("blockquote")).toHaveTextContent("Zitat");
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("setzt Auszeichnungen als Tags um", () => {
    const container = renderValue([
      {
        type: "p",
        children: [
          { text: "f", bold: true },
          { text: "k", italic: true },
          { text: "u", underline: true },
          { text: "d", strikethrough: true },
          { text: "c", code: true },
        ],
      },
    ]);

    expect(container.querySelector("strong")).toHaveTextContent("f");
    expect(container.querySelector("em")).toHaveTextContent("k");
    expect(container.querySelector("u")).toHaveTextContent("u");
    expect(container.querySelector("s")).toHaveTextContent("d");
    expect(container.querySelector("code")).toHaveTextContent("c");
  });

  it("staffelt mehrere Auszeichnungen auf demselben Text", () => {
    const container = renderValue([{ type: "p", children: [{ text: "x", bold: true, italic: true }] }]);

    expect(container.querySelector("em > strong")).toHaveTextContent("x");
  });

  it("baut Listen mit ihren Punkten auf", () => {
    const container = renderValue([
      {
        type: "ul",
        children: [
          { type: "li", children: [{ type: "lic", children: [{ text: "A" }] }] },
          { type: "li", children: [{ type: "lic", children: [{ text: "B" }] }] },
        ],
      },
    ]);

    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelector("ul")).toHaveTextContent("AB");
  });

  it("gibt die Ausrichtung als Stil aus", () => {
    const container = renderValue([{ type: "p", align: "center", children: [{ text: "x" }] }]);

    expect(container.querySelector("p")).toHaveStyle({ textAlign: "center" });
  });

  it("öffnet Verweise in einem neuen Reiter, ohne dem Ziel den Öffner zu geben", () => {
    renderValue([
      { type: "p", children: [{ type: "a", url: "https://man.eu", children: [{ text: "MAN" }] }] },
    ]);

    const link = screen.getByRole("link", { name: "MAN" });
    expect(link).toHaveAttribute("href", "https://man.eu");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("CustomEditorWidget", () => {
  it("gibt bei leerem Inhalt nichts aus", () => {
    const { container } = render(<CustomEditorWidget contentLanguage="de_DE" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("stellt den gespeicherten Inhalt dar", () => {
    const raw = encodeEditorAttribute([{ type: "h2", children: [{ text: "Überschrift" }] }]);

    render(<CustomEditorWidget contentLanguage="de_DE" content={raw} />);

    expect(screen.getByRole("heading", { name: "Überschrift" })).toBeInTheDocument();
  });

  it("bleibt bei kaputtem Attributwert stumm statt zu brechen", () => {
    const { container } = render(<CustomEditorWidget contentLanguage="de_DE" content="b64:kein base64!!" />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("RichContent — erweiterte Auszeichnungen", () => {
  it("setzt Farbe, Größe und Schriftart als Stil", () => {
    const { container } = render(
      <RichContent
        value={[
          {
            type: "p",
            children: [{ text: "bunt", color: "#0074d9", fontSize: "24px" }],
          },
        ]}
      />,
    );

    const span = container.querySelector("span");
    expect(span).toHaveStyle({ color: "rgb(0, 116, 217)", fontSize: "24px" });
  });

  it("stellt Hervorhebung, Taste, Hoch- und Tiefstellung dar", () => {
    const { container } = render(
      <RichContent
        value={[
          {
            type: "p",
            children: [
              { text: "a", highlight: true },
              { text: "b", kbd: true },
              { text: "c", superscript: true },
              { text: "d", subscript: true },
            ],
          },
        ]}
      />,
    );

    expect(container.querySelector("mark")).toHaveTextContent("a");
    expect(container.querySelector("kbd")).toHaveTextContent("b");
    expect(container.querySelector("sup")).toHaveTextContent("c");
    expect(container.querySelector("sub")).toHaveTextContent("d");
  });

  it("hebt die Versalien einer Überschrift für eine Stelle auf", () => {
    const { container } = render(
      <RichContent
        value={[
          {
            type: "h1",
            children: [
              { text: "MODELL " },
              { text: "eTGX", lowercase: true },
            ],
          },
        ]}
      />,
    );

    expect(container.querySelector(".text-lowercase")).toHaveTextContent("eTGX");
  });

  it("rückt einen eingerückten Block ein", () => {
    const { container } = render(
      <RichContent value={[{ type: "p", indent: 2, children: [{ text: "eingerückt" }] }]} />,
    );

    expect(container.querySelector("p")).toHaveStyle({ marginInlineStart: "3em" });
  });

  it("stellt einen Codeblock als pre dar", () => {
    const { container } = render(
      <RichContent
        value={[{ type: "code_block", children: [{ type: "code_line", children: [{ text: "npm test" }] }] }]}
      />,
    );

    expect(container.querySelector("pre")).toHaveTextContent("npm test");
  });
});
