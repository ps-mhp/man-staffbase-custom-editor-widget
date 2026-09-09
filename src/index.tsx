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

import { startWidget } from "@shared/dev-mode/start-widget";
import { setPublicPathFromBundle } from "@shared/public-path";
import { getTranslationRegistry } from "@shared/translation/registry";

// Must run before any dynamic `import()`, so that lazily loaded chunks come
// from the CDN the bundle was served from and not from the hosting page.
setPublicPathFromBundle("custom-editor-widget.js");
import React from "react";
import ReactDOM from "react-dom/client";

import { BlockFactory, BlockDefinition, ExternalBlockDefinition, BaseBlock } from "widget-sdk";
import { configurationSchema, uiSchema } from "./configuration-schema";
import { CustomEditorWidget, CustomEditorWidgetProps } from "./custom-editor-widget";
import { startEditorInjector } from "./editor-injector";
import { customEditorTranslationProvider } from "./translation-provider";
import icon from "../resources/custom-editor-widget.svg";
import pkg from "../package.json";

/** Attributes handled by the widget; mirrored in the configuration schema. */
const widgetAttributes: string[] = ["content"];

let stopInjector: (() => void) | null = null;

/** Exported so tests can dispose of the `MutationObserver` on teardown. */
export function stopEditorInjector(): void {
  stopInjector?.();
  stopInjector = null;
}

const factory: BlockFactory = (BaseBlockClass, _widgetApi) => {
  return class CustomEditorWidgetBlock extends BaseBlockClass implements BaseBlock {
    private _root: ReactDOM.Root | null = null;

    private get props(): CustomEditorWidgetProps {
      return this.parseAttributes<CustomEditorWidgetProps>();
    }

    public renderBlock(container: HTMLElement): void {
      this._root ??= ReactDOM.createRoot(container);
      this._root.render(<CustomEditorWidget {...this.props} />);
    }

    public static get observedAttributes(): string[] {
      return widgetAttributes;
    }

    public attributeChangedCallback(...args: [string, string | undefined, string | undefined]): void {
      super.attributeChangedCallback.apply(this, args);
    }
  };
};

const blockDefinition: BlockDefinition = {
  name: "custom-editor-widget",
  factory: factory,
  attributes: widgetAttributes,
  blockLevel: "block",
  configurationSchema: configurationSchema,
  uiSchema: uiSchema,
  label: "Custom Editor Widget",
  iconUrl: icon,
};

const externalBlockDefinition: ExternalBlockDefinition = {
  blockDefinition,
  author: pkg.author,
  version: pkg.version,
};

/**
 * Beim Laden des Moduls angemeldet. Die Registrierung teilen sich alle
 * Widget-Bündel und hängt ihren `fetch`-Umweg nur einmal ein; wer zuerst lädt,
 * tut es, der Rest meldet sich nur an. Auf einer veröffentlichten Seite wird
 * die Übersetzung nie aufgerufen, dort kostet das also nichts.
 */
export const stopTranslationProvider = getTranslationRegistry().register(
  customEditorTranslationProvider,
);

void startWidget({
  name: "custom-editor-widget",
  version: pkg.version,
  register: () => {
    stopInjector = startEditorInjector();
    window.defineBlock(externalBlockDefinition);
  },
});
