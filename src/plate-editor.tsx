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
 * Der WYSIWYG-Editor auf Basis von Plate (https://platejs.org/).
 *
 * Dieses Modul wird ausschließlich über `React.lazy` geladen (siehe
 * `editor-modal.tsx`). Plate samt Slate wiegt ein Vielfaches des Widgets, und
 * gebraucht wird es nur im Konfigurationsdialog — auf einer veröffentlichten
 * Seite darf dieser Code nicht mitgeladen werden. Deshalb stehen hier auch die
 * einzigen statischen Importe von `platejs`.
 *
 * Die Schreibfläche trägt dieselbe Klasse wie die Leseansicht
 * (`custom-editor-content`), damit beim Schreiben steht, was später auf der
 * Seite steht — ein zweites Regelwerk für den Editor würde unweigerlich
 * auseinanderlaufen.
 */

import React, {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Plate,
  PlateContent,
  PlateElement,
  PlateLeaf,
  createPlatePlugin,
  usePlateEditor,
} from "platejs/react";
import type { PlateElementProps, PlateLeafProps, PlateEditor } from "platejs/react";
import type { Value } from "platejs";
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HighlightPlugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  KbdPlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
} from "@platejs/basic-styles/react";
import { IndentPlugin } from "@platejs/indent/react";
import { indent, outdent } from "@platejs/indent";
import { CodeBlockPlugin, CodeLinePlugin } from "@platejs/code-block/react";
import { toggleCodeBlock } from "@platejs/code-block";
import {
  BulletedListPlugin,
  ListItemContentPlugin,
  ListItemPlugin,
  ListPlugin,
  NumberedListPlugin,
  useListToolbarButton,
  useListToolbarButtonState,
} from "@platejs/list-classic/react";
import { LinkPlugin } from "@platejs/link/react";
import { upsertLink, unwrapLink } from "@platejs/link";

import { useHotStyle } from "@shared/hot-style";

import {
  IconAlignCenter,
  IconAlignJustify,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconBulletedList,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClearFormat,
  IconClose,
  IconCode,
  IconCodeBlock,
  IconFillColor,
  IconHighlight,
  IconIndent,
  IconItalic,
  IconKbd,
  IconLink,
  IconMinus,
  IconNumberedList,
  IconOutdent,
  IconPlus,
  IconRedo,
  IconRule,
  IconSave,
  IconStrikethrough,
  IconSubscript,
  IconSuperscript,
  IconTextColor,
  IconUnderline,
  IconUndo,
  IconUnlink,
} from "./icons";
import { EditorValue, MARKS, STYLE_MARKS, TextAlign, isSafeUrl } from "./editor-value";
import { CONTENT_CLASS, LOWERCASE_CLASS } from "./content-class";
import editorCss from "./styles/editor.scss";
import richContentCss from "./styles/rich-content.scss";

const WIDGET = "custom-editor-widget";

/* ---------------------------------------------------------------- Knoten -- */

// Plate rendert jeden Knotentyp über eine Komponente. `PlateElement` bringt
// die Slate-Attribute mit; `as` bestimmt nur noch das Tag — damit entsteht
// exakt das Markup, das die Leseansicht später wieder aufbaut.
const block =
  (tag: keyof React.JSX.IntrinsicElements) =>
  (props: PlateElementProps): ReactElement => {
    const element = props.element as { align?: TextAlign; indent?: number };
    const style: React.CSSProperties = {};
    if (element.align !== undefined) style.textAlign = element.align;
    if (element.indent !== undefined && element.indent > 0) {
      style.marginInlineStart = `${element.indent * 1.5}em`;
    }
    return (
      <PlateElement {...props} as={tag as "div"} style={Object.keys(style).length > 0 ? style : undefined} />
    );
  };

const mark =
  (tag: "strong" | "em" | "u" | "s" | "code" | "mark" | "kbd" | "sup" | "sub") =>
  (props: PlateLeafProps): ReactElement =>
    <PlateLeaf {...props} as={tag} />;

/**
 * Die Ausnahme von der Versal-Regel.
 *
 * Sie ist kein eigenes Element, sondern eine Klasse an einer Textstelle — so
 * wie sie auch in der Leseansicht und im `table-widget` entsteht. Das Regelwerk
 * dazu steht in `styles/rich-content.scss` und gilt hier wie dort, weil die
 * Schreibfläche dieselbe Klasse trägt.
 */
