<!--
  Quick add modal for creating and editing entities, events, and incidents.
-->
<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { entities, events, entityIdCounter, links, ENTITY_TYPES, nodePositions, images, imageIdCounter } from '$lib/stores';
    import { formatDate } from '$lib/utils';
    import { ENTITY_ICONS, getIconSvg } from '$lib/icons';

    export let editingEntity = null;
    export let pendingPosition = null;
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
    let priority = 'none';
    let linkedLocationName = '';
    let linkedLocationCoords = '';
    let linkedEventIds = [];
    let typeInputRef, mainFieldRef, descriptionRef, imageInputRef;
    let entityImage = null;
    let entityImageId = null;

    function handleImagePaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) readImageFile(file);
                return;
            }
        }
    }

    function handleImageSelect(e) {
        const file = e.target.files?.[0];
        if (file) readImageFile(file);
    }

    function readImageFile(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            entityImage = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    const typeCategories = [
        {
            name: 'People & Organizations',
            types: [
                { key: 'person', label: 'Person' },
                { key: 'organization', label: 'Organization' },
                { key: 'alias', label: 'Alias/Nickname' }
            ]
        },
        {
            name: 'Contact & Social',
            types: [
                { key: 'phone', label: 'Phone Number' },
                { key: 'email', label: 'Email Address' },
                { key: 'social', label: 'Social Media' },
                { key: 'username', label: 'Username/Handle' }
            ]
        },
        {
            name: 'Locations',
            types: [
                { key: 'location', label: 'Address/Location' },
                { key: 'building', label: 'Building/Property' },
                { key: 'country', label: 'Country/Region' }
            ]
        },
        {
            name: 'Vehicles & Transport',
            types: [
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'aircraft', label: 'Aircraft' },
                { key: 'vessel', label: 'Vessel/Boat' }
            ]
        },
        {
            name: 'Financial',
            types: [
                { key: 'bank', label: 'Bank Account' },
                { key: 'crypto', label: 'Crypto Wallet' },
                { key: 'money', label: 'Currency/Funds' }
            ]
        },
        {
            name: 'Documents & IDs',
            types: [
                { key: 'document', label: 'Document' },
                { key: 'id', label: 'ID/Passport' },
                { key: 'license', label: 'License/Permit' }
            ]
        },
        {
            name: 'Digital',
            types: [
                { key: 'website', label: 'Website/URL' },
                { key: 'ip', label: 'IP Address' },
                { key: 'domain', label: 'Domain' }
            ]
        },
        {
            name: 'Physical Objects',
            types: [
                { key: 'weapon', label: 'Weapon' },
                { key: 'drug', label: 'Drug/Substance' },
                { key: 'evidence', label: 'Evidence' },
                { key: 'object', label: 'Other Object' }
            ]
        },
        {
            name: 'Events & Intel',
            types: [
                { key: 'event', label: 'Event' },
                { key: 'incident', label: 'Incident' },
                { key: 'intel', label: 'Intelligence' }
            ]
        },
        {
            name: 'Other',
            types: [
                { key: 'other', label: 'Other' }
            ]
        }
    ];

    const allTypes = typeCategories.flatMap(cat => cat.types);

    onMount(() => {
        if (editingEntity && editingEntity.type) {
            let typeKey = editingEntity.type === 'text' ? 'person' : editingEntity.type;
            if (typeKey === 'url') typeKey = 'website';

            selectedType = allTypes.find(t => t.key === typeKey) || allTypes.find(t => t.key === 'object');
            mainField = editingEntity.content || '';
            description = editingEntity.description || '';
            if (editingEntity.metadata?.imageId) {
                entityImageId = editingEntity.metadata.imageId;
                entityImage = $images[entityImageId] || null;
            }
            if (editingEntity.itemType === 'event') {
                eventDateTimeStr = formatDate(editingEntity.date).replace(' hours', '');
                existingLinkedIds = editingEntity.linkedEntities || [];
            }
            if (editingEntity.type === 'vehicle' || editingEntity.type === 'aircraft' || editingEntity.type === 'vessel') {
                vehiclePlate = editingEntity.metadata?.plate || '';
            }
            priority = editingEntity.priority || 'none';
            if (['location', 'building', 'country'].includes(editingEntity.type)) {
                locationCoords = editingEntity.metadata?.lat ? `${editingEntity.metadata.lat}, ${editingEntity.metadata.lng}` : '';
            }
            if (editingEntity.itemType !== 'event' && editingEntity.id) {
                existingLinkedIds = $links
                    .filter(l => l.from === editingEntity.id || l.to === editingEntity.id)
                    .map(l => (l.from === editingEntity.id ? l.to : l.from));
            }
            if (editingEntity.id) {
                linkedEventIds = $events.filter(ev => ev.linkedEntities?.includes(editingEntity.id)).map(ev => ev.id);
            }
            step = 2;
        }
    });

    $: {
        if (typeInput) {
            suggestions = allTypes.filter(t =>
                t.label.toLowerCase().includes(typeInput.toLowerCase()) ||
                t.key.toLowerCase().includes(typeInput.toLowerCase())
            );
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
            const params = new URLSearchParams({
                q: locationSearch,
                limit: '15'
            });

            const response = await fetch(`https://photon.komoot.io/api/?${params}`);
            const data = await response.json();

            let results = (data.features || []).map(f => {
                const props = f.properties || {};
                const coords = f.geometry?.coordinates || [0, 0];
                return {
                    lat: coords[1],
                    lon: coords[0],
                    display_name: [
                        props.housenumber,
                        props.street,
                        props.district,
                        props.city || props.town || props.village,
                        props.state,
                        props.country
                    ].filter(Boolean).join(', '),
                    address: {
                        house_number: props.housenumber,
                        road: props.street,
                        suburb: props.district,
                        neighbourhood: props.locality,
                        city: props.city,
                        town: props.town,
                        village: props.village,
                        state: props.state,
                        postcode: props.postcode,
                        country: props.country
                    }
                };
            });

            results = results.sort((a, b) => {
                const aHasNumber = a.address?.house_number ? 1 : 0;
                const bHasNumber = b.address?.house_number ? 1 : 0;
                return bHasNumber - aHasNumber;
            });

            searchResults = results;
        } catch (err) {
            console.error('Location search failed:', err);
        } finally {
            searchingLocation = false;
        }
    }

    function selectLocation(result, isSubSearch = false) {
        const ad = result.address;
        let nameParts = [];
        if (ad.house_number) nameParts.push(ad.house_number);
        if (ad.road) nameParts.push(ad.road);
        if (ad.suburb || ad.neighbourhood) nameParts.push(ad.suburb || ad.neighbourhood);
        if (ad.city || ad.town || ad.village) nameParts.push(ad.city || ad.town || ad.village);
        if (ad.postcode) nameParts.push(ad.postcode);

        let name = '';
        if (nameParts.length > 0) {
            if (ad.house_number && ad.road) {
                name = `${ad.house_number} ${ad.road}`;
                if (nameParts.length > 2) {
                    name += ', ' + nameParts.slice(2).join(', ');
                }
            } else {
                name = nameParts.join(', ');
            }
        } else {
            name = result.display_name.split(',')[0];
        }

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

    function removeLinkedEntity(id) {
        existingLinkedIds = existingLinkedIds.filter(i => i !== id);
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
                id: newId,
                type: le.type,
                content: le.content,
                description: `${le.type.charAt(0).toUpperCase() + le.type.slice(1)} for ${mainField}`,
                metadata: le.metadata || {},
                timestamp: new Date().toISOString()
            }, ...e]);
            return newId;
        });
        const allLinkedIds = [...newlyCreatedLinkedIds, ...existingLinkedIds];

        if (editingEntity) {
            const entityIdToUpdate = editingEntity.id;
            if (editingEntity.itemType === 'event') {
                events.update(evs => evs.map(ev => ev.id === editingEntity.id ? {
                    ...ev,
                    title: mainField,
                    date: parseDateString(eventDateTimeStr).toISOString(),
                    description,
                    priority,
                    linkedEntities: allLinkedIds
                } : ev));
            } else {
                entities.update(ents => ents.map(e => e.id === entityIdToUpdate ? {
                    ...e,
                    content: mainField,
                    description,
                    priority,
                    metadata: {
                        ...e.metadata,
                        plate: ['vehicle', 'aircraft', 'vessel'].includes(selectedType.key) ? vehiclePlate : e.metadata?.plate,
                        lat: ['location', 'building', 'country'].includes(selectedType.key) && locationCoords ? parseFloat(locationCoords.split(',')[0]) : e.metadata?.lat,
                        lng: ['location', 'building', 'country'].includes(selectedType.key) && locationCoords ? parseFloat(locationCoords.split(',')[1]) : e.metadata?.lng,
                    }
                } : e));
                links.update(l => {
                    const otherLinks = l.filter(link => link.from !== entityIdToUpdate && link.to !== entityIdToUpdate);
                    const newLinks = allLinkedIds.map(linkedId => ({ from: entityIdToUpdate, to: linkedId }));
                    return [...otherLinks, ...newLinks];
                });

                events.update(currentEvents => {
                    let updatedEvents = currentEvents.map(ev => ({
                        ...ev,
                        linkedEntities: ev.linkedEntities.filter(id => id !== entityIdToUpdate)
                    }));
                    linkedEventIds.forEach(eventId => {
                        updatedEvents = updatedEvents.map(ev => {
                            if (ev.id === eventId) {
                                return { ...ev, linkedEntities: [...new Set([...ev.linkedEntities, entityIdToUpdate])] };
                            }
                            return ev;
                        });
                    });
                    return updatedEvents;
                });
            }
        } else {
            let primaryId;
            if (isEvent) {
                const date = parseDateString(eventDateTimeStr);
                primaryId = Date.now();
                events.update(e => [{
                    id: primaryId,
                    title: mainField,
                    date: date.toISOString(),
                    description,
                    priority,
                    linkedEntities: allLinkedIds,
                    type: selectedType.key
                }, ...e]);

                if (pendingPosition) {
                    nodePositions.update(pos => ({
                        ...pos,
                        [`event-${primaryId}`]: pendingPosition
                    }));
                }
            } else {
                entityIdCounter.update(n => n + 1);
                primaryId = $entityIdCounter;

                let metadata = {};
                if (['vehicle', 'aircraft', 'vessel'].includes(selectedType.key)) {
                    metadata.plate = vehiclePlate;
                }
                if (['location', 'building', 'country'].includes(selectedType.key) && locationCoords) {
                    const [lat, lng] = locationCoords.split(',').map(c => parseFloat(c.trim()));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        metadata.lat = lat;
                        metadata.lng = lng;
                    }
                }
                if (entityImage) {
                    if (entityImageId && $images[entityImageId] === entityImage) {
                        metadata.imageId = entityImageId;
                    } else {
                        imageIdCounter.update(n => n + 1);
                        let newImageId;
                        imageIdCounter.subscribe(v => newImageId = v)();
                        images.update(imgs => ({ ...imgs, [newImageId]: entityImage }));
                        metadata.imageId = newImageId;
                    }
                }

                entities.update(e => [{
                    id: primaryId,
                    type: selectedType.key,
                    content: mainField,
                    description,
                    priority,
                    metadata,
                    timestamp: new Date().toISOString()
                }, ...e]);

                if (pendingPosition) {
                    nodePositions.update(pos => ({
                        ...pos,
                        [primaryId]: pendingPosition
                    }));
                }

                linkedEventIds.forEach(eventId => {
                    events.update(currentEvents => currentEvents.map(ev => {
                        if (ev.id === eventId) {
                            return { ...ev, linkedEntities: [...ev.linkedEntities, primaryId] };
                        }
                        return ev;
                    }));
                });

                allLinkedIds.forEach(linkedId => {
                    links.update(l => [...l, { from: primaryId, to: linkedId }]);
                });
            }
        }

        dispatch('close');
    }

    let mentionType = '';
    let mentionSearch = '';
    let mentionSuggestions = [];
    let mentionSelectionIndex = 0;
    let mentionPosition = 0;

    function handleDescriptionInput(e) {
        const start = e.target.selectionStart;
        const textBefore = e.target.value.substring(0, start);
        const lastChar = textBefore[textBefore.length - 1];

        if (lastChar === '@' || lastChar === '#') {
            mentionType = lastChar;
            mentionPosition = start;
            mentionSearch = '';
            mentionSuggestions = getMentionSuggestions();
            mentionSelectionIndex = 0;
        } else if (mentionType) {
            mentionSearch = textBefore.substring(mentionPosition);
            mentionSuggestions = getMentionSuggestions();
            mentionSelectionIndex = 0;
        }
    }

    function getMentionSuggestions() {
        if (mentionType === '@') {
            return $entities.filter(e => e.content.toLowerCase().includes(mentionSearch.toLowerCase()));
        }
        if (mentionType === '#') {
            return $events.filter(e => e.title.toLowerCase().includes(mentionSearch.toLowerCase()));
        }
        return [];
    }

    function handleDescriptionKeydown(e) {
        if (mentionType) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (mentionSuggestions.length > 0) {
                    mentionSelectionIndex = (mentionSelectionIndex + 1) % mentionSuggestions.length;
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (mentionSuggestions.length > 0) {
                    mentionSelectionIndex = (mentionSelectionIndex - 1 + mentionSuggestions.length) % mentionSuggestions.length;
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (mentionSuggestions[mentionSelectionIndex]) {
                    insertMention(mentionSuggestions[mentionSelectionIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                mentionType = '';
                mentionSuggestions = [];
            } else if (e.key === ' ') {
                mentionType = '';
                mentionSuggestions = [];
            }
        }
    }

    function insertMention(item) {
        const before = description.substring(0, mentionPosition - 1);
        const after = description.substring(mentionPosition + mentionSearch.length);
        const content = item.content || item.title;
        description = before + content + after;
        if (mentionType === '@') {
            addExistingLinkedId(item.id);
        } else if (mentionType === '#') {
            if (!linkedEventIds.includes(item.id)) {
                linkedEventIds = [...linkedEventIds, item.id];
            }
        }
        mentionType = '';
    }
</script>

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-xl w-full shadow-2xl shadow-cyan-500/30 p-6 relative my-8 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-cyan-400">
                {#if editingEntity && !editingEntity._isNew}
                    Edit Entity
                {:else}
                    Add Entity
                {/if}
            </h2>
            <button
                class="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all"
                on:click={() => dispatch('close')}
                aria-label="Close modal">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        {#if step === 1}
            <div>
                <div class="relative mb-4">
                    <input
                        id="typeInput"
                        type="text"
                        bind:this={typeInputRef}
                        bind:value={typeInput}
                        on:keydown={handleTypeInput}
                        placeholder="Search or select type..."
                        class="input text-lg"
                        autofocus
                    />
                    {#if suggestions.length > 0 && typeInput}
                        <div class="absolute top-full w-full mt-1 bg-gray-800 border border-cyan-500/50 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                            {#each suggestions as suggestion, i}
                                <button
                                    class="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 {i === suggestionIndex ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300 hover:bg-cyan-600/20'}"
                                    on:click={() => selectSuggestion(suggestion)}
                                >
                                    <span class="suggestion-icon">{@html getIconSvg(suggestion.key, 20, ENTITY_TYPES[suggestion.key]?.color || '#22d3ee')}</span>
                                    {suggestion.label}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div class="type-grid max-h-[50vh] overflow-y-auto pr-2">
                    {#each typeCategories as category}
                        <div class="mb-3">
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">{category.name}</div>
                            <div class="grid grid-cols-2 gap-1">
                                {#each category.types as type}
                                    <button
                                        class="type-btn flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all hover:bg-cyan-600/20 hover:border-cyan-500/50 border border-gray-700 bg-gray-800/50"
                                        on:click={() => selectSuggestion(type)}
                                    >
                                        <span class="type-icon">{@html getIconSvg(type.key, 22, ENTITY_TYPES[type.key]?.color || '#22d3ee')}</span>
                                        <span class="text-gray-300">{type.label}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if step === 2}
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2 flex items-center gap-2">
                    <span class="header-icon">{@html getIconSvg(selectedType.key, 28, ENTITY_TYPES[selectedType.key]?.color || '#22d3ee')}</span>
                    {editingEntity ? 'Edit' : 'New'} <span class="text-cyan-400">{selectedType.label}</span>
                </h3>

                {#if ['location', 'building', 'country'].includes(selectedType.key)}
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
                        <div class="flex gap-2">
                            <input
                                type="text"
                                bind:value={locationSearch}
                                placeholder="Search for a place..."
                                class="input flex-1"
                                on:keydown={(e) => e.key === 'Enter' && searchLocation(false)}
                            />
                            <button class="btn btn-small" on:click={() => searchLocation(false)} disabled={searchingLocation}>
                                {searchingLocation ? '...' : 'Search'}
                            </button>
                        </div>
                        {#if searchResults.length > 0}
                            <div class="bg-gray-800/80 mt-2 border border-cyan-400 rounded p-2 max-h-48 overflow-y-auto">
                                {#each searchResults as result}
                                    {@const addr = result.address}
                                    {@const hasHouseNumber = addr?.house_number}
                                    <button class="w-full text-left p-2 hover:bg-cyan-600/20 text-sm" on:click={() => selectLocation(result, false)}>
                                        <div class="font-medium">
                                            {#if hasHouseNumber}
                                                <span class="text-cyan-400">{addr.house_number}</span>
                                                {addr.road || ''}
                                            {:else}
                                                {result.display_name.split(',')[0]}
                                            {/if}
                                        </div>
                                        <div class="text-xs text-gray-500 truncate">
                                            {#if hasHouseNumber}
                                                {[addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village, addr.postcode].filter(Boolean).join(', ')}
                                            {:else}
                                                {result.display_name}
                                            {/if}
                                        </div>
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

                {#if ['location', 'building', 'country'].includes(selectedType.key)}
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

                {#if ['vehicle', 'aircraft', 'vessel'].includes(selectedType.key)}
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">
                            {selectedType.key === 'vehicle' ? 'License Plate' :
                             selectedType.key === 'aircraft' ? 'Tail Number' : 'Hull Number/Name'}
                        </label>
                        <input type="text" bind:value={vehiclePlate} class="input"/>
                    </div>
                {/if}

                <div class="relative">
                    <label class="block text-xs font-medium text-gray-500 mb-1">Description / Notes</label>
                    <textarea bind:this={descriptionRef} bind:value={description} on:input={handleDescriptionInput} on:keydown={handleDescriptionKeydown} rows="4" class="input"></textarea>
                    <div class="text-xs text-gray-500 mt-1">Use <span class="text-cyan-400 font-mono">@</span> to link entities and <span class="text-cyan-400 font-mono">#</span> to link events.</div>
                    {#if mentionType}
                        <div class="absolute bg-gray-800 border border-cyan-400 rounded-lg shadow-lg z-10" style="top: {descriptionRef?.offsetTop + descriptionRef?.offsetHeight}px; left: {descriptionRef?.offsetLeft}px">
                            {#each mentionSuggestions as suggestion, i}
                                <button class="w-full text-left px-4 py-2 text-sm {i === mentionSelectionIndex ? 'bg-cyan-600/20' : ''}" on:click={() => insertMention(suggestion)}>
                                    {suggestion.content || suggestion.title}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                    <div class="flex gap-2">
                        <button
                            class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border {priority === 'high' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}"
                            on:click={() => priority = priority === 'high' ? 'none' : 'high'}
                        >
                            High Priority
                        </button>
                        <button
                            class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border {priority === 'low' ? 'bg-gray-600/20 border-gray-500 text-gray-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}"
                            on:click={() => priority = priority === 'low' ? 'none' : 'low'}
                        >
                            Low Priority
                        </button>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Image (optional)</label>
                    {#if entityImage}
                        <div class="relative inline-block">
                            <img src={entityImage} alt="Attached" class="max-w-full max-h-32 rounded border border-gray-600" />
                            <button
                                class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-400"
                                on:click={() => entityImage = null}
                            >×</button>
                        </div>
                    {:else}
                        <div
                            class="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center text-gray-500 text-sm cursor-pointer hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                            on:click={() => imageInputRef?.click()}
                            on:paste={handleImagePaste}
                            tabindex="0"
                            role="button"
                        >
                            Click to upload or paste image (Ctrl+V)
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            class="hidden"
                            bind:this={imageInputRef}
                            on:change={handleImageSelect}
                        />
                    {/if}
                </div>

                <div class="space-y-3 pt-3 border-t border-gray-700">
                    <h4 class="text-sm font-medium text-cyan-400">Connections</h4>

                    {#if [...linkedEntities, ...$entities.filter(e => existingLinkedIds.includes(e.id)), ...$events.filter(e => linkedEventIds.includes(e.id))].length > 0}
                        <div class="flex flex-wrap gap-2">
                            {#each linkedEntities as linked}
                                <span class="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs flex items-center gap-1 border border-cyan-500/30">
                                    <span class="opacity-60">{linked.type}</span>
                                    {linked.content}
                                    <button on:click={() => linkedEntities = linkedEntities.filter(l => l !== linked)} class="text-red-400 hover:text-red-200 ml-1">×</button>
                                </span>
                            {/each}
                            {#each $entities.filter(e => existingLinkedIds.includes(e.id)) as linked}
                                <span class="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs flex items-center gap-1 border border-purple-500/30">
                                    <span class="opacity-60">{linked.type}</span>
                                    {linked.content}
                                    <button on:click={() => removeLinkedEntity(linked.id)} class="text-red-400 hover:text-red-200 ml-1">×</button>
                                </span>
                            {/each}
                            {#each $events.filter(e => linkedEventIds.includes(e.id)) as linked}
                                <span class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs flex items-center gap-1 border border-blue-500/30">
                                    <span class="opacity-60">event</span>
                                    {linked.title}
                                    <button on:click={() => linkedEventIds = linkedEventIds.filter(id => id !== linked.id)} class="text-red-400 hover:text-red-200 ml-1">×</button>
                                </span>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-gray-500 text-xs">No connections yet</p>
                    {/if}

                    {#if $entities.filter(e => e.id !== editingEntity?.id && !existingLinkedIds.includes(e.id)).length > 0 || $events.filter(e => !linkedEventIds.includes(e.id)).length > 0}
                        <div class="link-existing-section">
                            <label class="block text-xs text-gray-500 mb-1">Link existing</label>
                            <select class="input input-sm" on:change={e => {
                                const val = e.target.value;
                                if (val.startsWith('entity-')) {
                                    addExistingLinkedId(parseInt(val.replace('entity-', '')));
                                } else if (val.startsWith('event-')) {
                                    const eventId = parseInt(val.replace('event-', ''));
                                    if (!linkedEventIds.includes(eventId)) {
                                        linkedEventIds = [...linkedEventIds, eventId];
                                    }
                                }
                                e.target.value = '';
                            }}>
                                <option value="">Select...</option>
                                {#if $entities.filter(e => e.id !== editingEntity?.id && !existingLinkedIds.includes(e.id)).length > 0}
                                    <optgroup label="Entities">
                                        {#each $entities.filter(e => e.id !== editingEntity?.id && !existingLinkedIds.includes(e.id)) as entity}
                                            <option value="entity-{entity.id}">[{entity.type}] {entity.content}</option>
                                        {/each}
                                    </optgroup>
                                {/if}
                                {#if $events.filter(e => !linkedEventIds.includes(e.id)).length > 0}
                                    <optgroup label="Events">
                                        {#each $events.filter(e => !linkedEventIds.includes(e.id)) as event}
                                            <option value="event-{event.id}">{event.title}</option>
                                        {/each}
                                    </optgroup>
                                {/if}
                            </select>
                        </div>
                    {/if}

                    <div class="quick-add-section">
                        <button
                            class="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            on:click={() => showAddLinked = !showAddLinked}
                        >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            {showAddLinked ? 'Hide quick add' : 'Quick add & link'}
                        </button>

                        {#if showAddLinked}
                            <div class="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
                                <div class="flex gap-2">
                                    <select bind:value={linkedEntityType} class="input input-sm flex-shrink-0" style="width: 110px;">
                                        <option value="phone">Phone</option>
                                        <option value="email">Email</option>
                                        <option value="person">Person</option>
                                        <option value="vehicle">Vehicle</option>
                                        <option value="location">Location</option>
                                        <option value="object">Object</option>
                                    </select>
                                    {#if linkedEntityType === 'location'}
                                        <input type="text" bind:value={linkedLocationName} placeholder="Name..." class="input input-sm flex-1"/>
                                    {:else}
                                        <input
                                            type="text"
                                            bind:value={linkedEntityContent}
                                            placeholder="{linkedEntityType === 'phone' ? 'Phone number' : linkedEntityType === 'email' ? 'Email address' : 'Content'}..."
                                            class="input input-sm flex-1"
                                            on:keydown={(e) => e.key === 'Enter' && addLinkedEntity()}
                                        />
                                    {/if}
                                    <button on:click={addLinkedEntity} class="btn btn-small">Add</button>
                                </div>
                                {#if linkedEntityType === 'location'}
                                    <div class="flex gap-2">
                                        <input type="text" bind:value={locationSearch} placeholder="Search location..." class="input input-sm flex-1" on:keydown={(e) => e.key === 'Enter' && searchLocation(true)}/>
                                        <button class="btn btn-small" on:click={() => searchLocation(true)}>{searchingLocation ? '...' : 'Search'}</button>
                                    </div>
                                    {#if searchResults.length > 0}
                                        <div class="max-h-32 overflow-y-auto border border-gray-600 rounded">
                                            {#each searchResults as result}
                                                <button class="w-full text-left px-2 py-1 hover:bg-cyan-600/20 text-xs" on:click={() => selectLocation(result, true)}>
                                                    {result.display_name.substring(0, 60)}...
                                                </button>
                                            {/each}
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                        {/if}
                    </div>
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
                    <input
                        type="text"
                        bind:value={locationSearch}
                        placeholder="Search for a place..."
                        class="input flex-1"
                        on:keydown={(e) => e.key === 'Enter' && searchLocation(true)}
                    />
                    <button class="btn btn-small" on:click={() => searchLocation(true)} disabled={searchingLocation}>
                        {searchingLocation ? '...' : 'Search'}
                    </button>
                </div>
                {#if searchResults.length > 0}
                    <div class="bg-gray-800/80 mt-2 border border-cyan-400 rounded p-2 max-h-48 overflow-y-auto">
                        {#each searchResults as result}
                            {@const addr = result.address}
                            {@const hasHouseNumber = addr?.house_number}
                            <button class="w-full text-left p-2 hover:bg-cyan-600/20 text-sm" on:click={() => selectLocation(result, true)}>
                                <div class="font-medium">
                                    {#if hasHouseNumber}
                                        <span class="text-cyan-400">{addr.house_number}</span>
                                        {addr.road || ''}
                                    {:else}
                                        {result.display_name.split(',')[0]}
                                    {/if}
                                </div>
                                <div class="text-xs text-gray-500 truncate">
                                    {#if hasHouseNumber}
                                        {[addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village, addr.postcode].filter(Boolean).join(', ')}
                                    {:else}
                                        {result.display_name}
                                    {/if}
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}
                <button class="btn btn-small mt-4 w-full" on:click={() => step = 2}>Back to Main Form</button>
            </div>
        {/if}
    </div>
</div>
