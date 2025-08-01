<script>
  import { entities, links, entityIdCounter, entityNames } from '$lib/stores';
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
  let linkedTo = editingEntity ? 
    $links.filter(l => l.from === editingEntity.id).map(l => l.to) : [];
  let imageData = editingEntity?.type === 'image' ? editingEntity.content : null;
  let showAutocomplete = false;
  let filteredNames = [];
  let searchingLocation = false;
  let showAdvancedSearch = false;
  let searchResults = [];
  
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
  
  $: if (type === 'text' && textContent && !editingEntity) {
    filteredNames = $entityNames.filter(name => 
      name.toLowerCase().includes(textContent.toLowerCase()) && name !== textContent
    );
    showAutocomplete = filteredNames.length > 0;
  } else {
    showAutocomplete = false;
  }
  
  function handleImageDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      readImageFile(file);
    }
  }
  
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
      readImageFile(file);
    }
  }
  
  function readImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imageData = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  async function searchLocation() {
    if (!locationSearch) return;
    searchingLocation = true;
    searchResults = [];
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5&addressdetails=1`);
      const results = await response.json();
      searchResults = results;
      showAdvancedSearch = true;
    } catch (err) {
      console.error('Location search failed:', err);
    } finally {
      searchingLocation = false;
    }
  }
  
  function selectLocation(result) {
    locationName = result.display_name;
    locationCoords = `${result.lat}, ${result.lon}`;
    showAdvancedSearch = false;
    searchResults = [];
  }
  
  function selectAutocomplete(name) {
    textContent = name;
    showAutocomplete = false;
  }
  
  function addLinkedEntity(id) {
    if (!linkedTo.includes(id)) {
      linkedTo = [...linkedTo, id];
    }
  }
  
  function removeLinkedEntity(id) {
    linkedTo = linkedTo.filter(lid => lid !== id);
  }
  
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded text-sm z-[9999] shadow-xl transition-all transform translate-y-0 backdrop-blur-sm ${
      type === 'error' ? 'bg-red-500/80 text-white border border-red-400' : 'bg-cyan-500/80 text-gray-900 border border-cyan-400'
    }`;
    notification.style.transform = 'translateY(100px)';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
      notification.style.transform = 'translateY(100px)';
      setTimeout(() => notification.remove(), 300);
    }, 2700);
  }
  
  function saveEntity() {
    let content = '';
    let metadata = {};
    
    if (type === 'text') {
      content = textContent;
      if (!content) return alert('Please enter entity name');
    } else if (type === 'url') {
      content = urlContent;
      if (!content) return alert('Please enter URL');
    } else if (type === 'email') {
      content = emailContent;
      if (!content) return alert('Please enter email');
    } else if (type === 'phone') {
      content = phoneContent;
      if (!content) return alert('Please enter phone number');
    } else if (type === 'image') {
      content = imageData;
      if (!content) return alert('Please select an image');
    } else if (type === 'location') {
      content = locationName;
      if (!content) return alert('Please enter location name');
      if (locationCoords) {
        const [lat, lng] = locationCoords.split(',').map(c => parseFloat(c.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          metadata.lat = lat;
          metadata.lng = lng;
        }
      }
    } else if (type === 'vehicle') {
      content = vehicleInfo;
      if (!content) return alert('Please enter vehicle information');
      metadata.plate = vehiclePlate;
    } else if (type === 'object') {
      content = objectInfo;
      if (!content) return alert('Please enter object description');
      metadata.category = objectCategory;
    }
    
    if (editingEntity) {
      entities.update(ents => ents.map(e => 
        e.id === editingEntity.id 
          ? { ...e, type, content, description, metadata }
          : e
      ));
      
      links.update(lnks => {

        const filtered = lnks.filter(l => l.from !== editingEntity.id);

        const newLinks = linkedTo.map(toId => ({ from: editingEntity.id, to: toId }));
        return [...filtered, ...newLinks];
      });
      
      showNotification('Entity updated successfully');
    } else {

      entityIdCounter.update(n => n + 1);
      const newId = $entityIdCounter;
      
      const entity = {
        id: newId,
        type,
        content,
        description,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      entities.update(e => [entity, ...e]);
      
      linkedTo.forEach(toId => {
        links.update(l => [...l, { from: newId, to: toId }]);
      });
      
      showNotification(`${typeLabels[type]} added successfully`);
    }
    
    if (isModal) {
      onClose();
    } else {
      clearForm();
    }
  }
  
  function clearForm() {
    if (!editingEntity) {
      textContent = '';
      urlContent = '';
      emailContent = '';
      phoneContent = '';
      locationName = '';
      locationCoords = '';
      locationSearch = '';
      vehicleInfo = '';
      vehiclePlate = '';
      objectInfo = '';
      objectCategory = '';
      description = '';
      linkedTo = [];
      imageData = null;
    }
  }
  
  onMount(() => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
    
    function handlePaste(e) {
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          readImageFile(file);
          type = 'image';
        }
      }
    }
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });
</script>

