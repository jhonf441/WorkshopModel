<template>
	<div class="mo-xb-panel">
		<choice-help :choice="CONTRIBUTE" :title="t('recipes_share_contribute')" class="mb-2" />
		<div class="mo-rs-tools mo-xb-head">
			<view-tabs :choices="SOURCES" :current="source" :label="t('recipes_share_filter')" @pick="source = $event" />
			<v-text-field v-model="query" dense outlined hide-details clearable class="mo-field" :label="t('recipes_share_search')" />
		</div>
		<div v-if="!cards.length" class="mo-faint">{{ (query || '').trim() ? t('recipes_share_none_match') : t('recipes_none') }}</div>
		<div v-for="c in cards" :key="c.source + ':' + c.id" class="mo-xb-entry" :class="{ 'mo-xb-off': c.support.state === 'newer' }">
			<div class="mo-xb-entry-head">
				<strong>{{ c.title }}</strong>
				<span class="mo-rs-chip">{{ t(c.source === 'community' ? 'recipes_share_chip_community' : 'recipes_share_chip_builtin') }}</span>
				<span v-if="c.sample" class="mo-rs-chip">{{ t('recipes_share_chip_sample') }}</span>
				<span v-if="c.author" class="mo-faint">{{ t('recipes_share_by', { author: c.author }) }}</span>
				<span v-if="c.support.state === 'newer'" class="mo-faint">{{ t('recipes_share_needs', { since: c.since }) }}</span>
				<v-btn x-small text @click="$emit('load', { id: c.id, mode: c.mode, code: c.code })">{{ t('recipe_load') }}</v-btn>
				<v-btn v-if="c.holes.length" x-small text @click="$emit('load', { id: c.id, mode: c.mode, code: c.example })">{{ t('recipes_share_load_example') }}</v-btn>
				<v-btn x-small text @click="share(c)">{{ t('recipes_share_share') }}</v-btn>
			</div>
			<div>{{ c.description }}</div>
			<code class="mo-key mo-xb-code">{{ c.code }}</code>
			<div v-if="c.holes.length" class="mo-faint mo-rs-holes">
				{{ t('recipes_share_holes') }}:
				<span v-for="h in c.holes" :key="h.name"><code class="mo-key">&lt;{{ h.name }}&gt;</code> {{ t('recipes_share_type_' + h.type) }}: {{ h.text }} </span>
			</div>
			<div v-if="c.source === 'community'" class="mo-faint">{{ t('recipes_share_example') }}: <code class="mo-key">{{ c.example }}</code><span v-if="c.tags.length"> &middot; {{ c.tags.join(', ') }}</span></div>
		</div>
		<div class="mo-actions">
			<v-btn v-if="newer" x-small text @click="showNewer = !showNewer">{{ showNewer ? t('recipes_share_hide_newer') : t('recipes_share_show_newer', { n: newer }) }}</v-btn>
			<a :href="RECIPES_GUIDE" target="_blank" rel="noopener" class="mo-faint">{{ t('recipes_share_guide_link') }}</a>
		</div>
		<share-recipe-dialog v-if="sharing" :entry="sharing.entry" :recipe="sharing.recipe" @close="sharing = null" />
	</div>
</template>

<script>
'use strict'

// The Recipes tab: the ready recipes built from the real paths of the model of this board (expression-recipes.js) and the community
// ones bundled with the plugin (community-recipes.js), in one list with a filter by source and a search; a community card shows its
// author, its blanks and its example, and is hidden when the firmware is older than it needs. Share opens the dialog that turns any
// card into a recipe file. Emits `load` with { id, mode, code }.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import ViewTabs from './ViewTabs.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import ShareRecipeDialog from './ShareRecipeDialog.vue'
import { recipesFor } from './expression-recipes.js'
import { RECIPE_SOURCES, DEFAULT_SOURCE, recipeCards, newerCount } from './community-recipes.js'
import { RECIPES_GUIDE } from './recipe-share.js'
import { firmwareVersionOf } from './rrf-version.js'
import { helpChoice } from './view-choices.js'

const CONTRIBUTE = helpChoice('recipes_share', 'contribute')
const ICONS = { all: 'mdi-view-list-outline', builtin: 'mdi-chip', community: 'mdi-account-group-outline' }
const SOURCES = RECIPE_SOURCES.map(id => ({ id, label: 'recipes_share_source_' + id, icon: ICONS[id] }))

export default {
	components: { ViewTabs, ChoiceHelp, ShareRecipeDialog },
	props: { tick: { type: Number, default: 0 } },
	data() {
		return { source: DEFAULT_SOURCE, query: '', showNewer: false, sharing: null, CONTRIBUTE, SOURCES, RECIPES_GUIDE }
	},
	computed: {
		firmware() {
			void this.tick
			return firmwareVersionOf(liveModel()) || ''
		},
		cards() {
			void this.tick
			return recipeCards({ builtin: recipesFor(liveModel()), text: this.t, lang: i18n.locale, firmware: this.firmware, source: this.source, query: this.query || '', showNewer: this.showNewer })
		},
		newer() {
			return this.source === 'builtin' ? 0 : newerCount(this.firmware)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		share(c) {
			this.sharing = c.recipe ? { entry: null, recipe: c.recipe } : { entry: { mode: c.mode, text: c.code, name: c.title, description: c.description }, recipe: null }
		}
	}
}
</script>
