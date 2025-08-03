<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { events, entities, notes } from '$lib/stores';
  import { formatDate } from '$lib/utils';

  let editingEventId = null;
  let editingTitle = '';
  let editingDate = '';
  let editingDescription = '';

  function linkEntityToEvent(eventId, entityId) {
    if (!entityId) return;
    events.update(currentEvents => {
      return currentEvents.map(event => {
        if (event.id === eventId && !event.linkedEntities.includes(parseInt(entityId))) {
          return { ...event, linkedEntities: [...event.linkedEntities, parseInt(entityId)] };
        }
        return event;
      });
    });
  }

  function deleteEvent(eventId) {
    events.update(currentEvents => currentEvents.filter(event => event.id !== eventId));
  }

  function startEdit(event) {
    editingEventId = event.id;
    editingTitle = event.title;
    editingDate = event.date;
    editingDescription = event.description;
  }

  function saveEdit(eventId) {
    events.update(currentEvents => currentEvents.map(event => {
        if (event.id === eventId) {
            return {
                ...event,
                title: editingTitle,
                date: editingDate,
                description: editingDescription
            };
        }
        return event;
    }));
    cancelEdit();
  }

  function cancelEdit() {
    editingEventId = null;
    editingTitle = '';
    editingDate = '';
    editingDescription = '';
  }


  onMount(() => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
  });
</script>

<div class="flex flex-col h-full bg-gray-900/30">
    <div class="p-4 text-center border-b border-cyan-600/30">
        <p class="text-xs text-cyan-500/70">Press <span class="font-bold text-cyan-400">Shift + Tab</span> to add a new Event</p>
    </div>

    <div class="flex-1 overflow-y-auto p-4 min-h-0">
        <div class="relative space-y-8">
            <div class="absolute left-4 top-4 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-pink-500/50 shadow-lg shadow-cyan-500/30"></div>

            {#if $events.length === 0}
                <p class="text-center text-gray-500 text-sm py-10">No events logged yet.</p>
            {/if}

            {#each $events.sort((a, b) => new Date(b.date) - new Date(a.date)) as event (event.id)}
                <div class="pl-10 relative">
                    <div class="absolute left-4 top-1 w-4 h-4 -translate-x-1/2 rounded-full bg-gray-900 border-2 {event.type === 'incident' ? 'border-red-400' : 'border-cyan-400'} flex items-center justify-center">
                        <div class="w-1.5 h-1.5 rounded-full {event.type === 'incident' ? 'bg-red-400' : 'bg-cyan-400'} animate-pulse"></div>
                    </div>

                    <div class="bg-gray-800/50 backdrop-blur-sm border rounded-lg p-3 {event.type === 'incident' ? 'border-red-500/50 hover:border-red-400' : 'border-gray-700 hover:border-cyan-500'} transition-all duration-300">
                        {#if editingEventId === event.id}
                            <div class="space-y-3">
                                <input type="text" bind:value={editingTitle} class="input input-sm"/>
                                <textarea bind:value={editingDescription} class="input input-sm" rows="3"></textarea>
                                <input type="datetime-local" bind:value={editingDate} class="input input-sm"/>
                                <div class="flex gap-2 mt-2">
                                    <button on:click={() => saveEdit(event.id)} class="btn btn-primary btn-small flex-1">Save</button>
                                    <button on:click={cancelEdit} class="btn btn-small flex-1">Cancel</button>
                                </div>
                            </div>
                        {:else}
                            <div>
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="text-xs {event.type === 'incident' ? 'text-red-400' : 'text-pink-400'} font-mono">{formatDate(event.date)}</p>
                                        <h4 class="font-bold {event.type === 'incident' ? 'text-red-300' : 'text-cyan-300'} mt-1">{event.title}</h4>
                                    </div>
                                </div>
                                {#if event.description}
                                    <p class="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{event.description}</p>
                                {/if}
                                <div class="mt-3 pt-3 border-t border-cyan-600/20">
                                    <div class="flex flex-wrap gap-2 mb-3">
                                        {#each event.linkedEntities as entityId}
                                            {@const entity = $entities.find(e => e.id === entityId)}
                                            {#if entity}
                                                <span class="bg-purple-500/30 text-purple-300 px-2 py-1 rounded text-xs">{entity.content}</span>
                                            {/if}
                                        {/each}
                                    </div>
                                    <select class="input input-sm" on:change={(e) => linkEntityToEvent(event.id, e.target.value)}>
                                        <option value="">+ Link Entity...</option>
                                        {#each $entities.filter(ent => !event.linkedEntities.includes(ent.id)) as entity}
                                            <option value={entity.id}>{entity.content}</option>
                                        {/each}
                                    </select>
                                </div>
                                <div class="flex gap-2 mt-4">
                                     <button on:click={() => startEdit(event)} class="btn btn-small flex-1">Edit</button>
                                     <button on:click={() => deleteEvent(event.id)} class="btn btn-small btn-danger flex-1">Delete</button>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>