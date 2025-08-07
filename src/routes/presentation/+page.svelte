<script>
    import { onMount } from 'svelte';
    import { allItems, allLinks } from '$lib/stores';
    import { formatDate } from '$lib/utils';
    import NetworkView from '$lib/components/NetworkView.svelte';
    import TimelineView from '$lib/components/TimelineView.svelte';
    import MapView from '$lib/components/MapView.svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    let activeTab = 'network';
    let selectedEntity = null;

    $: entities = $allItems.filter(item => item.itemType === 'entity');
    
    $: linkedItems = selectedEntity ? $allLinks
        .filter(l => l.from === selectedEntity.id || l.to === selectedEntity.id)
        .map(l => {
            const linkedId = l.from === selectedEntity.id ? l.to : l.from;
            return $allItems.find(e => e.id === linkedId);
        })
        .filter(e => e) : [];

    onMount(() => {
        if (browser) {
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    if (selectedEntity) {
                        selectedEntity = null;
                    } else {
                        goto('/');
                    }
                }
            };
   
             window.addEventListener('keydown', handleKeydown);
            return () => window.removeEventListener('keydown', handleKeydown);
        }
    });
</script>

<div class="w-screen h-screen bg-gray-950 text-gray-300 p-8 flex flex-col gap-8">
    <div class="flex-1 flex gap-8 min-h-0">
        <div class="w-1/2 h-full flex flex-col">
            <h2 class="text-lg font-bold text-cyan-400 mb-4">Timeline</h2>
            <div class="flex-1 bg-gray-900/50 rounded-lg min-h-0">
                <TimelineView presentationMode={true} />
            </div>
        </div>
  
       <div class="w-1/2 h-full flex flex-col">
            <h2 class="text-lg font-bold text-cyan-400 mb-4">Entities</h2>
            <div class="flex-1 bg-gray-900/50 rounded-lg p-4 overflow-y-auto min-h-0">
                <div class="space-y-2">
                    {#if entities.length === 0}
                
                 <p class="text-center text-gray-500 text-sm py-10">No entities added yet.</p>
                    {:else}
                        {#each entities as entity (entity.id)}
                            <button class="w-full text-left bg-gray-800/50 rounded p-3 text-sm text-gray-300 hover:bg-cyan-500/10 transition-colors" on:click={() => selectedEntity = entity}>
                                {entity.content}
                            </button>
                        {/each}
                    
                    {/if}
                </div>
            </div>
        </div>
    </div>
    <div class="flex-1 flex flex-col min-h-0">
        <div class="flex border-b border-cyan-600/30 mb-4">
            <button
                class="flex-1 pb-2 text-sm font-medium transition-colors {activeTab === 'network' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-cyan-400'}"
                on:click={() => activeTab = 'network'}
            >
                Network Graph
            </button>
            <button
                class="flex-1 pb-2 text-sm font-medium transition-colors {activeTab === 'map' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-cyan-400'}"
                on:click={() => activeTab = 'map'}
            >
                Map View
            </button>
        </div>
        <div class="flex-1 bg-gray-900/50 rounded-lg min-h-0">
           
         {#if activeTab === 'network'}
                <NetworkView />
            {:else if activeTab === 'map'}
                <MapView />
            {/if}
        </div>
    </div>
    <button class="absolute top-4 right-4 btn btn-small" on:click={() => goto('/')}>Exit Presentation</button>
</div>

{#if selectedEntity}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4" on:click={() => selectedEntity = null}>
    <div class="bg-gray-900 border border-cyan-600 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" on:click|stopPropagation>
      <div class="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-start z-10">
        <h2 class="text-xl font-bold text-gray-100">{selectedEntity.content}</h2>
        <button class="text-gray-400 hover:text-gray-300" on:click={() => selectedEntity = null}>✕</button>
      </div>
      <div class="p-6 space-y-4">
        <div class="text-xs text-gray-500">
            Created: {formatDate(selectedEntity.timestamp)}
        </div>
        {#if selectedEntity.description}
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-2">Notes</h3>
            <p class="text-gray-300 whitespace-pre-wrap">{selectedEntity.description}</p>
          </div>
        {/if}
        {#if linkedItems.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-2">Linked Items ({linkedItems.length})</h3>
            <div class="flex flex-wrap gap-2">
              {#each linkedItems as linked}
                <span class="bg-gray-800 px-3 py-1 rounded text-xs text-cyan-400">{linked.content}</span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}