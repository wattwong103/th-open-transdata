# TODM — Transportation Open Data Map

A curated, searchable directory of free and open data sources for transportation
in Thailand, plus international tools.

**Live site:** https://wattwong103.github.io/th-open-transdata/

Browse the sources as an interactive tree, or search by name and filter by tag
to get a list of matching sources with descriptions and links.

## Tags

Each source is tagged so you know what to expect before you click:

| Tag  | Meaning                         |
| ---- | ------------------------------- |
| `G`  | Government-owned source         |
| `O`  | Open-source project             |
| `R`  | Requires registration           |
| `C`  | May contain commercial data     |
| `NA` | May not contain usable data     |

## Suggest or fix a source

All sources live in [`arf.json`](arf.json), a tree of folders and links.
Add a link inside the folder it belongs to:

```json
{
  "name": "Mobility Database (O)",
  "type": "url",
  "url": "https://mobilitydatabase.org/",
  "description": "Global catalog of GTFS and GBFS transit feeds, maintained by MobilityData"
}
```

- Put tags in parentheses at the end of `name`, e.g. `(G)(O)`. Only the five
  tags above are used as filters; other parentheses (such as agency acronyms
  like `(DOH)`) are hidden from the search results.
- Keep `description` to one short line saying what data the source has.
- A folder is `{ "name": "…", "type": "folder", "children": [ … ] }`.

Then open a pull request. Reports of missing, moved or broken links are welcome
by email too (see [Contact](#contact)).

## Run locally

The site is static HTML, CSS and JavaScript with no build step. Serve the
folder over HTTP (opening `index.html` directly won't load `arf.json`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project structure

| Path            | What it is                                                     |
| --------------- | -------------------------------------------------------------- |
| `index.html`    | The page                                                       |
| `arf.json`      | The source list                                                |
| `js/arf.js`     | Tree rendering (D3 v7, loaded from a CDN) and search / filters |
| `css/arf.css`   | Page styles, built on the design tokens                        |
| `styles.css`    | Entry point for the design tokens                              |
| `tokens/`       | Design tokens: colors, type, spacing, elevation, data-viz      |
| `assets/`       | Favicon                                                        |

The look comes from the Wongkaew Research design system. Style new UI with the
token variables in `tokens/` (for example `--surface-card`, `--text-muted`,
`--accent`) rather than hard-coded colors.

## Contact

Watcharapong Wongkaew — [w.wongkaew@csis.u-tokyo.ac.jp](mailto:w.wongkaew@csis.u-tokyo.ac.jp)
(or [watcharapong.w@chula.ac.th](mailto:watcharapong.w@chula.ac.th))

## License

[MIT](LICENSE)
