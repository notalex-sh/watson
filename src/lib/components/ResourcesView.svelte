<!--
  Resources panel for managing information sources, URLs, and references.
-->
<script>
    import { resources, resourceIdCounter, saveUndoState } from '$lib/stores';

    let newUrl = '';
    let newTitle = '';
    let newNotes = '';
    let editingId = null;
    let showAddForm = false;

    /**
     * Adds a new resource to the list.
     */
    function addResource() {
        if (!newUrl && !newTitle) return;

        saveUndoState();
        resourceIdCounter.update(n => n + 1);
        let newId;
        resourceIdCounter.subscribe(v => newId = v)();

        resources.update(r => [...r, {
            id: newId,
            url: newUrl.trim(),
            title: newTitle.trim() || newUrl.trim(),
            notes: newNotes.trim(),
            addedAt: new Date().toISOString(),
            accessed: false
        }]);

        newUrl = '';
        newTitle = '';
        newNotes = '';
        showAddForm = false;
    }

    /**
     * Removes a resource from the list.
     */
    function deleteResource(id) {
        saveUndoState();
        resources.update(r => r.filter(res => res.id !== id));
    }

    /**
     * Marks a resource as accessed.
     */
    function markAccessed(id) {
        resources.update(r => r.map(res =>
            res.id === id ? { ...res, accessed: true, accessedAt: new Date().toISOString() } : res
        ));
    }

    /**
     * Opens URL in new tab and marks as accessed.
     */
    function openResource(resource) {
        if (resource.url) {
            window.open(resource.url, '_blank', 'noopener,noreferrer');
            markAccessed(resource.id);
        }
    }

    /**
     * Copies URL to clipboard.
     */
    async function copyUrl(url) {
        try {
            await navigator.clipboard.writeText(url);
        } catch (e) {
            console.warn('Failed to copy:', e);
        }
    }
</script>

<div class="flex flex-col h-full bg-gray-900/30">
    <div class="p-3 border-b border-gray-700 flex justify-between items-center">
        <span class="text-sm text-gray-400">{$resources.length} resource{$resources.length !== 1 ? 's' : ''}</span>
        <button
            class="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded hover:bg-cyan-500/30 transition-colors"
            on:click={() => showAddForm = !showAddForm}
        >
            {showAddForm ? 'Cancel' : '+ Add Resource'}
        </button>
    </div>

    {#if showAddForm}
        <div class="p-3 border-b border-gray-700 bg-gray-800/50 space-y-2">
            <input
                type="text"
                bind:value={newTitle}
                placeholder="Title / Description"
                class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-500 focus:outline-none"
            />
            <input
                type="url"
                bind:value={newUrl}
                placeholder="URL (optional)"
                class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-500 focus:outline-none"
            />
            <textarea
                bind:value={newNotes}
                placeholder="Notes (optional)"
                rows="2"
                class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-500 focus:outline-none resize-none"
            ></textarea>
            <button
                class="w-full bg-cyan-500 text-gray-900 px-3 py-2 rounded text-sm font-medium hover:bg-cyan-400 transition-colors"
                on:click={addResource}
            >
                Add Resource
            </button>
        </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-3 space-y-2">
        {#if $resources.length === 0}
            <p class="text-center text-gray-500 text-sm py-10">
                No resources saved yet.<br/>
                <span class="text-xs">Add URLs, documents, or reference notes.</span>
            </p>
        {:else}
            {#each $resources.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)) as resource (resource.id)}
                <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-cyan-500/50 transition-colors group">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                {#if resource.accessed}
                                    <span class="w-2 h-2 rounded-full bg-green-500" title="Accessed"></span>
                                {:else}
                                    <span class="w-2 h-2 rounded-full bg-gray-600" title="Not accessed"></span>
                                {/if}
                                <h4 class="font-medium text-cyan-300 truncate">{resource.title}</h4>
                            </div>
                            {#if resource.url}
                                <p class="text-xs text-gray-500 truncate mt-1">{resource.url}</p>
                            {/if}
                            {#if resource.notes}
                                <p class="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{resource.notes}</p>
                            {/if}
                            <p class="text-xs text-gray-600 mt-2">
                                Added {new Date(resource.addedAt).toLocaleDateString()}
                                {#if resource.accessedAt}
                                    • Accessed {new Date(resource.accessedAt).toLocaleDateString()}
                                {/if}
                            </p>
                        </div>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {#if resource.url}
                                <button
                                    class="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded"
                                    title="Open URL"
                                    on:click={() => openResource(resource)}
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                    </svg>
                                </button>
                                <button
                                    class="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded"
                                    title="Copy URL"
                                    on:click={() => copyUrl(resource.url)}
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                </button>
                            {/if}
                            <button
                                class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                                title="Delete"
                                on:click={() => deleteResource(resource.id)}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>
