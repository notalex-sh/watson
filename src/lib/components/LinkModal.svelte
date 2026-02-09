<!--
  Modal for creating and editing connections between entities.
-->
<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { entities, events, links, allItems, LINK_TYPES, ENTITY_TYPES } from '$lib/stores';
    import { getIconSvg } from '$lib/icons';

    export let editingLink = null;
    export let prefillSource = null;
    export let prefillTarget = null;

    const dispatch = createEventDispatcher();

    let sourceId = '';
    let targetId = '';
    let linkType = 'associate';
    let linkLabel = 'Associate';
    let linkDescription = '';

    let sourceSearch = '';
    let targetSearch = '';
    let showSourceDropdown = false;
    let showTargetDropdown = false;
    let sourceInputRef;
    let targetInputRef;

    $: filteredSourceEntities = $allItems.filter(e =>
        e.content?.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        e.title?.toLowerCase().includes(sourceSearch.toLowerCase())
    ).slice(0, 10);

    $: filteredTargetEntities = $allItems.filter(e =>
        e.id !== sourceId &&
        (e.content?.toLowerCase().includes(targetSearch.toLowerCase()) ||
         e.title?.toLowerCase().includes(targetSearch.toLowerCase()))
    ).slice(0, 10);

    $: sourceEntity = $allItems.find(e => e.id === sourceId);
    $: targetEntity = $allItems.find(e => e.id === targetId);

    onMount(() => {
        if (editingLink) {
            sourceId = editingLink.from;
            targetId = editingLink.to;
            linkType = editingLink.type || 'associate';
            linkLabel = editingLink.label || '';
            linkDescription = editingLink.description || '';

            const srcEntity = $allItems.find(e => e.id === sourceId);
            const tgtEntity = $allItems.find(e => e.id === targetId);
            sourceSearch = srcEntity?.content || srcEntity?.title || '';
            targetSearch = tgtEntity?.content || tgtEntity?.title || '';
        } else {
            if (prefillSource) {
                sourceId = prefillSource;
                const srcEntity = $allItems.find(e => e.id === prefillSource);
                sourceSearch = srcEntity?.content || srcEntity?.title || '';
            }
            if (prefillTarget) {
                targetId = prefillTarget;
                const tgtEntity = $allItems.find(e => e.id === prefillTarget);
                targetSearch = tgtEntity?.content || tgtEntity?.title || '';
            }
        }

        setTimeout(() => {
            if (!sourceId && sourceInputRef) {
                sourceInputRef.focus();
            } else if (!targetId && targetInputRef) {
                targetInputRef.focus();
            }
        }, 100);
    });

    function selectSource(entity) {
        sourceId = entity.id;
        sourceSearch = entity.content || entity.title;
        showSourceDropdown = false;
        if (!targetId) {
            setTimeout(() => targetInputRef?.focus(), 50);
        }
    }

    function selectTarget(entity) {
        targetId = entity.id;
        targetSearch = entity.content || entity.title;
        showTargetDropdown = false;
    }

    function handleSourceInput() {
        showSourceDropdown = true;
        const match = $allItems.find(e =>
            (e.content || e.title)?.toLowerCase() === sourceSearch.toLowerCase()
        );
        if (!match) {
            sourceId = '';
        }
    }

    function handleTargetInput() {
        showTargetDropdown = true;
        const match = $allItems.find(e =>
            (e.content || e.title)?.toLowerCase() === targetSearch.toLowerCase()
        );
        if (!match) {
            targetId = '';
        }
    }

    function handleSourceKeydown(e) {
        if (e.key === 'Escape') {
            showSourceDropdown = false;
        } else if (e.key === 'Enter' && filteredSourceEntities.length > 0) {
            e.preventDefault();
            selectSource(filteredSourceEntities[0]);
        } else if (e.key === 'Tab' && !e.shiftKey && filteredSourceEntities.length > 0 && showSourceDropdown) {
            e.preventDefault();
            selectSource(filteredSourceEntities[0]);
        }
    }

    function handleTargetKeydown(e) {
        if (e.key === 'Escape') {
            showTargetDropdown = false;
        } else if (e.key === 'Enter' && filteredTargetEntities.length > 0) {
            e.preventDefault();
            selectTarget(filteredTargetEntities[0]);
        } else if (e.key === 'Tab' && !e.shiftKey && filteredTargetEntities.length > 0 && showTargetDropdown) {
            e.preventDefault();
            selectTarget(filteredTargetEntities[0]);
        }
    }

    function save() {
        if (!sourceId || !targetId) {
            alert('Please select both source and target entities.');
            return;
        }

        if (sourceId === targetId) {
            alert('Source and target must be different entities.');
            return;
        }

        const customLabel = linkLabel.trim();

        if (editingLink) {
            links.update(l => l.map(link => {
                if (link.from === editingLink.from && link.to === editingLink.to) {
                    return {
                        from: sourceId,
                        to: targetId,
                        type: linkType,
                        label: customLabel,
                        description: linkDescription.trim()
                    };
                }
                return link;
            }));
        } else {
            const exists = $links.some(l =>
                (l.from === sourceId && l.to === targetId) ||
                (l.from === targetId && l.to === sourceId)
            );

            if (exists) {
                alert('A link between these entities already exists.');
                return;
            }

            links.update(l => [...l, {
                from: sourceId,
                to: targetId,
                type: linkType,
                label: customLabel,
                description: linkDescription.trim()
            }]);
        }

        dispatch('close');
        dispatch('saved');
    }

    /**
     * Returns SVG markup for the entity type icon.
     */
    function getEntityIconSvg(type) {
        return getIconSvg(type, 18, ENTITY_TYPES[type]?.color || '#22d3ee');
    }
