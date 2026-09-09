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
