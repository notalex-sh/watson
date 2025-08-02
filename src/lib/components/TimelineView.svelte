<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { events, entities, notes } from '$lib/stores';
  import { formatDate } from '$lib/utils';

  let newEventTitle = '';
  let newEventDate = new Date().toISOString().slice(0, 16);
  let newEventDescription = '';

  let editingEventId = null;
  let editingTitle = '';
  let editingDate = '';
  let editingDescription = '';

  function addEvent() {
    if (!newEventTitle) return;
    events.update(e => [{
      id: Date.now(),
      title: newEventTitle,
      date: newEventDate,
      description: newEventDescription,
      linkedEntities: []
    }, ...e]);
    newEventTitle = '';
    newEventDate = new Date().toISOString().slice(0, 16);
    newEventDescription = '';
  }

  function insertCurrentTimeToNotes() {
    const formattedNow = formatDate(new Date());
    notes.update(n => (n ? n + ' ' : '') + formattedNow);
  }

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
    if (confirm('Are you sure you want to delete this event?')) {
        events.update(currentEvents => currentEvents.filter(event => event.id !== eventId));
    }
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

<div class="flex flex-col h-full bg-gray-900/95">
    <div class="p-4 border-b border-cyan-600/30 flex-shrink-0">
        <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-medium text-cyan-300">> NEW TIMELINE EVENT</h3>
            <button on:click={insertCurrentTimeToNotes} class="btn btn-small">Insert Time</button>
        </div>
        <div class="space-y-3">
            <input type="text" bind:value={newEventTitle} placeholder="Event Title..." class="input" />
            <textarea bind:value={newEventDescription} placeholder="Event Description..." rows="2" class="input"></textarea>
            <input type="datetime-local" bind:value={newEventDate} class="input" />
            <button on:click={addEvent} class="btn btn-primary w-full">Log Event</button>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 min-h-0">
        <div class="relative space-y-8">
            <div class="absolute left-4 top-4 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-pink-500/50 shadow-lg shadow-cyan-500/30"></div>

            {#each $events.sort((a, b) => new Date(b.date) - new Date(a.date)) as event (event.id)}
                <div class="pl-10 relative">
                    <div class="absolute left-4 top-1 w-4 h-4 -translate-x-1/2 rounded-full bg-gray-900 border-2 border-cyan-400 flex items-center justify-center">
                        <div class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                    </div>

                    <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 hover:border-cyan-500 transition-all duration-300">
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
                                        <p class="text-xs text-pink-400 font-mono">{formatDate(event.date)}</p>
                                        <h4 class="font-bold text-cyan-300 mt-1">{event.title}</h4>
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