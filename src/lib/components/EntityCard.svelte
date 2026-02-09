<!--
  Entity card component displaying item details with group management.
-->
<script>
  import { entities, links, events, allItems, allLinks, groups, groupIdCounter, saveUndoState } from '$lib/stores';
  import { formatDate } from '$lib/utils';
  import QuickAddModal from './QuickAddModal.svelte';

  export let entity;
  export let isLinking = false;

  let showModal = false;
  let showEditModal = false;
  let showGroupModal = false;
  let newGroupName = '';
  let newGroupColor = '#22D3EE';

  const GROUP_COLORS = [
    '#22D3EE', '#A78BFA', '#34D399', '#FB923C', '#F472B6',
    '#FBBF24', '#60A5FA', '#EF4444', '#10B981', '#8B5CF6'
  ];

  $: currentGroup = $groups.find(g => g.nodeIds.includes(entity.id));

  /**
   * Assigns the entity to a group.
   */
  function setEntityGroup(groupId) {
    saveUndoState();
    groups.update(g => {
      return g.map(group => {
        const newNodeIds = group.nodeIds.filter(id => id !== entity.id);
        if (group.id === groupId) {
          newNodeIds.push(entity.id);
        }
        return { ...group, nodeIds: newNodeIds };
      });
    });
  }

  /**
   * Removes the entity from its current group.
   */
  function removeFromGroup() {
    if (!currentGroup) return;
    saveUndoState();
    groups.update(g => {
      return g.map(group => {
        if (group.id === currentGroup.id) {
          return { ...group, nodeIds: group.nodeIds.filter(id => id !== entity.id) };
        }
        return group;
      });
    });
  }

  /**
   * Opens the create group modal with random color.
   */
  function openCreateGroupModal() {
    newGroupName = '';
    newGroupColor = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
    showGroupModal = true;
  }

  /**
   * Creates a new group and assigns this entity to it.
   */
  function createGroupAndAssign() {
    if (!newGroupName.trim()) return;
    saveUndoState();

    groupIdCounter.update(n => n + 1);
    let newId;
    groupIdCounter.subscribe(v => newId = v)();

    groups.update(g => [...g, {
      id: newId,
      name: newGroupName.trim(),
      color: newGroupColor,
      nodeIds: [entity.id],
      collapsed: false,
      hidden: false
    }]);

    showGroupModal = false;
  }
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
    'vehicle': 'Vehicle', 'object': 'Object', 'intel': 'Intel'
  };

  /**
   * Deletes the entity or event and its associated links.
   */
  function remove() {
    if(entity.itemType === 'event'){
        events.update(evs => evs.filter(e => e.id !== entity.originalId));
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

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', entity.id);
  }
</script>

<div class="entity-card transition-all duration-200 {isLinking ? 'ring-2 ring-cyan-500 shadow-xl shadow-cyan-900/30' : ''} {entity.type === 'incident' ? 'border-red-500/50 hover:border-red-400' : ''} {entity.priority === 'high' ? 'ring-1 ring-red-500/50' : ''} {entity.priority === 'low' ? 'opacity-60' : ''}"
     on:click={() => !isLinking && (showModal = true)}
     on:keydown={(e) => e.key === 'Enter' && !isLinking && (showModal = true)}
     role="button" tabindex="0"
     draggable="true"
     on:dragstart={handleDragStart}>
    <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {
                entity.type === 'incident' ? 'bg-red-900/30 text-red-400' :
                entity.itemType === 'event' ? 'bg-blue-900/30 text-blue-400' :
                entity.type === 'text' ? 'bg-cyan-900/30 text-cyan-400' :
                entity.type === 'email' || entity.type === 'phone' ? 'bg-purple-900/30 text-purple-400' :
                entity.type === 'location' ? 'bg-orange-900/30 text-orange-400' :
                entity.type === 'vehicle' ? 'bg-blue-900/30 text-blue-400' :
                entity.type === 'intel' ? 'bg-green-900/30 text-green-400' :
                'bg-gray-700 text-gray-400'
            }">
                {typeLabels[entity.type] || entity.type}
            </span>
            {#if entity.priority === 'high'}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400">!</span>
            {/if}
             <div class="text-xs text-gray-600 mt-1">ID: {typeof entity.id === 'number' ?
             entity.id.toString().padStart(4, '0') : entity.id}</div>
        </div>
        <button class="btn btn-small" on:click|stopPropagation={() => copyToClipboard(entity.content)}>Copy</button>
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
    <div class="text-xs text-gray-600 mt-2">{formatDate(entity.timestamp || entity.date)}</div>
</div>

{#if showModal}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
    <div class="bg-gray-900 border {entity.type === 'incident' ? 'border-red-500' : 'border-cyan-600'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
      <div class="sticky top-0 bg-gray-900 border-b {entity.type === 'incident' ? 'border-red-500/50' : 'border-gray-800'} p-4 flex justify-between items-start z-10">
        <div>
           <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {
                entity.type === 'incident' ? 'bg-red-900/30 text-red-400' :
                entity.itemType === 'event' ? 'bg-blue-900/30 text-blue-400' :
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
        <div>
          <h3 class="text-sm font-medium text-gray-400 mb-2">Group</h3>
          <div class="flex items-center gap-2">
            <select
              class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-300 text-sm focus:border-cyan-500 focus:outline-none"
              value={currentGroup?.id || ''}
              on:change={(e) => e.target.value ? setEntityGroup(parseInt(e.target.value)) : removeFromGroup()}
            >
              <option value="">No Group</option>
              {#each $groups as group}
                <option value={group.id}>
                  {group.name}
                </option>
              {/each}
            </select>
            {#if currentGroup}
              <span class="w-4 h-4 rounded-full" style="background-color: {currentGroup.color}"></span>
            {/if}
            <button
              class="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 text-sm hover:border-cyan-500 hover:text-cyan-400 transition-colors"
              on:click={openCreateGroupModal}
            >
              + New
            </button>
          </div>
        </div>
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

{#if showGroupModal}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" on:click={() => showGroupModal = false}>
    <div class="bg-gray-900 border border-cyan-600 rounded-lg w-full max-w-md shadow-2xl" on:click|stopPropagation>
      <div class="border-b border-gray-800 p-4 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-100">Create New Group</h3>
        <button class="text-gray-400 hover:text-gray-300" on:click={() => showGroupModal = false}>✕</button>
      </div>
      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">Group Name</label>
          <input
            type="text"
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-300 focus:border-cyan-500 focus:outline-none"
            bind:value={newGroupName}
            placeholder="Enter group name..."
            on:keydown={(e) => e.key === 'Enter' && createGroupAndAssign()}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">Color</label>
          <div class="flex flex-wrap gap-2">
            {#each GROUP_COLORS as color}
              <button
                class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                class:border-white={newGroupColor === color}
                class:border-transparent={newGroupColor !== color}
                style="background: {color}"
                on:click={() => newGroupColor = color}
              ></button>
            {/each}
          </div>
        </div>
      </div>
      <div class="border-t border-gray-800 p-4 flex justify-end gap-2">
        <button
          class="px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          on:click={() => showGroupModal = false}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={createGroupAndAssign}
          disabled={!newGroupName.trim()}
        >
          Create & Assign
        </button>
      </div>
    </div>
  </div>
{/if}