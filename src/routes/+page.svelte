<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Header from '$lib/components/Header.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import EntityForm from '$lib/components/EntityForm.svelte';
  import EntityCard from '$lib/components/EntityCard.svelte';
  import NetworkView from '$lib/components/NetworkView.svelte';
  import MapView from '$lib/components/MapView.svelte';
  import AnalysisView from '$lib/components/AnalysisView.svelte';
  import { entities, links } from '$lib/stores';
  
  let activeTab = 'entities';
  let searchTerm = '';
  let linkingMode = false;
  let linkingFromId = null;
  let sidebarWidth = 600;
  let isResizing = false;
  
  $: filteredEntities = $entities.filter(entity => {
    const searchIn = entity.description.toLowerCase() + 
                    (entity.type !== 'image' ? entity.content.toLowerCase() : '');
    return searchIn.includes(searchTerm.toLowerCase());
  });
  
  onMount(() => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
  });
  
  function startLinking(fromId) {
    linkingMode = true;
    linkingFromId = fromId;
  }
  
  function createLink(toId) {
    if (!linkingMode || !linkingFromId || linkingFromId === toId) return;
    
    const exists = $links.find(l => 
      (l.from === linkingFromId && l.to === toId) ||
      (l.from === toId && l.to === linkingFromId)
    );
    
    if (!exists) {
      links.update(l => [...l, { from: linkingFromId, to: toId }]);
    }
    
    linkingMode = false;
    linkingFromId = null;
  }
  
  function startResize(e) {
    isResizing = true;
    e.preventDefault();
  }
  
  function resize(e) {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    sidebarWidth = Math.max(300, Math.min(800, newWidth));
  }
  
  function stopResize() {
    isResizing = false;
  }
</script>

<svelte:window on:mousemove={resize} on:mouseup={stopResize} />

<Header />

<div class="flex flex-1 min-h-0 overflow-hidden">
  <Editor />
  
  <div
    class="w-1 bg-gray-800 hover:bg-cyan-600 cursor-col-resize transition-colors relative flex-shrink-0"
    on:mousedown={startResize}
    role="separator"
    aria-label="Resize sidebar"
  >
    <div class="absolute inset-y-0 -left-2 -right-2"></div>
  </div>
  
  <div class="bg-gray-900 flex flex-col h-full overflow-hidden flex-shrink-0" style="width: {sidebarWidth}px">
    <div class="flex bg-gray-800 border-b border-gray-700 flex-shrink-0">
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'entities' ? 'text-cyan-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}"
        on:click={() => activeTab = 'entities'}
      >
        ENTITIES
        {#if activeTab === 'entities'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></span>
        {/if}
      </button>
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'network' ? 'text-cyan-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}"
        on:click={() => activeTab = 'network'}
      >
        NETWORK
        {#if activeTab === 'network'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></span>
        {/if}
      </button>
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'map' ? 'text-cyan-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}"
        on:click={() => activeTab = 'map'}
      >
        MAP
        {#if activeTab === 'map'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></span>
        {/if}
      </button>
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'analysis' ? 'text-cyan-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}"
        on:click={() => activeTab = 'analysis'}
      >
        ANALYSIS
        {#if activeTab === 'analysis'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></span>
        {/if}
      </button>
    </div>
    
    <div class="flex-1 overflow-hidden flex flex-col">
      {#if activeTab === 'entities'}
        <div class="flex-1 flex flex-col overflow-hidden min-h-2/3">
          <EntityForm />
          
          {#if linkingMode}
            <div class="px-5 py-3 bg-cyan-900/20 border-b border-cyan-600/50 flex-shrink-0">
              <p class="text-sm text-cyan-400">
                Select entity to link with: 
                <span class="font-medium">
                  {$entities.find(e => e.id === linkingFromId)?.content.substring(0, 30)}...
                </span>
              </p>
              <button class="btn btn-small mt-2" on:click={() => { linkingMode = false; linkingFromId = null; }}>
                Cancel
              </button>
            </div>
          {/if}
          
          <div class="flex-1 overflow-y-auto p-5 bg-gray-800/50 h-1/3">
            <input
              type="text"
              bind:value={searchTerm}
              placeholder="Search entities..."
              class="input mb-4"
            />
            
            <div class="space-y-3">
              {#if filteredEntities.length === 0}
                <div class="text-center py-8">
                  <p class="text-gray-500">No entities found</p>
                  <p class="text-sm text-gray-600 mt-2">
                    {searchTerm ? 'Try a different search term' : 'Add entities using the form above'}
                  </p>
                </div>
              {:else}
                {#each filteredEntities as entity (entity.id)}
                  <div data-entity-id={entity.id}>
                    <EntityCard 
                      {entity}
                      isLinking={linkingMode && linkingFromId !== entity.id}
                      onLink={() => createLink(entity.id)}
                    />
                    {#if !linkingMode}
                      <button 
                        class="btn btn-small mt-2 w-full"
                        on:click={() => startLinking(entity.id)}
                      >
                        Link To Other
                      </button>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      {:else if activeTab === 'network'}
        <NetworkView />
      {:else if activeTab === 'map'}
        <MapView />
      {:else if activeTab === 'analysis'}
        <AnalysisView />
      {/if}
    </div>
  </div>
</div>