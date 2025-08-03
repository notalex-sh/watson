<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { entities, events, entityIdCounter, links } from '$lib/stores';
    import { formatDate } from '$lib/utils';

    export let editingEntity = null;
    const dispatch = createEventDispatcher();

    let step = 1;
    let typeInput = '';
    let selectedType = null;
    let suggestions = [];
    let suggestionIndex = -1;
    
    let mainField = '';
    let description = '';
    let eventDateTimeStr = formatDate(new Date()).replace(' hours', '');
    let vehiclePlate = '';
    let locationCoords = '';
    let locationSearch = '';
    let searchingLocation = false;
    let searchResults = [];

    let linkedEntities = [];
    let existingLinkedIds = [];
    let showAddLinked = false;
    let linkedEntityType = 'phone';
    let linkedEntityContent = '';
    let linkedLocationName = '';
    let linkedLocationCoords = '';
    let linkedEventId = null; 
    let typeInputRef, mainFieldRef, descriptionRef;

    const allTypes = [
        { key: 'text', label: 'Person/Org' }, { key: 'event', label: 'Event' }, { key: 'incident', label: 'Incident' },
        { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'vehicle', label: 'Vehicle' },
        { key: 'object', label: 'Object' }, { key: 'location', label: 'Location' }, { key: 'url', label: 'URL/Source' }
    ];

    onMount(() => {
        if (editingEntity) {
            selectedType = allTypes.find(t => t.key === (editingEntity.itemType === 'event' ? editingEntity.type : editingEntity.type));
            mainField = editingEntity.content;
            description = editingEntity.description || '';
            if (editingEntity.itemType === 'event') {
                eventDateTimeStr = formatDate(editingEntity.date).replace(' hours', '');
            }
            if (editingEntity.type === 'vehicle') {
                vehiclePlate = editingEntity.metadata?.plate || '';
            }
            if (editingEntity.type === 'location') {
                locationCoords = editingEntity.metadata?.lat ? `${editingEntity.metadata.lat}, ${editingEntity.metadata.lng}` : '';
            }
            step = 2;
        }
    });

    $: {
        if (typeInput) {
            suggestions = allTypes.filter(t => t.label.toLowerCase().startsWith(typeInput.toLowerCase()));
            suggestionIndex = suggestions.length > 0 ? 0 : -1;
        } else {
            suggestions = [];
            suggestionIndex = -1;
        }
    }

    function handleTypeInput(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestionIndex !== -1) selectSuggestion(suggestions[suggestionIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            suggestionIndex = (suggestionIndex + 1) % suggestions.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            suggestionIndex = (suggestionIndex - 1 + suggestions.length) % suggestions.length;
        }
    }

    function selectSuggestion(type) {
        selectedType = type;
        step = 2;
        setTimeout(() => mainFieldRef?.focus(), 50);
    }
    
    function handleMainField(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            descriptionRef?.focus();
        }
    }

    function handleEventTimeFocus(e) {
        if (e.target.value === formatDate(new Date()).replace(' hours', '')) {
            eventDateTimeStr = '';
        }
    }

    function handleEventTimeInput(e) {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let formatted = '';
        if (val.length > 0) formatted += val.substring(0, 2);
        if (val.length > 2) formatted += '/' + val.substring(2, 5);
        if (val.length > 5) formatted += '/' + val.substring(5, 9);
        if (val.length > 9) formatted += ' ' + val.substring(9, 11);
        if (val.length > 11) formatted += ':' + val.substring(11, 13);
        eventDateTimeStr = formatted;
    }
    
    async function searchLocation(isSubSearch = false) {
        if (!locationSearch) return;
        searchingLocation = true;
        searchResults = [];
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5&addressdetails=1`);
            searchResults = await response.json();
        } catch (err) {
            console.error('Location search failed:', err);
        } finally {
            searchingLocation = false;
        }
    }

    function selectLocation(result, isSubSearch = false) {
        const ad = result.address;
        const name = `${ad.house_number || ''} ${ad.road || ''}, ${ad.suburb || ad.city || ''} ${ad.postcode || ''}`.trim().replace(/^,/, '').trim();
        const coords = `${parseFloat(result.lat)}, ${parseFloat(result.lon)}`;

        if (isSubSearch) {
            linkedLocationName = name;
            linkedLocationCoords = coords;
            step = 2;
        } else {
            mainField = name;
            locationCoords = coords;
        }
        searchResults = [];
        locationSearch = '';
    }

    function addLinkedEntity() {
        if (linkedEntityType === 'location') {
            if (!linkedLocationName) return;
            const [lat, lng] = linkedLocationCoords.split(',').map(c => parseFloat(c.trim()));
            const metadata = (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : {};
            linkedEntities = [...linkedEntities, { type: 'location', content: linkedLocationName, metadata }];
            linkedLocationName = '';
            linkedLocationCoords = '';
        } else {
            if (!linkedEntityContent) return;
            linkedEntities = [...linkedEntities, { type: linkedEntityType, content: linkedEntityContent }];
            linkedEntityContent = '';
        }
        linkedEntityType = 'phone';
    }

    function addExistingLinkedId(id) {
        if (id && !existingLinkedIds.includes(id)) {
            existingLinkedIds = [...existingLinkedIds, id];
        }
    }
    
    function parseDateString(str) {
        const parts = str.split(/[\s/:]+/);
        const day = parseInt(parts[0], 10);
        const month = "JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(parts[1]?.toUpperCase()) / 3;
        const year = parseInt(parts[2], 10);
        const hours = parseInt(parts[3], 10) || 0;
        const minutes = parseInt(parts[4], 10) || 0;
        return new Date(year, month, day, hours, minutes);
    }

    function save() {
        if (!mainField) {
            alert('Please fill in the main field.');
            return;
        }

        const isEvent = selectedType.key === 'event' || selectedType.key === 'incident';
        const newlyCreatedLinkedIds = linkedEntities.map(le => {
            entityIdCounter.update(n => n + 1);
            const newId = $entityIdCounter;
            entities.update(e => [{
                id: newId, type: le.type, content: le.content,
                description: `${le.type.charAt(0).toUpperCase() + le.type.slice(1)} for ${mainField}`,
                metadata: le.metadata || {}, timestamp: new Date().toISOString()
            }, ...e]);
            return newId;
        });
        const allLinkedIds = [...newlyCreatedLinkedIds, ...existingLinkedIds];
        
        if (editingEntity) {
            if (editingEntity.itemType === 'event') {
                events.update(evs => evs.map(ev => ev.id === editingEntity.id ? {
                    ...ev,
                    title: mainField,
                    date: parseDateString(eventDateTimeStr).toISOString(),
                    description,
                } : ev));
            } else {
                entities.update(ents => ents.map(e => e.id === editingEntity.id ? {
                    ...e,
                    content: mainField,
                    description,
                    metadata: {
                        ...e.metadata,
                        plate: vehiclePlate,
                        lat: selectedType.key === 'location' ? parseFloat(locationCoords.split(',')[0]) : e.metadata.lat,
                        lng: selectedType.key === 'location' ? parseFloat(locationCoords.split(',')[1]) : e.metadata.lng,
                    }
                } : e));
            }
        } else {
            let primaryId;
            if (isEvent) {
                const date = parseDateString(eventDateTimeStr);
                primaryId = Date.now();
                events.update(e => [{
                    id: primaryId, title: mainField, date: date.toISOString(),
                    description, linkedEntities: allLinkedIds, type: selectedType.key
                }, ...e]);
            } else {
                entityIdCounter.update(n => n + 1);
                primaryId = $entityIdCounter;
                
                let metadata = {};
                if (selectedType.key === 'vehicle') metadata.plate = vehiclePlate;
                else if (selectedType.key === 'location' && locationCoords) {
                    const [lat, lng] = locationCoords.split(',').map(c => parseFloat(c.trim()));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        metadata.lat = lat;
                        metadata.lng = lng;
                    }
                }

                entities.update(e => [{
                    id: primaryId, type: selectedType.key, content: mainField,
                    description, metadata, timestamp: new Date().toISOString()
                }, ...e]);

                if(linkedEventId) {
                    events.update(currentEvents => {
                        return currentEvents.map(ev => {
                            if (ev.id === linkedEventId) {
                                return { ...ev, linkedEntities: [...ev.linkedEntities, primaryId] };
                            }
                            return ev;
                        });
                    });
                }
                
                allLinkedIds.forEach(linkedId => {
                    links.update(l => [...l, { from: primaryId, to: linkedId }]);
                });
            }
        }
        
        dispatch('close');
    }
</script>

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" on:click={() => dispatch('close')}>
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-xl w-full shadow-2xl shadow-cyan-500/30 p-6" on:click|stopPropagation>
        {#if step === 1}
            <div>
                <label for="typeInput" class="block text-sm text-cyan-300 mb-2">> CLASSIFY NEW INTEL</label>
                <div class="relative">
                   <input id="typeInput" type="text" bind:this={typeInputRef} bind:value={typeInput} on:keydown={handleTypeInput} placeholder="Begin entry classification..." class="input text-lg" autofocus/>
                    {#if suggestions.length > 0}
                        <div class="absolute top-full w-full mt-1 bg-gray-800 border border-cyan-500/50 rounded-lg shadow-lg z-10">
                           {#each suggestions as suggestion, i}
                                <button class="w-full text-left px-4 py-2 text-sm transition-colors {i === suggestionIndex ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300 hover:bg-cyan-600/20'}" on:click={() => selectSuggestion(suggestion)}>{suggestion.label}</button>
                            {/each}
                        </div>
                    {/if}
                </div>
                 <div class="text-xs text-gray-500 mt-2 p-2 bg-gray-900/50 rounded border border-gray-700">
                    <p class="font-bold text-gray-400">Entry Types:</p>
                    <ul class="list-disc pl-4 mt-1">
                        <li><span class="text-cyan-400">Standard Entries:</span> Person, Phone, Email, Vehicle, etc.</li>
                        <li><span class="text-orange-400">Location:</span> A standard entry that will also be plotted on the map.</li>
                        <li><span class="text-pink-400">Event/Incident:</span> Creates a timestamped entry on the Timeline.</li>
                    </ul>
                </div>
            </div>
        {:else if step === 2}
           <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2">{editingEntity ? 'Edit' : 'New'} <span class="text-cyan-400">{selectedType.label}</span></h3>

                {#if selectedType.key === 'location'}
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
                       <div class="flex gap-2">
                            <input type="text" bind:value={locationSearch} placeholder="Search for a place..." class="input flex-1" on:keydown={(e) => e.key === 'Enter' && searchLocation(false)} />
                            <button class="btn btn-small" on:click={() => searchLocation(false)} disabled={searchingLocation}>{searchingLocation ? '...' : 'Search'}</button>
                        </div>
                        {#if searchResults.length > 0}
                            <div class="bg-gray-800/80 mt-2 border border-cyan-400 rounded p-2 max-h-40 overflow-y-auto">
                                {#each searchResults as result}
                                    <button class="w-full text-left p-2 hover:bg-cyan-600/20 text-sm" on:click={() => selectLocation(result, false)}>
                                        <div class="font-medium">{result.display_name.split(',')[0]}</div>
                                        <div class="text-xs text-gray-500 truncate">{result.display_name}</div>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}

                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">{selectedType.label} Name/Content</label>
                    <input type="text" bind:this={mainFieldRef} bind:value={mainField} on:keydown={handleMainField} class="input"/>
                </div>

                {#if selectedType.key === 'location'}
                     <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Coordinates (Lat, Lng)</label>
                        <input type="text" bind:value={locationCoords} placeholder="Auto-filled from search or manual entry..." class="input" />
                    </div>
                {/if}

                {#if selectedType.key === 'event' || selectedType.key === 'incident'}
                    <div>
                         <label class="block text-xs font-medium text-gray-500 mb-1">Date & Time (DD/MMM/YYYY HH:mm)</label>
                         <input type="text" bind:value={eventDateTimeStr} on:focus={handleEventTimeFocus} on:input={handleEventTimeInput} class="input"/>
                    </div>
                {/if}

                {#if selectedType.key === 'vehicle'}
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">License Plate</label>
                       <input type="text" bind:value={vehiclePlate} class="input"/>
                    </div>
                {/if}

                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Description / Notes</label>
                    <textarea bind:this={descriptionRef} bind:value={description} rows="4" class="input"></textarea>
                </div>

                <div class="space-y-3 pt-3 border-t border-gray-700">
                    <h4 class="text-sm font-medium text-cyan-400">Linked Items</h4>
                    <div class="flex flex-wrap gap-2">
                        {#each [...linkedEntities, ...$entities.filter(e => existingLinkedIds.includes(e.id))] as linked}
                            <span class="bg-purple-500/30 text-purple-300 px-2 py-1 rounded text-xs">{linked.content}</span>
                        {/each}
                    </div>
                    
                    <select class="input input-sm" on:change={e => addExistingLinkedId(parseInt(e.target.value))}>
                        <option value="">+ Link Existing Entity...</option>
                        {#each $entities as entity} <option value={entity.id}>{entity.content}</option> {/each}
                    </select>

                    <select class="input input-sm" bind:value={linkedEventId}>
                        <option value={null}>+ Link to Event/Incident...</option>
                        {#each $events as event} <option value={event.id}>{event.title}</option> {/each}
                    </select>

                    {#if showAddLinked}
                        <div class="grid grid-cols-3 gap-2 p-2 border border-dashed border-gray-600 rounded">
                            <select bind:value={linkedEntityType} class="input input-sm col-span-3 sm:col-span-1">
                                <option value="phone">Phone</option> <option value="email">Email</option> <option value="vehicle">Vehicle</option> <option value="object">Object</option> <option value="location">Location</option>
                            </select>
                            
                            {#if linkedEntityType === 'location'}
                                <div class="col-span-3 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input type="text" bind:value={linkedLocationName} placeholder="Location Name..." class="input input-sm col-span-2"/>
                                    <input type="text" bind:value={linkedLocationCoords} placeholder="Lat, Lng (optional)" class="input input-sm flex-1"/>
                                    <button class="btn btn-small" on:click={() => step = 3}>Search</button>
                                </div>
                            {:else}
                                <input type="text" bind:value={linkedEntityContent} placeholder="Content..." class="input input-sm col-span-3 sm:col-span-2"/>
                            {/if}
                            <button on:click={addLinkedEntity} class="btn btn-small col-span-3 sm:col-span-3">Add</button>
                        </div>
                    {/if}
                     <button on:click={() => showAddLinked = !showAddLinked} class="text-cyan-400 text-xs hover:underline">
                        {showAddLinked ? 'Cancel' : '+ Add & Link New Entity'}
                    </button>
                </div>

                <div class="flex gap-2 pt-4 border-t border-gray-800">
                    {#if !editingEntity}
                        <button class="btn flex-1" on:click={() => { step = 1; setTimeout(() => typeInputRef?.focus(), 50); }}>Back</button>
                    {/if}
                    <button class="btn btn-primary flex-1" on:click={save}>{editingEntity ? 'Update' : 'Save'}</button>
                </div>
            </div>
        {:else if step === 3}
             <div>
                <h4 class="text-sm font-medium text-cyan-400 mb-2">Link a New Location</h4>
                <div class="flex gap-2">
                    <input type="text" bind:value={locationSearch} placeholder="Search for a place..." class="input flex-1" on:keydown={(e) => e.key === 'Enter' && searchLocation(true)} />
                    <button class="btn btn-small" on:click={() => searchLocation(true)} disabled={searchingLocation}>{searchingLocation ? '...' : 'Search'}</button>
                </div>
                {#if searchResults.length > 0}
                    <div class="bg-gray-800/80 mt-2 border border-cyan-400 rounded p-2 max-h-40 overflow-y-auto">
                        {#each searchResults as result}
                           <button class="w-full text-left p-2 hover:bg-cyan-600/20 text-sm" on:click={() => selectLocation(result, true)}>
                                <div class="font-medium">{result.display_name.split(',')[0]}</div>
                                <div class="text-xs text-gray-500 truncate">{result.display_name}</div>
                            </button>
                        {/each}
                    </div>
                {/if}
                <button class="btn btn-small mt-4 w-full" on:click={() => step = 2}>Back to Main Form</button>
            </div>
        {/if}
    </div>
</div>