function LowercaseLeaf(props: PlateLeafProps): ReactElement {
  return <PlateLeaf {...props} as="span" className={LOWERCASE_CLASS} />;
}

// Plate kennt die Auszeichnung nur, wenn ein Plugin sie anmeldet; ein Paket
// dafür gibt es nicht, weil sie aus der MAN-CI stammt und nicht aus Plate.
const LowercasePlugin = createPlatePlugin({ key: "lowercase", node: { isLeaf: true } });

function LinkElement(props: PlateElementProps): ReactElement {
  const url = (props.element as { url?: string }).url ?? "";
  return <PlateElement {...props} as="a" attributes={{ ...props.attributes, href: url }} />;
}

function HorizontalRuleElement(props: PlateElementProps): ReactElement {
  // Ein `hr` ist ein Void-Element: Slates Kinder müssen im Baum bleiben, dürfen
  // aber nicht ins `hr` — sonst wirft React.
  return (
    <PlateElement {...props} as="div">
      <div contentEditable={false}>
        <hr />
      </div>
      {props.children}
    </PlateElement>
  );
}

const COMPONENTS = {
  p: block("p"),
  h1: block("h1"),
  h2: block("h2"),
  h3: block("h3"),
  h4: block("h4"),
  h5: block("h5"),
  h6: block("h6"),
  blockquote: block("blockquote"),
  ul: block("ul"),
  ol: block("ol"),
  li: block("li"),
  lic: block("div"),
  code_block: block("pre"),
  code_line: block("div"),
  hr: HorizontalRuleElement,
  a: LinkElement,
  bold: mark("strong"),
  italic: mark("em"),
  underline: mark("u"),
  strikethrough: mark("s"),
  code: mark("code"),
  highlight: mark("mark"),
  kbd: mark("kbd"),
  superscript: mark("sup"),
  subscript: mark("sub"),
  lowercase: LowercaseLeaf,
};

// Die Einrückung hängt als Zahl am Block. Ohne diese Liste wüsste das Plugin
// nicht, welche Blöcke sie überhaupt tragen dürfen — Listenpunkte etwa rücken
// über ihre Verschachtelung ein und nicht über diese Eigenschaft.
const INDENTABLE = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"];

const PLUGINS = [
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
  CodeBlockPlugin,
  CodeLinePlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  HighlightPlugin,
  KbdPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  LowercasePlugin,
  FontColorPlugin,
  FontBackgroundColorPlugin,
  FontSizePlugin,
  IndentPlugin.configure({ inject: { targetPlugins: INDENTABLE } }),
  ListPlugin,
  BulletedListPlugin,
  NumberedListPlugin,
  ListItemPlugin,
  ListItemContentPlugin,
  LinkPlugin,
];

/* -------------------------------------------------------------- Werkzeug -- */

const BLOCK_OPTIONS = [
  { value: "p", label: "Fließtext" },
  { value: "h1", label: "Überschrift 1" },
  { value: "h2", label: "Überschrift 2" },
  { value: "h3", label: "Überschrift 3" },
  { value: "h4", label: "Überschrift 4" },
  { value: "h5", label: "Überschrift 5" },
  { value: "h6", label: "Überschrift 6" },
  { value: "blockquote", label: "Zitat" },
  { value: "code_block", label: "Codeblock" },
];

const MARK_BUTTONS: Array<{ key: string; icon: ReactElement; title: string }> = [
  { key: "bold", icon: <IconBold />, title: "Fett (Strg+B)" },
  { key: "italic", icon: <IconItalic />, title: "Kursiv (Strg+I)" },
  { key: "underline", icon: <IconUnderline />, title: "Unterstrichen (Strg+U)" },
  { key: "strikethrough", icon: <IconStrikethrough />, title: "Durchgestrichen" },
  { key: "code", icon: <IconCode />, title: "Code" },
  { key: "highlight", icon: <IconHighlight />, title: "Hervorgehoben" },
  { key: "superscript", icon: <IconSuperscript />, title: "Hochgestellt" },
  { key: "subscript", icon: <IconSubscript />, title: "Tiefgestellt" },
  { key: "kbd", icon: <IconKbd />, title: "Taste" },
  // Kein gezeichnetes Symbol, sondern zwei Kleinbuchstaben: sie zeigen
  // unmittelbar, was der Knopf bewirkt.
  {
    key: "lowercase",
    icon: <span className="custom-editor__glyph">aa</span>,
    title: "Kleinschreibung erzwingen (hebt die Versalien der Überschrift auf)",
  },
];

