<script>
  import { entities, links, entityIdCounter, entityNames, events } from '$lib/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let editingEntity = null;
  export let onClose = () => {};
  export let isModal = false;

  let type = editingEntity?.type || 'text';
  let textContent = editingEntity?.content || '';
  let urlContent = editingEntity?.type === 'url' ? editingEntity.content : '';
  let emailContent = editingEntity?.type === 'email' ? editingEntity.content : '';
  let phoneContent = editingEntity?.type === 'phone' ? editingEntity.content : '';
  let locationName = editingEntity?.type === 'location' ? editingEntity.content : '';
  let locationCoords = editingEntity?.type === 'location' && editingEntity.metadata?.lat ?
    `${editingEntity.metadata.lat}, ${editingEntity.metadata.lng}` : '';
  let vehicleInfo = editingEntity?.type === 'vehicle' ? editingEntity.content : '';
  let vehiclePlate = editingEntity?.type === 'vehicle' ? editingEntity.metadata?.plate || '' : '';
  let objectInfo = editingEntity?.type === 'object' ? editingEntity.content : '';
  let objectCategory = editingEntity?.type === 'object' ? editingEntity.metadata?.category || '' : '';
  let locationSearch = '';
  let description = editingEntity?.description || '';
  let linkedTo = editingEntity ? $links.filter(l => l.from === editingEntity.id).map(l => l.to) : [];
  let imageData = editingEntity?.type === 'image' ? editingEntity.content : null;
  let showAutocomplete = false;
  let filteredNames = [];
  let searchingLocation = false;
  let showAdvancedSearch = false;
  let searchResults = [];

  // New state for linking to an event
  let linkedEventId = null;

  onMount(() => {
    // If editing, find which event this entity is linked to
    if (editingEntity) {
        const eventLink = $events.find(ev => ev.linkedEntities.includes(editingEntity.id));
        if (eventLink) {
            linkedEventId = eventLink.id;
        }
    }
  });


  const typeLabels = {
    'text': 'Person/Org', 'email': 'Email', 'phone': 'Phone', 'url': 'Source',
    'image': 'Document', 'location': 'Location', 'vehicle': 'Vehicle', 'object': 'Object'
  };

  $: if (type === 'text' && textContent && !editingEntity) {
    filteredNames = $entityNames.filter(name =>
      name.toLowerCase().includes(textContent.toLowerCase()) && name !== textContent
    );
    showAutocomplete = filteredNames.length > 0;
  } else {
    showAutocomplete = false;
  }

  function handleImageDrop(e) { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) readImageFile(file); }
  function handleImageSelect(e) { const file = e.target.files[0]; if (file) readImageFile(file); }
  function readImageFile(file) { const reader = new FileReader(); reader.onload = (e) => { imageData = e.target.result; }; reader.readAsDataURL(file); }

  async function searchLocation() {
    if (!locationSearch) return;
    searchingLocation = true;
    searchResults = [];
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5&addressdetails=1`);
      searchResults = await response.json();
      showAdvancedSearch = true;
    } catch (err) {
      console.error('Location search failed:', err);
    } finally {
      searchingLocation = false;
    }
  }

  function selectLocation(result) {
    const address = result.address;
    const unit = address.house_number || '';
    const street = address.road || '';
    const suburb = address.suburb || address.city || '';
    const postcode = address.postcode || '';
    locationName = `${unit} ${street}, ${suburb.toUpperCase()} ${postcode}`.trim();
    locationCoords = `${result.lat}, ${result.lon}`;
    showAdvancedSearch = false;
    searchResults = [];
  }

  function selectAutocomplete(name) { textContent = name; showAutocomplete = false; }
  function addLinkedEntity(id) { if (!linkedTo.includes(id)) linkedTo = [...linkedTo, id]; }
  function removeLinkedEntity(id) { linkedTo = linkedTo.filter(lid => lid !== id); }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded text-sm z-[9999] shadow-xl transition-all transform translate-y-0 backdrop-blur-sm ${type === 'error' ? 'bg-red-500/80 text-white border border-red-400' : 'bg-cyan-500/80 text-gray-900 border border-cyan-400'}`;
    notification.style.transform = 'translateY(100px)';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { notification.style.transform = 'translateY(100px)'; setTimeout(() => notification.remove(), 300); }, 2700);
  }

  function saveEntity() {
    let content = '', metadata = {};
    if (type === 'text') content = textContent;
    else if (type === 'url') content = urlContent;
    else if (type === 'email') content = emailContent;
    else if (type === 'phone') content = phoneContent;
    else if (type === 'image') content = imageData;
    else if (type === 'location') {
        content = locationName;
        if (locationCoords) {
            const [lat, lng] = locationCoords.split(',').map(c => parseFloat(c.trim()));
            if (!isNaN(lat) && !isNaN(lng)) { metadata.lat = lat; metadata.lng = lng; }
        }
    }
    else if (type === 'vehicle') { content = vehicleInfo; metadata.plate = vehiclePlate; }
    else if (type === 'object') { content = objectInfo; metadata.category = objectCategory; }
    if (!content) return alert('Please enter content for the entity.');

    let entityIdToLink = editingEntity ? editingEntity.id : $entityIdCounter + 1;

    // Handle event linking
    events.update(currentEvents => {
        let updatedEvents = currentEvents.map(ev => ({
            ...ev,
            linkedEntities: ev.linkedEntities.filter(id => id !== entityIdToLink)
        }));
        if (linkedEventId) {
            updatedEvents = updatedEvents.map(ev => {
                if (ev.id === linkedEventId) {
                    return { ...ev, linkedEntities: [...ev.linkedEntities, entityIdToLink] };
                }
                return ev;
            });
        }
        return updatedEvents;
    });

    if (editingEntity) {
      entities.update(ents => ents.map(e => e.id === editingEntity.id ? { ...e, type, content, description, metadata } : e));
      links.update(lnks => {
        const filtered = lnks.filter(l => l.from !== editingEntity.id && l.to !== editingEntity.id);
        const newLinks = linkedTo.map(toId => ({ from: editingEntity.id, to: toId }));
        return [...filtered, ...newLinks];
      });
      showNotification('Entity updated successfully');
    } else {
      entityIdCounter.update(n => n + 1);
      const newId = $entityIdCounter;
      const entity = { id: newId, type, content, description, metadata, timestamp: new Date().toISOString() };
      entities.update(e => [entity, ...e]);
      linkedTo.forEach(toId => { links.update(l => [...l, { from: newId, to: toId }]); });
      showNotification(`${typeLabels[type]} added successfully`);
    }

    if (isModal) onClose(); else clearForm();
  }

  function clearForm() {
    if (editingEntity) return;
    textContent = ''; urlContent = ''; emailContent = ''; phoneContent = '';
    locationName = ''; locationCoords = ''; locationSearch = '';
    vehicleInfo = ''; vehiclePlate = ''; objectInfo = ''; objectCategory = '';
    description = ''; linkedTo = []; imageData = null; linkedEventId = null;
  }
