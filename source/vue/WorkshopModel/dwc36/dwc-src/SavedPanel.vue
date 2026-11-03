<template>
	<div class="mo-xb-panel">
		<div v-if="!items.length" class="mo-faint">{{ t('saved_none') }}</div>
		<table v-else class="mo-table">
			<tbody>
				<tr v-for="x in items" :key="x.mode + x.text">
					<td><span v-if="x.name" class="mo-rs-name">{{ x.name }}</span><code class="mo-key mo-xb-code">{{ x.text }}</code></td>
					<td class="mo-faint">{{ t(x.mode === 'm409' ? 'tester_m409' : 'tester_echo') }}</td>
					<td class="mo-row-actions">
						<v-btn x-small text @click="$emit('load', x)">{{ t('saved_load') }}</v-btn>
						<v-btn x-small text @click="sharing = x">{{ t('recipes_share_share') }}</v-btn>
						<v-btn x-small text @click="$emit('remove', x)">{{ t('saved_remove') }}</v-btn>
					</td>
				</tr>
			</tbody>
		</table>
		<recipe-import :full="isFavoritesFull(items)" @add="$emit('add', $event)" />
		<share-recipe-dialog v-if="sharing" :entry="sharing" @close="sharing = null" />
	</div>
</template>

<script>
'use strict'

// The favourite expressions of this browser (expression-favorites.js), each with Load, Share (the dialog that turns it into a
// community recipe file, ShareRecipeDialog.vue) and Remove, and the import of a recipe file into the list (RecipeImport.vue).
// Emits `load` and `remove` with the entry, `add` with a new entry.
import i18n from '../../i18n'
import RecipeImport from './RecipeImport.vue'
import ShareRecipeDialog from './ShareRecipeDialog.vue'
import { isFavoritesFull } from './expression-favorites.js'

export default {
	components: { RecipeImport, ShareRecipeDialog },
	props: { items: { type: Array, default: () => [] } },
	data() {
		return { sharing: null }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		isFavoritesFull
	}
}
</script>

<style>
.mo-page .mo-rs-name { display: block; font-size: 13px; }
</style>
