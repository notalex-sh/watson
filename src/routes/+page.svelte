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
  let sidebarWidth = 400;
  let mapWidth = 350;
  let isResizingSidebar = false;
  let isResizingMap = false;
  let isMapCollapsed = false;
  let showEntityModal = false;
  
  $: filteredEntities = $entities.filter(entity => {
    const searchIn = entity.description.toLowerCase() + 
                    (entity.type !== 'image' ? entity.content.toLowerCase() : '');
    return searchIn.includes(searchTerm.toLowerCase());
  });
  
  onMount(() => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
    
    // Keyboard shortcuts
    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        showEntityModal = true;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        isMapCollapsed = !isMapCollapsed;
      }
    }
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
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
  
  function startResizeSidebar(e) {
    isResizingSidebar = true;
    e.preventDefault();
  }
  
  function startResizeMap(e) {
    isResizingMap = true;
    e.preventDefault();
  }
  
  function resize(e) {
    if (isResizingSidebar) {
      const newWidth = window.innerWidth - e.clientX;
      sidebarWidth = Math.max(300, Math.min(600, newWidth));
    } else if (isResizingMap) {
      const editorRight = window.innerWidth - sidebarWidth;
      const newWidth = e.clientX;
      mapWidth = Math.max(200, Math.min(500, newWidth));
    }
  }
  
  function stopResize() {
    isResizingSidebar = false;
    isResizingMap = false;
  }
  
  function toggleMapCollapse() {
    isMapCollapsed = !isMapCollapsed;
  }
</script>

<svelte:window on:mousemove={resize} on:mouseup={stopResize} />

<Header />

<div class="flex flex-1 min-h-0 overflow-hidden">
  <div class="flex">
    <div 
      class="bg-gray-900 flex flex-col h-full overflow-hidden transition-all duration-300 flex-shrink-0"
      style="width: {isMapCollapsed ? '40px' : mapWidth + 'px'}"
    >
      {#if isMapCollapsed}
        <button
          class="h-full w-full bg-gray-800/80 backdrop-blur-sm hover:bg-cyan-600/20 flex items-center justify-center border-r border-cyan-600/30 transition-all"
          on:click={toggleMapCollapse}
          title="Expand map (Ctrl+M)"
        >
          <svg class="w-4 h-4 text-cyan-400 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      {:else}
        <div class="bg-gray-800/90 backdrop-blur-sm border-b border-cyan-600/30 px-4 py-3 flex justify-between items-center">
          <h3 class="text-sm font-medium text-cyan-300">MAP</h3>
          <button
            class="text-cyan-400 hover:text-cyan-300 transition-colors"
            on:click={toggleMapCollapse}
            title="Collapse map (Ctrl+M)"
          >
            <svg class="w-4 h-4 transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <MapView isCollapsed={false} />
      {/if}
    </div>
    
    {#if !isMapCollapsed}
      <div
        class="w-1 bg-gray-800/50 hover:bg-cyan-500 cursor-col-resize transition-all duration-200 relative flex-shrink-0"
        on:mousedown={startResizeMap}
        role="separator"
        aria-label="Resize map"
      >
        <div class="absolute inset-y-0 -left-2 -right-2"></div>
      </div>
    {/if}
  </div>
  
  <Editor />
  
  <div
    class="w-1 bg-gray-800/50 hover:bg-cyan-500 cursor-col-resize transition-all duration-200 relative flex-shrink-0"
    on:mousedown={startResizeSidebar}
    role="separator"
    aria-label="Resize sidebar"
  >
    <div class="absolute inset-y-0 -left-2 -right-2"></div>
  </div>

  <div class="bg-gray-900 flex flex-col h-full overflow-hidden flex-shrink-0" style="width: {sidebarWidth}px">
    <div class="flex bg-gray-800/90 backdrop-blur-sm border-b border-cyan-600/30 flex-shrink-0">
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'entities' ? 'text-cyan-300 bg-gray-900/80' : 'text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50'}"
        on:click={() => activeTab = 'entities'}
      >
        ENTITIES
        {#if activeTab === 'entities'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50"></span>
        {/if}
      </button>
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'network' ? 'text-cyan-300 bg-gray-900/80' : 'text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50'}"
        on:click={() => activeTab = 'network'}
      >
        NETWORK
        {#if activeTab === 'network'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50"></span>
        {/if}
      </button>
      <button
        class="flex-1 py-3 text-xs font-medium transition-all relative {activeTab === 'analysis' ? 'text-cyan-300 bg-gray-900/80' : 'text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50'}"
        on:click={() => activeTab = 'analysis'}
      >
        ANALYSIS
        {#if activeTab === 'analysis'}
          <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50"></span>
        {/if}
      </button>
    </div>
    
    <div class="flex-1 overflow-hidden flex flex-col">
      {#if activeTab === 'entities'}
        <div class="flex-1 flex flex-col overflow-hidden min-h-2/3">
          <EntityForm />
          
          {#if linkingMode}
            <div class="px-5 py-3 bg-cyan-500/20 border-b border-cyan-400/50 flex-shrink-0 backdrop-blur-sm">
              <p class="text-sm text-cyan-300">
                Select entity to link with: 
                <span class="font-medium text-cyan-200">
                  {$entities.find(e => e.id === linkingFromId)?.content.substring(0, 30)}...
                </span>
              </p>
              <button class="btn btn-small mt-2" on:click={() => { linkingMode = false; linkingFromId = null; }}>
                Cancel
              </button>
            </div>
          {/if}
          
          <div class="flex-1 overflow-y-auto p-5 bg-gray-800/30 h-1/3">
            <div class="flex gap-2 mb-4">
              <input
                type="text"
                bind:value={searchTerm}
                placeholder="Search entities..."
                class="input flex-1"
              />
              <button
                class="btn btn-primary btn-small"
                on:click={() => showEntityModal = true}
                title="Add entity (Ctrl+E)"
              >
                + Add
              </button>
            </div>
            
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
      {:else if activeTab === 'analysis'}
        <AnalysisView />
      {/if}
    </div>
  </div>
</div>

{#if showEntityModal}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-gray-900/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-500/30 p-6">
      <EntityForm 
        isModal={true}
        onClose={() => showEntityModal = false}
      />
    </div>
  </div>
{/if}