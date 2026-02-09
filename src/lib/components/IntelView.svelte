<!--
  Intel timeline panel displaying intelligence items with linked entities.
-->
<script>
    import { allItems, allLinks } from '$lib/stores';
    import { formatDate } from '$lib/utils';

    /**
     * Returns items linked to the given intel ID.
     */
    const getLinkedItems = (intelId) => {
        const linkedIds = $allLinks.filter(l => l.from === intelId || l.to === intelId).map(l => l.from === intelId ? l.to : l.from);
        return $allItems.filter(i => linkedIds.includes(i.id));
    };
</script>

<div class="flex flex-col h-full bg-gray-900/30">

    <div class="flex-1 overflow-y-auto p-4 min-h-0">
        <div class="relative space-y-8">
            <div class="absolute left-4 top-4 bottom-0 w-0.5 bg-gradient-to-b from-green-500/50 via-teal-500/50 to-cyan-500/50 shadow-lg shadow-green-500/30"></div>

            {#if $allItems.filter(i => i.type === 'intel').length === 0}
                <p class="text-center text-gray-500 text-sm py-10">No intel logged yet.</p>
            {/if}

            {#each $allItems.filter(i => i.type === 'intel').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) as intel (intel.id)}
                <div class="pl-10 relative">
                    <div class="absolute left-4 top-1 w-4 h-4 -translate-x-1/2 rounded-full bg-gray-900 border-2 border-green-400 flex items-center justify-center">
                        <div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                    </div>

                    <div class="bg-gray-800/50 backdrop-blur-sm border rounded-lg p-3 border-green-500/50 hover:border-green-400 transition-all duration-300">
                        <div>
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-xs text-green-400 font-mono">{formatDate(intel.timestamp)}</p>
                                    <h4 class="font-bold text-green-300 mt-1">{intel.content}</h4>
                                </div>
                            </div>
                            {#if intel.description}
                                <p class="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{intel.description}</p>
                            {/if}
                            <div class="mt-3 pt-3 border-t border-green-600/20">
                                <div class="flex flex-wrap gap-2 mb-3">
                                    {#each getLinkedItems(intel.id) as entity}
                                        <span class="bg-purple-500/30 text-purple-300 px-2 py-1 rounded text-xs">{entity.content}</span>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
