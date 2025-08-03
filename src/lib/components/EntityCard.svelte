<script>
  import { entities, links, notes, events, allItems, allLinks } from '$lib/stores';
  import { formatDate } from '$lib/utils';
  import QuickAddModal from './QuickAddModal.svelte';

  export let entity;
  export let isLinking = false;
  export let onLink = () => {};
  let showModal = false;
  let showEditModal = false;

  $: linkedItems = $allLinks
    .filter(l => l.from === entity.id || l.to === entity.id)
    .map(l => {
      const linkedId = l.from === entity.id ? l.to : l.from;
      return $allItems.find(e => e.id === linkedId);
    })
    .filter(e => e);
  const typeLabels = {
    'event': 'Event', 'incident': 'Incident', 'text': 'Person/Org', 'email': 'Email', 
    'phone': 'Phone', 'url': 'Source', 'image': 'Document', 'location': 'Location', 
    'vehicle': 'Vehicle', 'object': 'Object'
  };
  function remove() {
    if(entity.itemType === 'event'){
        events.update(evs => evs.filter(e => e.id !== entity.id));
    } else {
        entities.update(e => e.filter(en => en.id !== entity.id));
        links.update(l => l.filter(link => link.from !== entity.id && link.to !== entity.id));
    }
    showModal = false;
  }

  function edit() {
      showModal = false;
      showEditModal = true;
  }
</script>

<div class="entity-card transition-all duration-200 {isLinking ? 'ring-2 ring-cyan-500 shadow-xl shadow-cyan-900/30' : ''} {entity.type === 'incident' ? 'border-red-500/50 hover:border-red-400' : ''}" 
     on:click={() => showModal = true}
     on:keydown={(e) => e.key === 'Enter' && (showModal = true)}
     role="button" tabindex="0">
    <div class="flex justify-between items-start mb-2">
        <div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {
              
                entity.type === 'incident' ? 'bg-red-900/30 text-red-400' :
                entity.itemType === 'event' ? 'bg-blue-900/30 text-blue-400' :
                entity.type === 'text' ? 'bg-cyan-900/30 text-cyan-400' :
                entity.type === 'email' || entity.type === 'phone' ? 'bg-purple-900/30 text-purple-400' :
                entity.type === 'location' ? 'bg-orange-900/30 text-orange-400' 
:
                entity.type === 'vehicle' ? 'bg-blue-900/30 text-blue-400' :
                'bg-gray-700 text-gray-400'
            }">
                {typeLabels[entity.type] ||
entity.type}
            </span>
             <div class="text-xs text-gray-600 mt-1">ID: {typeof entity.id === 'number' ?
entity.id.toString().padStart(4, '0') : entity.id}</div>
        </div>
    </div>
    <div class="mb-2">
        <p class="font-medium text-gray-300">{entity.content}</p>
        {#if entity.metadata?.plate}
            <p class="text-sm text-gray-500">Plate: {entity.metadata.plate}</p>
        {/if}
    </div>
    {#if entity.description}
        <p class="text-sm text-gray-500 overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{entity.description}</p>
    {/if}
    <div class="text-xs text-gray-600 mt-2">{formatDate(entity.timestamp 
 || entity.date)}</div>
</div>

{#if showModal}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4" on:click={() => showModal = false}>
    <div class="bg-gray-900 border {entity.type === 'incident' ? 'border-red-500' : 'border-cyan-600'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" on:click|stopPropagation>
      <div class="sticky top-0 bg-gray-900 border-b {entity.type === 'incident' ?
'border-red-500/50' : 'border-gray-800'} p-4 flex justify-between items-start z-10">
        <div>
           <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {
                entity.type === 'incident' ?
'bg-red-900/30 text-red-400' :
                entity.itemType === 'event' ?
'bg-blue-900/30 text-blue-400' :
                'bg-gray-700 text-gray-400'
            }">
                {typeLabels[entity.type]}
            </span>
        </div>
        <button class="text-gray-400 hover:text-gray-300" on:click={() => showModal = false}>✕</button>
      </div>
      <div class="p-6 space-y-4">
    
     <h2 class="text-xl font-bold text-gray-100">{entity.content}</h2>
        {#if entity.description}
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-2">Notes</h3>
            <p class="text-gray-300 whitespace-pre-wrap">{entity.description}</p>
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
         <div class="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
            <button class="btn btn-small" on:click={edit}>Edit</button>
            <button class="btn btn-small btn-danger" on:click={remove}>Delete</button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showEditModal}
    <QuickAddModal editingEntity={entity} on:close={() => showEditModal = false} />
{/if}