// Die Ausrichtung bekommt statt einer Auswahlliste vier Knöpfe: sie zeigt den
// aktuellen Zustand damit unmittelbar an, so wie die Auszeichnungen daneben.
const ALIGN_BUTTONS: Array<{ value: TextAlign; icon: ReactElement; title: string }> = [
  { value: "left", icon: <IconAlignLeft />, title: "Linksbündig" },
  { value: "center", icon: <IconAlignCenter />, title: "Zentriert" },
  { value: "right", icon: <IconAlignRight />, title: "Rechtsbündig" },
  { value: "justify", icon: <IconAlignJustify />, title: "Blocksatz" },
];

/**
 * Die Farbfelder der beiden Farbwahlen.
 *
 * Eine feste Auswahl statt eines freien Farbwählers: sie hält die Seite bei
 * einer überschaubaren Zahl von Tönen, und die Prüfung beim Lesen
 * (`editor-value.ts`) muss keinen beliebigen CSS-Wert durchlassen.
 */
const SWATCHES = [
  "#1f2933",
  "#5b6672",
  "#9aa5b1",
  "#ffffff",
  "#c0362c",
  "#e8590c",
  "#f59f00",
  "#2f9e44",
  "#0074d9",
  "#5f3dc4",
  "#c2255c",
  "#0b7285",
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 144;

/* ---------------------------------------------------------------- Hinweis -- */

/**
 * Zeigt oder verbirgt den Hinweis zu einem Bedienelement.
 *
 * Der Hinweis selbst wird ganz oben im Editor gezeichnet, nicht am Knopf: die
 * Werkzeugleiste läuft waagerecht über und beschneidet deshalb alles, was über
 * ihre Kante hinausragt — ein Hinweis am Knopf wäre unsichtbar oder erzeugte
 * eine zweite Bildlaufleiste.
 */
type ShowTip = (anchor: HTMLElement | null, text?: string) => void;

const TipContext = createContext<ShowTip>(() => undefined);

/**
 * Die Ereignisse, die ein Bedienelement für seinen Hinweis braucht.
 *
 * Auch `onFocus`/`onBlur`, damit der Hinweis bei Tastaturbedienung erscheint —
 * ohne ihn wüsste dort niemand, wofür ein Symbol steht.
 */
function useTip(text: string): {
  onMouseEnter: React.MouseEventHandler<HTMLElement>;
  onMouseLeave: React.MouseEventHandler<HTMLElement>;
  onFocus: React.FocusEventHandler<HTMLElement>;
  onBlur: React.FocusEventHandler<HTMLElement>;
} {
  const show = useContext(TipContext);

  return {
    onMouseEnter: (event) => show(event.currentTarget, text),
    onMouseLeave: () => show(null),
    onFocus: (event) => show(event.currentTarget, text),
    onBlur: () => show(null),
  };
}

/**
 * Die waagerecht laufende Spur der Werkzeugleiste.
 *
 * Der volle Werkzeugsatz passt in keinen Dialog. Ein Zeilenumbruch hätte die
 * Leiste je nach Zustand mal ein-, mal zweizeilig gemacht und die Werkzeuge
 * unter der Hand verschoben; die Spur hält sie stattdessen an ihrem Platz und
 * schiebt den Rest aus dem Bild. Damit das auf dem Schreibtisch — wo keine
 * Wischgeste den Überlauf verrät — überhaupt auffällt, stehen an beiden Enden
 * ein Pfeil und ein weicher Verlauf, und zwar nur an der Seite, an der wirklich
 * noch etwas liegt.
 */
function ToolbarTrack({ children }: { children: ReactNode }): ReactElement {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback((): void => {
    const element = track.current;
    if (!element) return;
    const rest = element.scrollWidth - element.clientWidth - element.scrollLeft;
    // Ein Pixel Spielraum: bei gebrochenen Breiten kommt der Bildlauf nie
    // genau auf null, und der Pfeil bliebe sonst am Anschlag stehen.
    setEdges({ start: element.scrollLeft > 1, end: rest > 1 });
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return undefined;

    measure();
    if (typeof ResizeObserver === "undefined") return undefined;

    // Beobachtet wird beides: die Spur (der Dialog kann sich ändern) und ihr
    // Inhalt (die Farbwahl klappt auf, der Stufenwähler wird breiter).
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  const nudge = (direction: number): void => {
    const element = track.current;
    if (!element) return;
    // Nicht die volle Breite: ein Rest des Bisherigen bleibt stehen, damit man
    // sieht, wo man war.
    element.scrollBy({ left: direction * Math.max(160, element.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <div className="custom-editor__tools">
      <div
        className="custom-editor__track"
        role="toolbar"
        aria-label="Textwerkzeuge"
        ref={track}
        onScroll={measure}
      >
        {children}
      </div>

      {edges.start ? (
        <button
          type="button"
          className="custom-editor__nudge custom-editor__nudge--start"
          aria-label="Werkzeuge nach links"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => nudge(-1)}
        >
          <IconChevronLeft />
        </button>
      ) : null}

      {edges.end ? (
        <button
          type="button"
          className="custom-editor__nudge custom-editor__nudge--end"
          aria-label="Werkzeuge nach rechts"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => nudge(1)}
        >
          <IconChevronRight />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ Bausteine -- */

/**
 * Ein Knopf der Werkzeugleiste.
 *
 * `onMouseDown` verhindert den Fokuswechsel: klickte der Knopf die Schreibmarke
 * weg, wüsste Slate beim Umschalten nicht mehr, worauf es sich beziehen soll.
 */
function ToolButton({
  icon,
  label,
  title,
  pressed,
  flagged,
  disabled,
  onPress,
}: {
  icon?: ReactElement;
  label?: string;
  title: string;
  pressed?: boolean;
  /** Setzt einen Punkt an den Knopf: hier steht noch etwas aus. */
  flagged?: boolean;
  disabled?: boolean;
  onPress: () => void;
}): ReactElement {
  const tip = useTip(title);

  return (
    <button
      type="button"
      className={`custom-editor__btn${icon ? " custom-editor__btn--icon" : ""}${
        flagged ? " custom-editor__btn--flagged" : ""
      }`}
      // Kein `title`: der Browser zeigte dann seinen eigenen Hinweis mit einer
      // Sekunde Verzögerung neben unserem.
      // Das Symbol allein trägt keinen Text; der Name kommt aus dem Hinweis.
      aria-label={icon ? title : undefined}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        // Nach dem Griff zum Werkzeug steht der Hinweis im Weg.
        tip.onMouseLeave(event);
        onPress();
      }}
      {...tip}
    >
      {icon ?? label}
    </button>
  );
}

/**
 * Eine Auswahlliste der Werkzeugleiste.
 *
 * Bewusst ein natives `<select>`: es bringt Tastaturbedienung, Bildlauf und die
 * Auswahl auf Mobilgeräten mit, was eine nachgebaute Liste erst wieder
 * herstellen müsste. Nur der Pfeil des Systems weicht einem eigenen, damit die
 * Liste neben den Symbolknöpfen nicht wie ein Formularfeld wirkt.
 */
function ToolSelect({
  label,
  options,
  value,
  width,
  onSelect,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  width?: number;
  onSelect: (value: string) => void;
}): ReactElement {
  const tip = useTip(label);

  return (
    <span className="custom-editor__picker" {...tip}>
      <select
        className="custom-editor__select"
        style={width === undefined ? undefined : { minWidth: `${width}px` }}
        aria-label={label}
        value={value}
        onChange={(event) => onSelect(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="custom-editor__picker-arrow" aria-hidden="true">
        <IconChevronDown />
      </span>
    </span>
  );
}

/**
 * Die Farbwahl: ein Knopf, der ein Feld mit Farbfeldern aufklappt.
 *
 * Der aktuelle Ton steht als Balken unter dem Symbol — so ist er ablesbar,
 * ohne dass das Feld offen sein muss.
 */
function ColorPicker({
  icon,
  title,
  value,
  onPick,
}: {
  icon: ReactElement;
  title: string;
  value: string | undefined;
  onPick: (color: string | undefined) => void;
}): ReactElement {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const wrapper = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const tip = useTip(title);
  const open = at !== null;

  // Ein Klick daneben schließt das Feld. Ohne diesen Zuhörer bliebe es offen,
  // bis jemand wieder auf den Knopf trifft.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent): void => {
      if (!wrapper.current?.contains(event.target as Node)) setAt(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Das Feld wird nicht am Knopf aufgehängt, sondern am Fenster: die
  // Werkzeugleiste läuft waagerecht über und beschnitte alles, was unter ihre
  // Kante reicht. Die Stelle wird beim Öffnen einmal gemessen — solange das
  // Feld offen ist, fängt der Zuhörer daneben ohnehin jeden Klick ab.
  const toggle = (): void => {
    if (open) {
      setAt(null);
      return;
    }
    const rect = button.current?.getBoundingClientRect();
    setAt(rect ? { left: rect.left, top: rect.bottom + 4 } : { left: 0, top: 0 });
  };

  return (
    <span className="custom-editor__picker" ref={wrapper}>
      <button
        ref={button}
        type="button"
        className="custom-editor__btn custom-editor__btn--icon custom-editor__btn--swatch"
        aria-label={title}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          tip.onMouseLeave(event);
          toggle();
        }}
        {...tip}
      >
        {icon}
        <span className="custom-editor__swatch" style={{ background: value ?? "transparent" }} />
      </button>

      {at !== null ? (
        <span
          className="custom-editor__palette"
          role="group"
          aria-label={title}
          style={{ left: `${at.left}px`, top: `${at.top}px` }}
        >
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className="custom-editor__chip"
              style={{ background: color }}
              title={color}
              aria-label={color}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onPick(color);
                setAt(null);
              }}
            />
          ))}
          <button
            type="button"
            className="custom-editor__palette-reset"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onPick(undefined);
              setAt(null);
            }}
          >
            Zurücksetzen
          </button>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Ein Listenknopf.
 *
 * Steht als eigene Komponente da, weil Plates Listen-Hooks den Editor aus dem
 * Kontext ziehen und deshalb unterhalb von `<Plate>` aufgerufen werden müssen.
 */
function ListButton({ type, icon, title }: { type: string; icon: ReactElement; title: string }): ReactElement {
  const state = useListToolbarButtonState({ nodeType: type });
  const { props } = useListToolbarButton(state);
  const tip = useTip(title);

  return (
    <button
      type="button"
      className="custom-editor__btn custom-editor__btn--icon"
      aria-label={title}
      aria-pressed={props.pressed}
      onMouseDown={props.onMouseDown}
      onClick={props.onClick}
      {...tip}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------------------------------------- Editor -- */

export interface PlateEditorProps {
  value: EditorValue;
  onChange: (value: EditorValue) => void;
  onSave: () => void;
  onClose: () => void;
  dirty: boolean;
}

/** Der Editor samt Werkzeugleiste und Steuerleiste. */
export default function CustomPlateEditor({
  value,
  onChange,
  onSave,
  onClose,
  dirty,
}: PlateEditorProps): ReactElement {
  const hotEditorCss = useHotStyle(editorCss, WIDGET, "styles/editor.scss");
  const hotContentCss = useHotStyle(richContentCss, WIDGET, "styles/rich-content.scss");

  // Der Editor wird einmal aufgebaut. `value` ist der Startwert, nicht die
  // laufende Wahrheit: Plate führt den Baum ab da selbst, und ein neues `value`
  // bei jedem Tastendruck setzte den Cursor zurück.
  const initialValue = useMemo(() => value, []);
  const editor = usePlateEditor({
    plugins: PLUGINS,
    components: COMPONENTS,
    value: initialValue as unknown as Value,
  });

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Die Werkzeugleiste muss den Zustand an der Einfügemarke zeigen. Plate
  // meldet Auswahländerungen nicht als React-State, deshalb genügt hier ein
  // Zähler, den jedes Ereignis hochdreht, das die Marke bewegen kann.
  const [, bumpSelection] = useState(0);
  const refresh = useCallback(() => bumpSelection((n) => n + 1), []);

  const blockType = currentBlockType(editor);
  const align = currentAlign(editor);
  const marks = editor.api.marks() ?? {};
  const fontSize = readFontSize(marks.fontSize);

  // Slates Verlauf hängt am Editor, nicht am React-Zustand: die Knöpfe lesen
  // ihn bei jedem Aufbau neu, und `refresh` sorgt dafür, dass es einen gibt.
  const history = (editor as unknown as { history?: { undos: unknown[]; redos: unknown[] } }).history;
  const canUndo = (history?.undos.length ?? 0) > 0;
  const canRedo = (history?.redos.length ?? 0) > 0;

  /** Führt eine Änderung aus und gibt Fokus und Werkzeugleiste nach. */
  const run = useCallback(
    (change: () => void): void => {
      change();
      editor.tf.focus();
      refresh();
    },
    [editor, refresh],
  );

  const toggleMark = (key: string): void =>
    run(() => {
      // Die Auszeichnungen aus den Plate-Paketen bringen einen eigenen
      // Umschalter mit; die selbst angemeldete (`lowercase`) nicht. Für sie
      // übernimmt der allgemeine Weg über die Marks.
      const transforms = editor.tf as unknown as Record<string, { toggle?: () => void } | undefined>;
      const toggle = transforms[key]?.toggle;
      if (typeof toggle === "function") {
        toggle.call(transforms[key]);
        return;
      }
      if (editor.api.marks()?.[key] === true) editor.tf.removeMarks(key);
      else editor.tf.addMarks({ [key]: true });
    });

  /** Setzt eine Auszeichnung mit Wert — oder nimmt sie weg, wenn keiner kommt. */
  const setStyleMark = (key: string, next: string | undefined): void =>
    run(() => {
      if (next === undefined || next === "") editor.tf.removeMarks(key);
      else editor.tf.addMarks({ [key]: next });
    });

  const setBlock = (type: string): void =>
    run(() => {
      if (type === "code_block") {
        toggleCodeBlock(editor);
        return;
      }
      // Ein Codeblock ist kein einfacher Absatztyp: er muss erst aufgelöst
      // werden, sonst läge der neue Typ in ihm statt an seiner Stelle.
      if (blockType === "code_block" || blockType === "code_line") toggleCodeBlock(editor);

      const transforms = editor.tf as unknown as Record<string, { toggle: () => void }>;
      if (type === "p") {
        // Es gibt kein `p.toggle()`; ein zweites Umschalten des aktuellen Typs
        // fällt in Plate immer auf den Absatz zurück.
        if (blockType !== "p") transforms[blockType]?.toggle();
      } else {
        transforms[type]?.toggle();
      }
    });

  const setAlign = (next: TextAlign): void =>
    run(() => {
      // Kein eigenes Plugin: die Ausrichtung ist eine Eigenschaft am Block, und
      // die Leseansicht liest sie genau so wieder aus.
      editor.tf.setNodes({ align: next } as never, {
        match: (node: unknown) => editor.api.isBlock(node as never),
      });
    });

  const setFontSize = (next: number): void => {
    const clamped = Math.min(Math.max(Math.round(next), MIN_FONT_SIZE), MAX_FONT_SIZE);
    setStyleMark("fontSize", clamped === DEFAULT_FONT_SIZE ? undefined : `${clamped}px`);
  };

  const clearFormatting = (): void =>
    run(() => editor.tf.removeMarks([...MARKS, ...STYLE_MARKS] as unknown as string));

  const insertRule = (): void =>
    run(() => editor.tf.insertNodes({ type: "hr", children: [{ text: "" }] } as never));

  // Der Hinweis liegt als einzelner Zustand im Editor, nicht als eigener
  // Zustand je Knopf: so kann immer nur einer sichtbar sein, und er wird über
  // allem gezeichnet statt in der beschnittenen Werkzeugspur.
  const [tip, setTip] = useState<{ text: string; left: number; top: number } | null>(null);
  const tipTimer = useRef<number | undefined>(undefined);

  const showTip = useCallback<ShowTip>((anchor, text) => {
    window.clearTimeout(tipTimer.current);
    if (anchor === null || text === undefined || text === "") {
      setTip(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    // Eine kurze Verzögerung, damit beim Wandern über die Leiste nicht bei
    // jedem Knopf ein Kästchen aufblitzt.
    tipTimer.current = window.setTimeout(() => {
      setTip({ text, left: rect.left + rect.width / 2, top: rect.bottom + 6 });
    }, 320);
  }, []);

  useEffect(() => () => window.clearTimeout(tipTimer.current), []);

  // Nach dem Speichern wechselt der Knopf für einen Moment auf einen Haken.
  // Der Vorgang selbst ist lautlos — ohne diese Rückmeldung bliebe offen, ob
  // der Klick angekommen ist.
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | undefined>(undefined);

  const save = (): void => {
    onSave();
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1400);
  };

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const openLinkDialog = (): void => {
    setLinkText(editor.api.string(editor.selection ?? undefined) ?? "");
    setLinkUrl("");
    setLinkOpen(true);
  };

  const applyLink = (): void => {
    if (isSafeUrl(linkUrl) && linkUrl.trim() !== "") {
      upsertLink(editor, { url: linkUrl.trim(), text: linkText.trim() || linkUrl.trim() });
    }
    setLinkOpen(false);
    editor.tf.focus();
    refresh();
  };

  return (
    <TipContext.Provider value={showTip}>
    <div className="custom-editor" data-testid="custom-editor">
      <style>{`${hotEditorCss}\n${hotContentCss}`}</style>

      <Plate
        editor={editor}
        onChange={({ value: next }: { value: unknown }) => {
          onChange(next as EditorValue);
          refresh();
        }}
        onSelectionChange={refresh}
      >
        <div className="custom-editor__bar">
          {/*
            Speichern steht fest ganz links und läuft mit der Werkzeugspur
            nicht mit: es ist keins der Werkzeuge, sondern die Entscheidung
            über das Ergebnis — sie muss erreichbar sein, ohne dass jemand erst
            die Leiste zurückschiebt.
          */}
          <span className="custom-editor__bar-lead">
            <ToolButton
              icon={saved ? <IconCheck /> : <IconSave />}
              title={saved ? "Gespeichert" : "Speichern"}
              // Der Punkt am Knopf zeigt, dass etwas aussteht — das ersetzt den
              // Schriftzug „Nicht gespeichert“, der in der Leiste nur Platz
              // gekostet hätte.
              flagged={dirty && !saved}
              onPress={save}
            />
          </span>

          <ToolbarTrack>
          <span className="custom-editor__group">
            <ToolButton icon={<IconUndo />} title="Rückgängig" disabled={!canUndo} onPress={() => run(() => editor.undo())} />
            <ToolButton icon={<IconRedo />} title="Wiederholen" disabled={!canRedo} onPress={() => run(() => editor.redo())} />
          </span>

          <span className="custom-editor__divider" />

          <ToolSelect
            label="Absatzformat"
            options={BLOCK_OPTIONS}
            value={BLOCK_OPTIONS.some((option) => option.value === blockType) ? blockType : "p"}
            width={132}
            onSelect={setBlock}
          />

          <span className="custom-editor__divider" />

          <span className="custom-editor__group custom-editor__stepper">
            <ToolButton icon={<IconMinus />} title="Kleiner" onPress={() => setFontSize(stepDown(fontSize))} />
            <span className="custom-editor__picker">
              <select
                className="custom-editor__select custom-editor__select--size"
                aria-label="Schriftgröße"
                title="Schriftgröße"
                value={String(fontSize)}
                onChange={(event) => setFontSize(Number(event.target.value))}
              >
                {(FONT_SIZES.includes(fontSize) ? FONT_SIZES : [...FONT_SIZES, fontSize].sort((a, b) => a - b)).map(
                  (size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ),
                )}
              </select>
            </span>
            <ToolButton icon={<IconPlus />} title="Größer" onPress={() => setFontSize(stepUp(fontSize))} />
          </span>

          <span className="custom-editor__divider" />

          <span className="custom-editor__group">
            {MARK_BUTTONS.map(({ key, icon, title }) => (
              <ToolButton
                key={key}
                icon={icon}
                title={title}
                pressed={marks[key] === true}
                onPress={() => toggleMark(key)}
              />
            ))}
          </span>

          <span className="custom-editor__divider" />

          <span className="custom-editor__group">
            <ColorPicker
              icon={<IconTextColor />}
              title="Textfarbe"
              value={typeof marks.color === "string" ? marks.color : undefined}
              onPick={(color) => setStyleMark("color", color)}
            />
            <ColorPicker
              icon={<IconFillColor />}
              title="Texthintergrund"
              value={typeof marks.backgroundColor === "string" ? marks.backgroundColor : undefined}
              onPick={(color) => setStyleMark("backgroundColor", color)}
            />
            <ToolButton icon={<IconClearFormat />} title="Formatierung entfernen" onPress={clearFormatting} />
          </span>

          <span className="custom-editor__divider" />

          <span className="custom-editor__group">
            <ListButton type="ul" icon={<IconBulletedList />} title="Aufzählung" />
            <ListButton type="ol" icon={<IconNumberedList />} title="Nummerierung" />
            <ToolButton icon={<IconOutdent />} title="Ausrücken" onPress={() => run(() => outdent(editor))} />
            <ToolButton icon={<IconIndent />} title="Einrücken" onPress={() => run(() => indent(editor))} />
          </span>

          <span className="custom-editor__divider" />

          <span className="custom-editor__group">
            {ALIGN_BUTTONS.map(({ value: option, icon, title }) => (
              <ToolButton
                key={option}
                icon={icon}
                title={title}
                pressed={align === option}
                onPress={() => setAlign(option)}
              />
            ))}
          </span>

          <span className="custom-editor__divider" />

          <span className="custom-editor__group">
            <ToolButton icon={<IconLink />} title="Verweis einfügen" onPress={openLinkDialog} />
            <ToolButton icon={<IconUnlink />} title="Verweis lösen" onPress={() => run(() => unwrapLink(editor))} />
            <ToolButton icon={<IconRule />} title="Trennlinie einfügen" onPress={insertRule} />
            <ToolButton
              icon={<IconCodeBlock />}
              title="Codeblock"
              pressed={blockType === "code_block" || blockType === "code_line"}
              onPress={() => run(() => toggleCodeBlock(editor))}
            />
          </span>
          </ToolbarTrack>

          <span className="custom-editor__bar-trail">
            <ToolButton icon={<IconClose />} title="Editor schließen" onPress={onClose} />
          </span>
        </div>

        <div className="custom-editor__scroll">
          <div className="custom-editor__sheet">
            <PlateContent
              className={`custom-editor__editable ${CONTENT_CLASS}`}
              placeholder="Text eingeben …"
              aria-label="Inhalt"
            />
          </div>
        </div>
      </Plate>

      {tip !== null ? (
        <div className="custom-editor__tip" role="tooltip" style={{ left: `${tip.left}px`, top: `${tip.top}px` }}>
          {tip.text}
        </div>
      ) : null}

      {linkOpen ? (
        <div className="custom-editor__overlay" role="presentation" onMouseDown={() => setLinkOpen(false)}>
          <div
            className="custom-editor__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Verweis einfügen"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="custom-editor__dialog-title">Verweis einfügen</p>
            <input
              className={`custom-editor__input${linkUrl !== "" && !isSafeUrl(linkUrl) ? " custom-editor__input--invalid" : ""}`}
              aria-label="Adresse"
              placeholder="https://…"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
            <input
              className="custom-editor__input"
              aria-label="Beschriftung"
              placeholder="Beschriftung"
              value={linkText}
              onChange={(event) => setLinkText(event.target.value)}
            />
            <div className="custom-editor__dialog-actions">
              <button
                type="button"
                className="custom-editor__btn custom-editor__btn--secondary"
                onClick={() => setLinkOpen(false)}
              >
                Abbrechen
              </button>
              <button type="button" className="custom-editor__btn custom-editor__btn--primary" onClick={applyLink}>
                Einfügen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </TipContext.Provider>
  );
}

/* ----------------------------------------------------------------- Lesen -- */

/** Der Typ des Blocks an der Einfügemarke; `p`, wenn nichts ausgewählt ist. */
function currentBlockType(editor: PlateEditor): string {
  const entry = editor.api.block();
  const type = entry?.[0] as { type?: string } | undefined;
  return type?.type ?? "p";
}

/** Die Ausrichtung des Blocks an der Einfügemarke. */
function currentAlign(editor: PlateEditor): TextAlign {
  const entry = editor.api.block();
  const block = entry?.[0] as { align?: TextAlign } | undefined;
  return block?.align ?? "left";
}

/** Die Schriftgröße an der Einfügemarke, in Pixeln und ohne Einheit. */
function readFontSize(raw: unknown): number {
  if (typeof raw !== "string") return DEFAULT_FONT_SIZE;
  const size = Number.parseFloat(raw);
  return Number.isFinite(size) ? Math.round(size) : DEFAULT_FONT_SIZE;
}

/** Die nächstgrößere Stufe der Liste — oder ein Schritt darüber hinaus. */
function stepUp(size: number): number {
  return FONT_SIZES.find((step) => step > size) ?? size + 2;
}

/** Die nächstkleinere Stufe der Liste. */
function stepDown(size: number): number {
  const smaller = FONT_SIZES.filter((step) => step < size);
  return smaller.length > 0 ? smaller[smaller.length - 1] : Math.max(size - 2, MIN_FONT_SIZE);
}