</script>

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-lg w-full shadow-2xl shadow-cyan-500/30 p-6 relative my-8 max-h-[90vh] overflow-y-auto">
        <button
            class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all"
            on:click={() => dispatch('close')}
            aria-label="Close modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>

        <h3 class="text-lg font-semibold text-cyan-400 mb-4">
            {editingLink ? 'Edit Connection' : 'Create Connection'}
        </h3>

        <div class="space-y-4">
            <div class="relative">
                <label class="block text-xs font-medium text-gray-500 mb-1">From Entity</label>
                <div class="relative">
                    <input
                        type="text"
                        bind:this={sourceInputRef}
                        bind:value={sourceSearch}
                        on:input={handleSourceInput}
                        on:focus={() => showSourceDropdown = true}
                        on:keydown={handleSourceKeydown}
                        placeholder="Search for entity..."
                        class="input w-full pr-10"
                        class:border-green-500={sourceId}
                    />
                    {#if sourceEntity}
                        <span class="absolute right-3 top-1/2 -translate-y-1/2">
                            {@html getEntityIconSvg(sourceEntity.type)}
                        </span>
                    {/if}
                </div>
                {#if showSourceDropdown && filteredSourceEntities.length > 0}
                    <div class="absolute z-20 w-full mt-1 bg-gray-800 border border-cyan-500/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {#each filteredSourceEntities as entity}
                            <button
                                class="w-full text-left px-4 py-2 text-sm hover:bg-cyan-600/20 flex items-center gap-2 {entity.id === sourceId ? 'selected-entity' : ''}"
                                on:click={() => selectSource(entity)}
                            >
                                <span class="entity-icon">{@html getEntityIconSvg(entity.type)}</span>
                                <span class="truncate">{entity.content || entity.title}</span>
                                <span class="text-xs text-gray-500 ml-auto">{entity.type}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="flex items-center justify-center text-gray-500">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                </svg>
            </div>

            <div class="relative">
                <label class="block text-xs font-medium text-gray-500 mb-1">To Entity</label>
                <div class="relative">
                    <input
                        type="text"
                        bind:this={targetInputRef}
                        bind:value={targetSearch}
                        on:input={handleTargetInput}
                        on:focus={() => showTargetDropdown = true}
                        on:keydown={handleTargetKeydown}
                        placeholder="Search for entity..."
                        class="input w-full pr-10"
                        class:border-green-500={targetId}
                    />
                    {#if targetEntity}
                        <span class="absolute right-3 top-1/2 -translate-y-1/2">
                            {@html getEntityIconSvg(targetEntity.type)}
                        </span>
                    {/if}
                </div>
                {#if showTargetDropdown && filteredTargetEntities.length > 0}
                    <div class="absolute z-20 w-full mt-1 bg-gray-800 border border-cyan-500/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {#each filteredTargetEntities as entity}
                            <button
                                class="w-full text-left px-4 py-2 text-sm hover:bg-cyan-600/20 flex items-center gap-2 {entity.id === targetId ? 'selected-entity' : ''}"
                                on:click={() => selectTarget(entity)}
                            >
                                <span class="entity-icon">{@html getEntityIconSvg(entity.type)}</span>
                                <span class="truncate">{entity.content || entity.title}</span>
                                <span class="text-xs text-gray-500 ml-auto">{entity.type}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Connection Type</label>
                <select
                    bind:value={linkType}
                    class="input w-full"
                    on:change={(e) => linkLabel = LINK_TYPES[e.target.value]?.label || ''}
                >
                    {#each Object.entries(LINK_TYPES) as [key, type]}
                        <option value={key} style="border-left: 4px solid {type.color}">
                            {type.label}
                        </option>
                    {/each}
                </select>
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Custom Label (optional)</label>
                <input
                    type="text"
                    bind:value={linkLabel}
                    placeholder="e.g., Brother, Works at, Owns..."
                    class="input w-full"
                />
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                <textarea
                    bind:value={linkDescription}
                    placeholder="Additional details about this connection..."
                    rows="2"
                    class="input w-full"
                ></textarea>
            </div>

            <div class="flex gap-2 pt-4 border-t border-gray-800">
                <button class="btn flex-1" on:click={() => dispatch('close')}>Cancel</button>
                <button
                    class="btn btn-primary flex-1"
                    on:click={save}
                    disabled={!sourceId || !targetId}
                >
                    {editingLink ? 'Update' : 'Create'} Connection
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 0.375rem;
        color: #e5e7eb;
        font-size: 0.875rem;
    }

    .input:focus {
        outline: none;
        border-color: #22d3ee;
    }

    .input.border-green-500 {
        border-color: #22c55e;
    }

    .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
        background: #374151;
        color: #e5e7eb;
        border: 1px solid #4b5563;
    }

    .btn:hover {
        background: #4b5563;
    }

    .btn-primary {
        background: #0891b2;
        border-color: #22d3ee;
        color: white;
    }

    .btn-primary:hover {
        background: #0e7490;
    }

    .btn-primary:disabled {
        background: #374151;
        border-color: #4b5563;
        color: #6b7280;
        cursor: not-allowed;
    }

    select.input {
        cursor: pointer;
    }

    textarea.input {
        resize: none;
    }

    .selected-entity {
        background: rgba(34, 211, 238, 0.3);
    }
</style>
