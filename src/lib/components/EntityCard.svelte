<script>
  import { entities, links, notes } from '$lib/stores';
  import { formatDate } from '$lib/utils';
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import EntityForm from './EntityForm.svelte';
  
  export let entity;
  export let isLinking = false;
  export let onLink = () => {};
  
  let showModal = false;
  let showEditModal = false;
  let modalMapElement;
  let modalMapInitialized = false;
  let mapError = false;
  
  $: linkedEntities = $links
    .filter(l => l.from === entity.id || l.to === entity.id)
    .map(l => {
      const linkedId = l.from === entity.id ? l.to : l.from;
      return $entities.find(e => e.id === linkedId);
    })
    .filter(e => e);
  
  const typeLabels = {
    'text': 'Person/Org',
    'email': 'Email',
    'phone': 'Phone',
    'url': 'Source',
    'image': 'Document',
    'location': 'Location',
    'vehicle': 'Vehicle',
    'object': 'Object'
  };
  
  function insertReference() {
    let ref = entity.content;

    if (entity.type === 'location' && entity.metadata.lat) {
      ref += ` (${entity.metadata.lat}, ${entity.metadata.lng})`;
    }
    
    notes.update(n => n + ref);
    showModal = false;
  }
  
  function copyEntity() {
    let text = entity.content;
    
    if (entity.type === 'location' && entity.metadata.lat) {
      text += ` (${entity.metadata.lat}, ${entity.metadata.lng})`;
    }
    
    navigator.clipboard.writeText(text);
  }
  
  function removeEntity() {
    if (confirm('Remove this entity and all its links?')) {
      entities.update(e => e.filter(en => en.id !== entity.id));
      links.update(l => l.filter(link => link.from !== entity.id && link.to !== entity.id));
      showModal = false;
    }
  }
  
  function editEntity() {
    showModal = false;
    showEditModal = true;
  }
  
  function handleCardClick() {
    if (isLinking) {
      onLink();
    } else {
      showModal = true;
      if (entity.type === 'location' && entity.metadata.lat && entity.metadata.lng) {
        setTimeout(() => initModalMap(), 100);
      }
    }
  }
  
  async function initModalMap() {
    if (entity.type === 'location' && entity.metadata.lat && entity.metadata.lng && modalMapElement && !modalMapInitialized) {
      await tick();
      if (modalMapElement && modalMapElement.offsetParent !== null) {
        try {
          const L = await import('leaflet');
          await import('leaflet/dist/leaflet.css');
          
          const map = L.default.map(modalMapElement).setView([entity.metadata.lat, entity.metadata.lng], 13);
          
          L.default.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
            attribution: '© Stadia Maps, © OpenMapTiles © OpenStreetMap contributors'
          }).addTo(map);
          
          L.default.marker([entity.metadata.lat, entity.metadata.lng]).addTo(map);
          
          modalMapInitialized = true;
        } catch (err) {
          console.error('Map init error:', err);
          mapError = true;
        }
      }
    }
  }
  
  onMount(() => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
  });
</script>

