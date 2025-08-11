<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { allItems } from '$lib/stores';
	import { formatDate } from '$lib/utils';
	import QuickAddModal from './QuickAddModal.svelte';

	const dispatch = createEventDispatcher();
	let searchTerm = '';
	let searchInput;
	let showModal = false;
	let selectedItem = null;

	$: filteredItems = searchTerm
		? $allItems
				.filter(
					(item) =>
						(item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
						(item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
				)
				.slice(0, 10)
		: [];

	function openModal(item) {
		selectedItem = item;
		showModal = true;
	}

	onMount(() => {
		searchInput.focus();
	});
</script>

<div
	class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
	on:click={() => dispatch('close')}
>
	<div
		class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-2xl w-full shadow-2xl shadow-cyan-500/30"
		on:click|stopPropagation
	>
		<div class="p-4">
			<input
				bind:this={searchInput}
				type="text"
				bind:value={searchTerm}
				placeholder="Search everywhere..."
				class="input text-lg w-full"
			/>
		</div>
		{#if filteredItems.length > 0}
			<div class="border-t border-cyan-600/30 max-h-[60vh] overflow-y-auto">
				{#each filteredItems as item}
					<div
						class="p-4 border-b border-gray-800/50 hover:bg-cyan-600/10 cursor-pointer"
						on:click={() => openModal(item)}
					>
						<p class="font-semibold text-cyan-300">{item.content}</p>
						<p class="text-sm text-gray-400 truncate">{item.description || 'No description'}</p>
						<p class="text-xs text-gray-500 mt-1">{formatDate(item.timestamp || item.date)}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
{#if showModal}
	<QuickAddModal editingEntity={selectedItem} on:close={() => (showModal = false)} />
{/if}