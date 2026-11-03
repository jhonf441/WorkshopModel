'use strict'

// The tabs of the expression builder (what helps to build the expression: the paths of the model, the catalog of what an expression can
// do, ready recipes, the saved ones), each with its help (DESIGN.md section 7; keys builder_<id>...). The default tab and the tab to
// show for a snippet. Pure: test/expression-builder.test.js.

import { helpChoice } from './view-choices.js'

export const BUILDER_TABS = [
	helpChoice('builder', 'paths', { icon: 'mdi-file-tree-outline' }),
	helpChoice('builder', 'catalog', { icon: 'mdi-book-open-variant' }),
	helpChoice('builder', 'recipes', { icon: 'mdi-chef-hat' }),
	helpChoice('builder', 'saved', { icon: 'mdi-star-outline' })
]
export const DEFAULT_BUILDER_TAB = 'paths'