<div class="entity-card transition-all duration-200 {isLinking ? 'ring-2 ring-cyan-500 shadow-xl shadow-cyan-900/30' : ''}" 
     on:click={handleCardClick}
     on:keydown={(e) => e.key === 'Enter' && handleCardClick()}
     role="button"
     tabindex="0">
  <div class="flex justify-between items-start mb-2">
    <div>
      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {
        entity.type === 'text' ? 'bg-cyan-900/30 text-cyan-400' :
        entity.type === 'email' ? 'bg-purple-900/30 text-purple-400' :
        entity.type === 'phone' ? 'bg-purple-900/30 text-purple-400' :
        entity.type === 'url' ? 'bg-pink-900/30 text-pink-400' :
        entity.type === 'image' ? 'bg-green-900/30 text-green-400' :
        entity.type === 'location' ? 'bg-orange-900/30 text-orange-400' :
        entity.type === 'vehicle' ? 'bg-blue-900/30 text-blue-400' :
        entity.type === 'object' ? 'bg-yellow-900/30 text-yellow-400' :
        'bg-gray-700 text-gray-400'
      }">
        {typeLabels[entity.type]}
      </span>
      <div class="text-xs text-gray-600 mt-1">ID: {entity.id.toString().padStart(4, '0')}</div>
    </div>
  </div>
  
  <div class="mb-2">
    {#if entity.type === 'text'}
      <p class="font-medium text-gray-300">{entity.content}</p>
    {:else if entity.type === 'email' || entity.type === 'phone'}
      <p class="text-cyan-400 text-sm">{entity.content}</p>
    {:else if entity.type === 'url'}
      <p class="text-cyan-400 break-all text-sm">
        {entity.content.length > 40 ? entity.content.substring(0, 37) + '...' : entity.content}
      </p>
    {:else if entity.type === 'image'}
      <img src={entity.content} alt="Entity" class="max-h-32 rounded shadow-lg" />
    {:else if entity.type === 'location'}
      <p class="font-medium text-gray-300">📍 {entity.content}</p>
    {:else if entity.type === 'vehicle'}
      <p class="font-medium text-gray-300">🚗 {entity.content}</p>
      {#if entity.metadata?.plate}
        <p class="text-sm text-gray-500">Plate: {entity.metadata.plate}</p>
      {/if}
    {:else if entity.type === 'object'}
      <p class="font-medium text-gray-300">📦 {entity.content}</p>
      {#if entity.metadata?.category}
        <p class="text-sm text-gray-500">Category: {entity.metadata.category}</p>
      {/if}
    {/if}
  </div>
  
  {#if entity.description}
    <p class="text-sm text-gray-500 overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{entity.description}</p>
  {/if}
  
  <div class="text-xs text-gray-600 mt-2">{formatDate(entity.timestamp)}</div>
</div>

{#if showModal}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4" on:click={() => showModal = false}>
    <div class="bg-gray-900 border border-cyan-600 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-900/30" on:click|stopPropagation>
      <div class="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-start z-10">
        <div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {
            entity.type === 'text' ? 'bg-cyan-900/30 text-cyan-400' :
            entity.type === 'email' ? 'bg-purple-900/30 text-purple-400' :
            entity.type === 'phone' ? 'bg-purple-900/30 text-purple-400' :
            entity.type === 'url' ? 'bg-pink-900/30 text-pink-400' :
            entity.type === 'image' ? 'bg-green-900/30 text-green-400' :
            entity.type === 'location' ? 'bg-orange-900/30 text-orange-400' :
            entity.type === 'vehicle' ? 'bg-blue-900/30 text-blue-400' :
            entity.type === 'object' ? 'bg-yellow-900/30 text-yellow-400' :
            'bg-gray-700 text-gray-400'
          }">
            {typeLabels[entity.type]}
          </span>
          <div class="text-xs text-gray-600 mt-1">ID: {entity.id.toString().padStart(4, '0')}</div>
        </div>
        <button 
          class="text-gray-400 hover:text-gray-300"
          on:click={() => showModal = false}
        >
          ✕
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div>
          {#if entity.type === 'text'}
            <h2 class="text-xl font-bold text-gray-100">{entity.content}</h2>
          {:else if entity.type === 'email'}
            <a href="mailto:{entity.content}" class="text-cyan-400 hover:text-cyan-300 text-lg">
              {entity.content}
            </a>
          {:else if entity.type === 'phone'}
            <a href="tel:{entity.content}" class="text-cyan-400 hover:text-cyan-300 text-lg">
              {entity.content}
            </a>
          {:else if entity.type === 'url'}
            <a href={entity.content} target="_blank" class="text-cyan-400 hover:text-cyan-300 break-all">
              {entity.content}
            </a>
          {:else if entity.type === 'image'}
            <img src={entity.content} alt="Entity" class="max-w-full rounded-lg shadow-lg" />
          {:else if entity.type === 'location'}
            <h2 class="text-xl font-bold text-gray-100">📍 {entity.content}</h2>
            {#if entity.metadata.lat && entity.metadata.lng}
              <p class="text-sm text-gray-500 mt-1">Coordinates: {entity.metadata.lat}, {entity.metadata.lng}</p>
              <div bind:this={modalMapElement} class="h-64 mt-4 rounded-lg overflow-hidden shadow-lg relative z-0"></div>
            {/if}
          {:else if entity.type === 'vehicle'}
            <h2 class="text-xl font-bold text-gray-100">🚗 {entity.content}</h2>
            {#if entity.metadata?.plate}
              <p class="text-sm text-gray-500 mt-1">License Plate: {entity.metadata.plate}</p>
            {/if}
          {:else if entity.type === 'object'}
            <h2 class="text-xl font-bold text-gray-100">📦 {entity.content}</h2>
            {#if entity.metadata?.category}
              <p class="text-sm text-gray-500 mt-1">Category: {entity.metadata.category}</p>
            {/if}
          {/if}
        </div>
        
        {#if entity.description}
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-2">Notes</h3>
            <p class="text-gray-300">{entity.description}</p>
          </div>
        {/if}
        
        {#if linkedEntities.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-2">Linked Entities ({linkedEntities.length})</h3>
            <div class="flex flex-wrap gap-2">
              {#each linkedEntities as linked}
                <button 
                  class="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-600 px-3 py-1 rounded text-xs text-cyan-400"
                  on:click={() => {
                    showModal = false;
                    const el = document.querySelector(`[data-entity-id="${linked.id}"]`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  {linked.content.substring(0, 30)}...
                </button>
              {/each}
            </div>
          </div>
        {/if}
        
        <div class="text-xs text-gray-600">Added: {formatDate(entity.timestamp)}</div>
        
        <div class="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
          <button class="btn btn-small" on:click={insertReference}>
            Insert
          </button>
          <button class="btn btn-small" on:click={copyEntity}>Copy</button>
          <button class="btn btn-small" on:click={editEntity}>Edit</button>
          <button class="btn btn-small btn-danger" on:click={removeEntity}>Delete</button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-gray-900 border border-cyan-600 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-900/30 p-6">
      <EntityForm 
        editingEntity={entity}
        isModal={true}
        onClose={() => showEditModal = false}
      />
    </div>
  </div>
{/if}