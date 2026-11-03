# Contributing a recipe to Model Explorer

Spanish version: [CONTRIBUTING-RECIPES.es.md](CONTRIBUTING-RECIPES.es.md)

The Recipes tab of the expression builder shows ready expressions. Some are built by the plugin from the real paths of your machine;
the ones marked **Community** are JSON files that live in this repository, in `source/vue/WorkshopModel/recipes/`, and are bundled into
the plugin when a version is built. Anyone can propose one. The plugin never connects to the internet: a recipe reaches people with
the next release, with the author's name next to it.

## The short way

1. In Model Explorer, open the expression builder, go to **Saved** (or to **Recipes**) and tap **Share** on the formula you want to
   contribute. The dialog builds the file, checks it and shows the steps. Copy or download `<id>.json`.
2. On GitHub, open the folder [`source/vue/WorkshopModel/recipes`](source/vue/WorkshopModel/recipes), choose **Add file** -> **Create
   new file**, name it `<id>.json`, paste the text and choose **Propose new file**: GitHub opens a pull request for you. If you would
   rather not, open an issue and paste the file in it.
3. The maintainer reviews it. Once merged, the recipe comes with the next version.

## The file

One recipe is one file `recipes/<id>.json`. Every field below is checked by `dwc-src/recipe-schema.js` (`validateRecipe`); the same
check runs in the share dialog, in the import of the Saved tab and in the test that validates every file of the folder.

```json
{
  "id": "heater-above-limit",
  "title": { "en": "A heater above a limit", "es": "Un calentador sobre un límite" },
  "description": { "en": "True when the heater is hotter than the limit. Change the limit to what is safe for you." },
  "kind": "condition",
  "template": "heat.heaters[<heater>].current > <limit>",
  "holes": {
    "heater": { "type": "index", "en": "The number of the heater in heat.heaters (0 is usually the bed)." },
    "limit": { "type": "number", "en": "The temperature in degrees." }
  },
  "since": "3.1",
  "example": { "filled": "heat.heaters[0].current > 60", "result": "bool" },
  "author": "your-github-name",
  "tags": ["heaters", "safety"]
}
```

| Field | Required | Rule |
|---|---|---|
| `id` | yes | Lower case letters, digits and hyphens (`kebab-case`), up to 60 characters, unique in the folder. The file is named `<id>.json`. |
| `title` | yes | `{ "en": "...", "es": "..." }`: English required, Spanish optional. One line, up to 80 characters. |
| `description` | yes | Same shape: what it tells and when it is useful. One line, up to 300 characters. |
| `kind` | yes | `expression` (a value), `condition` (true or false), `m409` (a path read with `M409 K"..."`), `echo` (a text to show, built with `^`). |
| `template` | yes | The expression as it is loaded into the builder, one line, up to 400 characters, brackets and quotes balanced. A part the person adapts is a **hole**: `<name>` with a name in lower case letters and `_` (the builder selects it so you type over it). For `m409` the template is a path: no spaces, operators or quotes. |
| `holes` | when the template has holes | One entry per hole: `"type"` (one of `number`, `text`, `index`, `path`, `global`, `bool`, `expression`) and the description `"en"` (required) and `"es"` (optional), up to 160 characters. A hole in the template without an entry, or an entry without a hole, is refused. |
| `since` | yes | The first RepRapFirmware that has what the template uses, `"3.4"` style. On an older board the recipe is hidden, marked "needs RRF x.y". `3.1` for a plain expression or condition, `3.3` for `global.` and `exists()`, `3.5` for `vector()`. |
| `example` | yes | `"filled"`: the template with every hole filled (it must be the template with something in each hole); `"result"`: what it answers, one of `number`, `bool`, `string`, `array`, `object`, `null`. A `condition` answers `bool`. |
| `author` | no | Your GitHub user name (letters, digits, hyphens), shown next to the recipe. |
| `tags` | no | Up to 8 short words in `kebab-case`, searched by the Recipes tab. |
| `sample` | no | `true` only on the examples that ship with the plugin (do not set it). |

Any other field is refused. So is any **private data**: an IP address, a web address, a file path of a PC (`C:\...`, `/home/...`), a
network share. Keep the texts in plain words: what it is true for, which number to change, what to watch out for.

## Checking a file before you send it

With Node 22.7 or newer, from the root of this repository:

```
node source/vue/WorkshopModel/tools/check-recipes.js my-recipe.json     # one file, anywhere
node source/vue/WorkshopModel/tools/check-recipes.js                    # every file of the recipes folder, plus the generated module
```

The tool prints `OK` or one line per problem (`field: code (what)`), the same problems the share dialog shows in plain words. The
maintainer runs it with `--write` after merging, which regenerates `dwc-src/community-recipes-data.js` for both DWC lines; the test
`test/recipe-schema.test.js` fails when that module is out of date, when a file is bad, or when two files share an id.

## What makes a good recipe

- It answers one plain question (a heater above a limit, a fan speed as a percentage, everything about one axis).
- Its holes are the parts that differ between machines (a heater number, a limit), not the whole expression.
- The example works on a common machine as it is.
- The texts say when it is useful and what to watch out for, in English; a Spanish copy is welcome.
- The expression is RepRapFirmware syntax you have tried on a board: `=` or `==` for equal, `&&` and `||`, `^` to join texts, `?:`
  for a choice, `exists()` before a global that may not be there.
