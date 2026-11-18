# custom-editor-widget

Staffbase-Custom-Widget. Entwickelt, gebaut und released wird es aus dem
Meta-Repo [`ps-mhp/man-staffbase-cms-extensions`](https://github.com/ps-mhp/man-staffbase-cms-extensions);
dieses Repo enthält nur Quellcode und das ausgelieferte Bundle unter `dist/`.

```bash
scripts/sync.sh custom-editor-widget
npm run build -- --env widget=custom-editor-widget
npm test -- src/widgets/custom-editor-widget
scripts/release.sh custom-editor-widget
```

## Aufbau

- **Seitenbündel** (`index.tsx`, `custom-editor-widget.tsx`, `rich-content.tsx`):
  die Leseansicht über dem gespeicherten Baum, ohne Plate.
- **Config-Modal** (`editor-injector.ts`): ersetzt das Feld `content` im
  Studio-Dialog durch das Vollbild-Modal von `@man/config-ui` (Kopf,
  Übernehmen, Rückgängig, Hilfe). Der Editor (`plate-editor.tsx` mit
  Werkzeugleiste, Link-Leiste, Farbwahl und Hilfe) wird nur dort per
  `React.lazy` nachgeladen.
- **Datenformat**: unverändert der Base64-Baum im Attribut `content`
  (`editor-value.ts`). Übernommen wird nur, was sich in der Leseform des
  Baums unterscheidet – Öffnen und Übernehmen ohne Änderung schreibt nichts.