<div class="{isModal ? '' : 'p-4 bg-gray-900/95 border-b border-cyan-600/30'} flex-shrink-0 max-h-[60vh] overflow-y-auto">
  <h3 class="text-sm font-medium text-cyan-300 mb-3">
    &gt; {editingEntity ? 'Edit' : 'Add'} Entity
  </h3>
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
        <input
          id="entityText"
          type="text"
          bind:value={textContent}
          placeholder="Enter name..."
          class="input"
        />
        {#if showAutocomplete}
          <div class="absolute top-full mt-1 w-full bg-gray-800/95 backdrop-blur-sm border border-cyan-400 shadow-lg shadow-cyan-500/30 rounded z-10 max-h-32 overflow-y-auto">
            {#each filteredNames as name}
              <button
                class="w-full text-left px-3 py-2 hover:bg-cyan-600/20 text-gray-300 hover:text-cyan-300 text-sm transition-colors"
                on:click={() => selectAutocomplete(name)}
              >
                {name}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    
    {#if type === 'email'}
      <div>
        <label for="entityEmail" class="block text-xs font-medium text-gray-500 mb-1">Email</label>
        <input
          id="entityEmail"
          type="email"
          bind:value={emailContent}
          placeholder="user@example.com"
          class="input"
        />
      </div>
    {/if}
    
    {#if type === 'phone'}
      <div>
        <label for="entityPhone" class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
        <input
          id="entityPhone"
          type="tel"
          bind:value={phoneContent}
          placeholder="+61 400 000 000"
          class="input"
        />
      </div>
    {/if}
    
    {#if type === 'url'}
      <div>
        <label for="entityUrl" class="block text-xs font-medium text-gray-500 mb-1">URL</label>
        <input
          id="entityUrl"
          type="url"
          bind:value={urlContent}
          placeholder="https://..."
          class="input"
        />
      </div>
    {/if}
    
    {#if type === 'image'}
      <div>
        <label for="imageInput" class="block text-xs font-medium text-gray-500 mb-1">Image</label>
        <button
          type="button"
          class="w-full border-2 border-dashed border-cyan-600/30 rounded p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-600/10 transition-all"
          on:drop={handleImageDrop}
          on:dragover|preventDefault
          on:click={() => document.getElementById('imageInput').click()}
          on:keydown={(e) => e.key === 'Enter' && document.getElementById('imageInput').click()}
        >
          {#if imageData}
            <img src={imageData} alt="Preview" class="max-h-32 mx-auto" />
          {:else}
            <p class="text-cyan-500/70 text-sm">Drop image or click to select</p>
            <p class="text-cyan-600/50 text-xs mt-1">Paste: Ctrl+V</p>
          {/if}
        </button>
        <input
          type="file"
          id="imageInput"
          accept="image/*"
          on:change={handleImageSelect}
          class="hidden"
        />
      </div>
    {/if}
    
    {#if type === 'location'}
      <div>
        <label for="locationSearch" class="block text-xs font-medium text-gray-500 mb-1">Search</label>
        <div class="flex gap-2">
          <input
            id="locationSearch"
            type="text"
            bind:value={locationSearch}
            placeholder="Search location..."
            class="input flex-1"
            on:keydown={(e) => e.key === 'Enter' && searchLocation()}
          />
          <button 
            class="btn btn-small"
            on:click={searchLocation}
            disabled={searchingLocation}
          >
            {searchingLocation ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      {#if showAdvancedSearch && searchResults.length > 0}
        <div class="bg-gray-800/80 backdrop-blur-sm border border-cyan-400 rounded p-2 max-h-40 overflow-y-auto">
          {#each searchResults as result}
            <button
              class="w-full text-left p-2 hover:bg-cyan-600/20 text-sm text-gray-300 hover:text-cyan-300 border-b border-cyan-600/30 last:border-0 transition-colors"
              on:click={() => selectLocation(result)}
            >
              <div class="font-medium">{result.display_name.split(',')[0]}</div>
              <div class="text-xs text-gray-500 truncate">{result.display_name}</div>
            </button>
          {/each}
        </div>
      {/if}
      
      <div>
        <label for="locationName" class="block text-xs font-medium text-gray-500 mb-1">Location</label>
        <input
          id="locationName"
          type="text"
          bind:value={locationName}
          placeholder="Location name..."
          class="input"
        />
      </div>
      <div>
        <label for="locationCoords" class="block text-xs font-medium text-gray-500 mb-1">Coordinates</label>
        <input
          id="locationCoords"
          type="text"
          bind:value={locationCoords}
          placeholder="-33.8688, 151.2093"
          class="input"
        />
      </div>
    {/if}
    
    {#if type === 'vehicle'}
      <div>
        <label for="vehicleInfo" class="block text-xs font-medium text-gray-500 mb-1">Vehicle Description</label>
        <input
          id="vehicleInfo"
          type="text"
          bind:value={vehicleInfo}
          placeholder="Make, model, color..."
          class="input"
        />
      </div>
      <div>
        <label for="vehiclePlate" class="block text-xs font-medium text-gray-500 mb-1">License Plate</label>
        <input
          id="vehiclePlate"
          type="text"
          bind:value={vehiclePlate}
          placeholder="ABC-123"
          class="input"
        />
      </div>
    {/if}
    
    {#if type === 'object'}
      <div>
        <label for="objectInfo" class="block text-xs font-medium text-gray-500 mb-1">Object Description</label>
        <input
          id="objectInfo"
          type="text"
          bind:value={objectInfo}
          placeholder="Description of item..."
          class="input"
        />
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
      <label for="linkedSelect" class="block text-xs font-medium text-gray-500 mb-1">Link To</label>
      <select id="linkedSelect" class="input mb-2" on:change={(e) => { addLinkedEntity(parseInt(e.target.value)); e.target.value = ''; }}>
        <option value="">Select entity...</option>
        {#each $entities.filter(e => !linkedTo.includes(e.id) && (!editingEntity || e.id !== editingEntity.id)) as entity}
          <option value={entity.id}>
            {entity.content.substring(0, 30)}{entity.content.length > 30 ? '...' : ''} [#{entity.id}]
          </option>
        {/each}
      </select>
      
      {#if linkedTo.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each linkedTo as id}
            {@const entity = $entities.find(e => e.id === id)}
            <span class="bg-cyan-500/30 text-cyan-300 px-2 py-1 rounded text-xs flex items-center gap-1 backdrop-blur-sm">
              {entity?.content.substring(0, 20)}...
              <button on:click={() => removeLinkedEntity(id)} class="hover:text-red-300 transition-colors">×</button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
    
    <div>
      <label for="entityDescription" class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
      <textarea
        id="entityDescription"
        bind:value={description}
        rows="3"
        placeholder="Add notes..."
        class="input"
      />
    </div>
    
    <div class="flex gap-2">
      <button class="btn btn-primary flex-1 shadow" on:click={saveEntity}>
        {editingEntity ? 'Update' : '+ Add'} Entity
      </button>
      {#if isModal}
        <button class="btn flex-1" on:click={onClose}>
          Cancel
        </button>
      {/if}
    </div>
  </div>
</div>