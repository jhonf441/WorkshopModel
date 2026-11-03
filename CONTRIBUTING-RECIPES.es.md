# Aportar una receta al Explorador del modelo

Versión en inglés: [CONTRIBUTING-RECIPES.md](CONTRIBUTING-RECIPES.md)

La pestaña Recetas del constructor de expresiones muestra expresiones listas. Algunas las arma el plugin con las rutas reales de tu
máquina; las marcadas **Comunidad** son archivos JSON que viven en este repositorio, en `source/vue/WorkshopModel/recipes/`, y se
empaquetan con el plugin al armar una versión. Cualquiera puede proponer una. El plugin nunca se conecta a internet: una receta llega a
la gente con la siguiente versión, con el nombre de su autor al lado.

## El camino corto

1. En el Explorador del modelo abre el constructor de expresiones, ve a **Guardadas** (o a **Recetas**) y toca **Compartir** en la
   fórmula que quieres aportar. El diálogo arma el archivo, lo revisa y muestra los pasos. Copia o descarga `<id>.json`.
2. En GitHub abre la carpeta [`source/vue/WorkshopModel/recipes`](source/vue/WorkshopModel/recipes), elige **Add file** -> **Create new
   file**, ponle el nombre `<id>.json`, pega el texto y elige **Propose new file**: GitHub abre el pull request por ti. Si prefieres no
   hacerlo, abre un issue y pega el archivo ahí.
3. El mantenedor la revisa. Una vez integrada, la receta llega con la siguiente versión.

## El archivo

Una receta es un archivo `recipes/<id>.json`. Cada campo de abajo lo revisa `dwc-src/recipe-schema.js` (`validateRecipe`); la misma
revisión corre en el diálogo de compartir, en la importación de la pestaña Guardadas y en el test que valida todos los archivos de la
carpeta.

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
  "author": "tu-nombre-de-github",
  "tags": ["heaters", "safety"]
}
```

| Campo | Obligatorio | Regla |
|---|---|---|
| `id` | sí | Minúsculas, dígitos y guiones (`kebab-case`), hasta 60 caracteres, único en la carpeta. El archivo se llama `<id>.json`. |
| `title` | sí | `{ "en": "...", "es": "..." }`: el inglés es obligatorio, el español opcional. Una línea, hasta 80 caracteres. |
| `description` | sí | Misma forma: qué dice y cuándo sirve. Una línea, hasta 300 caracteres. |
| `kind` | sí | `expression` (un valor), `condition` (verdadero o falso), `m409` (una ruta leída con `M409 K"..."`), `echo` (un texto para mostrar, armado con `^`). |
| `template` | sí | La expresión tal como se carga en el constructor, una línea, hasta 400 caracteres, paréntesis y comillas balanceados. Una parte que la persona adapta es un **hueco**: `<nombre>` con un nombre en minúsculas y `_` (el constructor lo selecciona para escribir encima). Para `m409` la plantilla es una ruta: sin espacios, operadores ni comillas. |
| `holes` | si la plantilla tiene huecos | Una entrada por hueco: `"type"` (uno de `number`, `text`, `index`, `path`, `global`, `bool`, `expression`) y la descripción `"en"` (obligatoria) y `"es"` (opcional), hasta 160 caracteres. Un hueco en la plantilla sin entrada, o una entrada sin hueco, se rechaza. |
| `since` | sí | El primer RepRapFirmware que tiene lo que usa la plantilla, con la forma `"3.4"`. En una placa más vieja la receta se oculta, marcada "pide RRF x.y". `3.1` para una expresión o condición simple, `3.3` para `global.` y `exists()`, `3.5` para `vector()`. |
| `example` | sí | `"filled"`: la plantilla con todos los huecos llenos (debe ser la plantilla con algo en cada hueco); `"result"`: qué responde, uno de `number`, `bool`, `string`, `array`, `object`, `null`. Una `condition` responde `bool`. |
| `author` | no | Tu nombre de usuario de GitHub (letras, dígitos, guiones), mostrado junto a la receta. |
| `tags` | no | Hasta 8 palabras cortas en `kebab-case`, que el buscador de la pestaña Recetas encuentra. |
| `sample` | no | `true` solo en los ejemplos que vienen con el plugin (no lo pongas). |

Cualquier otro campo se rechaza. También cualquier **dato privado**: una dirección IP, una dirección web, una ruta de archivo de un PC
(`C:\...`, `/home/...`), un recurso de red. Escribe los textos en palabras claras: para qué es verdadera, qué número cambiar, con qué
tener cuidado.

## Revisar un archivo antes de enviarlo

Con Node 22.7 o más nuevo, desde la raíz de este repositorio:

```
node source/vue/WorkshopModel/tools/check-recipes.js mi-receta.json     # un archivo, donde sea
node source/vue/WorkshopModel/tools/check-recipes.js                    # todos los archivos de la carpeta, más el módulo generado
```

La herramienta imprime `OK` o una línea por problema (`campo: código (qué)`), los mismos problemas que el diálogo de compartir muestra en
palabras claras. El mantenedor la corre con `--write` después de integrar, lo que regenera `dwc-src/community-recipes-data.js` para las
dos líneas de DWC; el test `test/recipe-schema.test.js` falla cuando ese módulo está desactualizado, cuando un archivo está mal o
cuando dos archivos comparten un id.

## Qué hace buena a una receta

- Responde una sola pregunta clara (un calentador sobre un límite, la velocidad de un ventilador en porcentaje, todo sobre un eje).
- Sus huecos son las partes que cambian entre máquinas (un número de calentador, un límite), no la expresión entera.
- El ejemplo funciona tal cual en una máquina común.
- Los textos dicen cuándo sirve y con qué tener cuidado, en inglés; una copia en español es bienvenida.
- La expresión es sintaxis de RepRapFirmware que probaste en una placa: `=` o `==` para igual, `&&` y `||`, `^` para unir textos,
  `?:` para elegir, `exists()` antes de una global que puede no estar.