</script>

<div class="{isModal ? '' : 'p-4 bg-gray-900/95 border-b border-cyan-600/30'} flex-shrink-0 max-h-[80vh] overflow-y-auto">
  <h3 class="text-sm font-medium text-cyan-300 mb-3">> {editingEntity ? 'Edit' : 'Add'} Entity</h3>
  <div class="space-y-3">
    <div>
        <label for="entityType" class="block text-xs font-medium text-cyan-500/70 mb-1">Type</label>
        <select id="entityType" bind:value={type} class="input" disabled={editingEntity !== null}>
            <option value="text">Person/Organisation</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="url">URL/Source</option>
            <option value="image">Image/Document</option>
            <option value="location">Location</option>
            <option value="vehicle">Vehicle</option>
            <option value="object">Object/Item</option>
        </select>
    </div>

    {#if type === 'text'}
        <div class="relative">
            <label for="entityText" class="block text-xs font-medium text-cyan-500/70 mb-1">Name</label>
            <input id="entityText" type="text" bind:value={textContent} placeholder="Enter name..." class="input" />
            {#if showAutocomplete}
                <div class="absolute top-full mt-1 w-full bg-gray-800/95 backdrop-blur-sm border border-cyan-400 shadow-lg shadow-cyan-500/30 rounded z-10 max-h-32 overflow-y-auto">
                    {#each filteredNames as name}
                    <button class="w-full text-left px-3 py-2 hover:bg-cyan-600/20 text-gray-300 hover:text-cyan-300 text-sm transition-colors" on:click={() => selectAutocomplete(name)}>{name}</button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    {#if type === 'email'}
      <div>
        <label for="entityEmail" class="block text-xs font-medium text-gray-500 mb-1">Email</label>
        <input id="entityEmail" type="email" bind:value={emailContent} placeholder="user@example.com" class="input"/>
      </div>
    {/if}

    {#if type === 'phone'}
      <div>
        <label for="entityPhone" class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
        <input id="entityPhone" type="tel" bind:value={phoneContent} placeholder="+61 400 000 000" class="input"/>
      </div>
    {/if}

    {#if type === 'url'}
      <div>
        <label for="entityUrl" class="block text-xs font-medium text-gray-500 mb-1">URL</label>
        <input id="entityUrl" type="url" bind:value={urlContent} placeholder="https://..." class="input"/>
      </div>
    {/if}

    {#if type === 'image'}
      <div>
        <label for="imageInput" class="block text-xs font-medium text-gray-500 mb-1">Image</label>
        <button type="button" class="w-full border-2 border-dashed border-cyan-600/30 rounded p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-600/10 transition-all" on:drop={handleImageDrop} on:dragover|preventDefault on:click={() => document.getElementById('imageInput').click()} on:keydown={(e) => e.key === 'Enter' && document.getElementById('imageInput').click()}>
          {#if imageData}
            <img src={imageData} alt="Preview" class="max-h-32 mx-auto" />
          {:else}
            <p class="text-cyan-500/70 text-sm">Drop image or click to select</p>
            <p class="text-cyan-600/50 text-xs mt-1">Paste: Ctrl+V</p>
          {/if}
        </button>
        <input type="file" id="imageInput" accept="image/*" on:change={handleImageSelect} class="hidden"/>
      </div>
    {/if}

    {#if type === 'location'}
        <div>
            <label for="locationSearch" class="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div class="flex gap-2">
                <input id="locationSearch" type="text" bind:value={locationSearch} placeholder="Search for a place..." class="input flex-1" on:keydown={(e) => e.key === 'Enter' && searchLocation()} />
                <button class="btn btn-small" on:click={searchLocation} disabled={searchingLocation}>{searchingLocation ? 'Searching...' : 'Search'}</button>
            </div>
        </div>
        {#if showAdvancedSearch && searchResults.length > 0}
            <div class="bg-gray-800/80 backdrop-blur-sm border border-cyan-400 rounded p-2 max-h-40 overflow-y-auto">
                {#each searchResults as result}
                    <button class="w-full text-left p-2 hover:bg-cyan-600/20 text-sm text-gray-300 hover:text-cyan-300 border-b border-cyan-600/30 last:border-0 transition-colors" on:click={() => selectLocation(result)}>
                        <div class="font-medium">{result.display_name.split(',')[0]}</div>
                        <div class="text-xs text-gray-500 truncate">{result.display_name}</div>
                    </button>
                {/each}
            </div>
        {/if}
        <div>
            <label for="locationName" class="block text-xs font-medium text-gray-500 mb-1">Location Name</label>
            <input id="locationName" type="text" bind:value={locationName} placeholder="E.g., 123 Main St, SYDNEY 2000" class="input" />
        </div>
        <div>
            <label for="locationCoords" class="block text-xs font-medium text-gray-500 mb-1">Coordinates (Lat, Lng)</label>
            <input id="locationCoords" type="text" bind:value={locationCoords} placeholder="-33.8688, 151.2093" class="input" />
        </div>
    {/if}

    {#if type === 'vehicle'}
      <div>
        <label for="vehicleInfo" class="block text-xs font-medium text-gray-500 mb-1">Vehicle Description</label>
        <input id="vehicleInfo" type="text" bind:value={vehicleInfo} placeholder="Make, model, color..." class="input"/>
      </div>
      <div>
        <label for="vehiclePlate" class="block text-xs font-medium text-gray-500 mb-1">License Plate</label>
        <input id="vehiclePlate" type="text" bind:value={vehiclePlate} placeholder="ABC-123" class="input"/>
      </div>
    {/if}

    {#if type === 'object'}
      <div>
        <label for="objectInfo" class="block text-xs font-medium text-gray-500 mb-1">Object Description</label>
        <input id="objectInfo" type="text" bind:value={objectInfo} placeholder="Description of item..." class="input"/>
      </div>
      <div>
        <label for="objectCategory" class="block text-xs font-medium text-gray-500 mb-1">Category</label>
        <select id="objectCategory" bind:value={objectCategory} class="input">
          <option value="">Select category...</option>
          <option value="weapon">Weapon</option>
          <option value="electronics">Electronics</option>
          <option value="documents">Documents</option>
          <option value="jewelry">Jewelry</option>
          <option value="drugs">Drugs/Substances</option>
          <option value="money">Money/Currency</option>
          <option value="clothing">Clothing</option>
          <option value="other">Other</option>
        </select>
      </div>
    {/if}
    
    <div>
        <label for="entityDescription" class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea id="entityDescription" bind:value={description} rows="3" placeholder="Add relevant notes..." class="input"></textarea>
    </div>

    <div>
        <label for="eventLink" class="block text-xs font-medium text-gray-500 mb-1">Link to Timeline Event</label>
        <select id="eventLink" bind:value={linkedEventId} class="input">
            <option value={null}>None</option>
            {#each $events as event}
                <option value={event.id}>{event.title}</option>
            {/each}
        </select>
    </div>

    <div>
        <label for="linkedSelect" class="block text-xs font-medium text-gray-500 mb-1">Link to Other Entity</label>
        <select id="linkedSelect" class="input mb-2" on:change={(e) => { addLinkedEntity(parseInt(e.target.value)); e.target.value = ''; }}>
            <option value="">Select entity...</option>
            {#each $entities.filter(e => !linkedTo.includes(e.id) && (!editingEntity || e.id !== editingEntity.id)) as entity}
                <option value={entity.id}>{entity.content.substring(0, 30)}... [#{entity.id}]</option>
            {/each}
        </select>
        {#if linkedTo.length > 0}
            <div class="flex flex-wrap gap-2">
                {#each linkedTo as id}
                    {@const entity = $entities.find(e => e.id === id)}
                    {#if entity}
                    <span class="bg-cyan-500/30 text-cyan-300 px-2 py-1 rounded text-xs flex items-center gap-1 backdrop-blur-sm">
                        {entity.content.substring(0, 20)}...
                        <button on:click={() => removeLinkedEntity(id)} class="hover:text-red-300 transition-colors">×</button>
                    </span>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>

    <div class="flex gap-2 pt-3 border-t border-gray-700">
        <button class="btn btn-primary flex-1 shadow" on:click={saveEntity}>{editingEntity ? 'Update' : '+ Add'} Entity</button>
        {#if isModal}
            <button class="btn flex-1" on:click={onClose}>Cancel</button>
        {/if}
    </div>
  </div>
</div>
