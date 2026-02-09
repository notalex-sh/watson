<!--
  Application header with search, file operations, and save/open dialogs.
  Supports encrypted (.wfe) and unencrypted (.wf) project files.
-->
<script>
  import { briefTitle, notes, entities, links, entityIdCounter, events, caseNumber, author, allItems, nodePositions, images, imageIdCounter, quickNotes, classification, canvasState, eventLinkColors, groups, groupIdCounter, canvasNotes, canvasImages, canvasPins, canvasItemIdCounter, autoSaveEnabled, resources, resourceIdCounter } from '$lib/stores';
  import { onMount, createEventDispatcher } from 'svelte';
  import { exportProject, importProject } from '$lib/utils';
  import { APP_VERSION, APP_STAGE } from '$lib/constants';

  const dispatch = createEventDispatcher();

  let currentTime = '';
  let showAbout = false;
  let showSaveDialog = false;
  let showPasswordDialog = false;
  let saveWithPassword = true;
  let savePassword = '';
  let savePasswordConfirm = '';
  let openPassword = '';
  let pendingFile = null;
  let fileInput;
  let isEditingTitle = false;
  let showSearch = false;
  let searchQuery = '';
  let searchResults = [];
  let selectedSearchIndex = 0;
  let searchInputRef;

  $: {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchResults = $allItems
        .filter(item => {
          const matchesQuery =
            item.content?.toLowerCase().includes(query) ||
            item.title?.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.type?.toLowerCase().includes(query);
          return matchesQuery;
        })
        .slice(0, 10);
    } else {
      searchResults = [];
    }
    selectedSearchIndex = 0;
  }

  /**
   * Updates the current time display.
   */
  function updateTime() {
    const now = new Date();
    currentTime = now.toTimeString().split(' ')[0];
  }

  /**
   * Copies report notes to clipboard.
   */
  function copyNotes() {
    navigator.clipboard.writeText($notes);
    showNotification('Notes copied to clipboard');
  }

  /**
   * Opens a new brief in a new browser tab.
   */
  function openNewBrief() {
    window.open(window.location.href, '_blank');
  }

  /**
   * Opens the save project dialog.
   */
  function openSaveDialog() {
    savePassword = '';
    savePasswordConfirm = '';
    saveWithPassword = true;
    showSaveDialog = true;
  }

  /**
   * Saves the project with optional password encryption.
   */
  async function doSave() {
    if (saveWithPassword) {
      if (!savePassword) {
        showNotification('Please enter a password', 'error');
        return;
      }
      if (savePassword !== savePasswordConfirm) {
        showNotification('Passwords do not match', 'error');
        return;
      }
    }

    try {
      await exportProject(
        $notes,
        $entities,
        $links,
        $events,
        $briefTitle,
        $caseNumber,
        $author,
        $nodePositions,
        $images,
        $quickNotes,
        $classification,
        $canvasState,
        $entityIdCounter,
        $imageIdCounter,
        $eventLinkColors,
        $groups,
        $groupIdCounter,
        $canvasNotes,
        $canvasImages,
        $canvasPins,
        $canvasItemIdCounter,
        $resources,
        $resourceIdCounter,
        saveWithPassword ? savePassword : null
      );
      showNotification(saveWithPassword ? 'Encrypted project saved' : 'Project saved');
      showSaveDialog = false;
    } catch (err) {
      showNotification('Failed to save project', 'error');
    }
  }

  /**
   * Handles file input for opening a project.
   */
  function openProject(event) {
    const file = event.target.files[0];
    if (file) {
      pendingFile = file;

      if (file.name.endsWith('.wfe')) {
        openPassword = '';
        showPasswordDialog = true;
      } else {
        loadProjectFile(file, null);
      }

      fileInput.value = '';
    }
  }

  /**
   * Loads project data from file with optional decryption.
   */
  async function loadProjectFile(file, password) {
    const passwordCallback = password ? () => Promise.resolve(password) : null;

    await importProject(file, (data) => {
      briefTitle.set(data.briefTitle || 'New Brief');
      caseNumber.set(data.caseNumber || '');
      author.set(data.author || '');
      classification.set(data.classification || 'UNCLASSIFIED');
      notes.set(data.report || data.notes || '');
      quickNotes.set(data.quickNotes || '');
      entities.set(data.entities);
      links.set(data.links);
      events.set(data.events || []);

      if (data.nodePositions) {
        nodePositions.set(data.nodePositions);
      }

      if (data.eventLinkColors) {
        eventLinkColors.set(data.eventLinkColors);
      } else {
        eventLinkColors.set({});
      }

      if (data.canvasState) {
        canvasState.set(data.canvasState);
      } else {
        canvasState.set({ zoom: 1, panX: 0, panY: 0 });
      }

      if (data.images) {
        images.set(data.images);
      } else {
        images.set({});
      }

      if (typeof data.imageIdCounter === 'number') {
        imageIdCounter.set(data.imageIdCounter);
      } else {
        const imgIds = Object.keys(data.images || {}).map(Number).filter(n => !isNaN(n));
        imageIdCounter.set(imgIds.length > 0 ? Math.max(...imgIds) : 0);
      }

      if (typeof data.entityIdCounter === 'number') {
        entityIdCounter.set(data.entityIdCounter);
      } else if (data.entities.length > 0) {
        const maxId = Math.max(...data.entities.map(e => e.id).filter(id => typeof id === 'number' && isFinite(id)));
        entityIdCounter.set(maxId);
      } else {
        entityIdCounter.set(0);
      }

      if (data.groups) {
        groups.set(data.groups);
      } else {
        groups.set([]);
      }

      if (typeof data.groupIdCounter === 'number') {
        groupIdCounter.set(data.groupIdCounter);
      } else if (data.groups?.length > 0) {
        const maxGroupId = Math.max(...data.groups.map(g => g.id).filter(id => typeof id === 'number' && isFinite(id)));
        groupIdCounter.set(maxGroupId);
      } else {
        groupIdCounter.set(0);
      }

      if (data.canvasNotes) {
        canvasNotes.set(data.canvasNotes);
      } else {
        canvasNotes.set([]);
      }

      if (data.canvasImages) {
        canvasImages.set(data.canvasImages);
      } else {
        canvasImages.set([]);
      }

      if (data.canvasPins) {
        canvasPins.set(data.canvasPins);
      } else {
        canvasPins.set([]);
      }

      if (typeof data.canvasItemIdCounter === 'number') {
        canvasItemIdCounter.set(data.canvasItemIdCounter);
      } else {
        const noteIds = (data.canvasNotes || []).map(n => n.id).filter(id => typeof id === 'number');
        const imageIds = (data.canvasImages || []).map(i => i.id).filter(id => typeof id === 'number');
        const pinIds = (data.canvasPins || []).map(p => p.id).filter(id => typeof id === 'number');
        const maxId = Math.max(0, ...noteIds, ...imageIds, ...pinIds);
        canvasItemIdCounter.set(maxId);
      }

      if (data.resources) {
        resources.set(data.resources);
      } else {
        resources.set([]);
      }

      if (typeof data.resourceIdCounter === 'number') {
        resourceIdCounter.set(data.resourceIdCounter);
      } else if (data.resources?.length > 0) {
        const maxResId = Math.max(...data.resources.map(r => r.id).filter(id => typeof id === 'number' && isFinite(id)));
        resourceIdCounter.set(maxResId);
      } else {
        resourceIdCounter.set(0);
      }

      showNotification('Project loaded');
    }, passwordCallback);
  }

  /**
   * Submits the password for encrypted file decryption.
   */
  async function submitOpenPassword() {
    if (!openPassword) {
      showNotification('Please enter a password', 'error');
      return;
    }

    try {
      await loadProjectFile(pendingFile, openPassword);
      showPasswordDialog = false;
      pendingFile = null;
    } catch (err) {
      showNotification('Incorrect password', 'error');
    }
  }

  /**
   * Displays a toast notification message.
   */
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded text-sm z-[9999] shadow-xl transition-all transform translate-y-0 backdrop-blur-sm ${
      type === 'error' ? 'bg-red-500/80 text-white border border-red-400' : 'bg-cyan-500/80 text-gray-950 border border-cyan-400'
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

  /**
   * Toggles the about dialog visibility.
   */
  function toggleAbout() {
    showAbout = !showAbout;
  }

  /**
   * Toggles auto-save feature and persists setting.
   */
  function toggleAutoSave() {
    autoSaveEnabled.update(v => {
      const newValue = !v;
      try {
        localStorage.setItem('watson-autosave-enabled', JSON.stringify(newValue));
      } catch (e) {
        console.warn('Failed to save auto-save setting:', e);
      }
      return newValue;
    });
  }

  /**
   * Clears all auto-saved data from localStorage.
   */
  function clearAutoSaveCache() {
    if (confirm('This will delete all auto-saved data. Are you sure?')) {
      try {
        localStorage.removeItem('watson-autosave');
        showNotification('Auto-save cache cleared');
      } catch (e) {
        console.warn('Failed to clear auto-save cache:', e);
      }
    }
  }

  /**
   * Toggles the search bar visibility and focus.
   */
  function toggleSearch() {
    showSearch = !showSearch;
    if (showSearch) {
      setTimeout(() => searchInputRef?.focus(), 50);
    } else {
      searchQuery = '';
    }
  }

  /**
   * Handles keyboard navigation in search results.
   */
  function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      toggleSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSearchIndex = Math.min(selectedSearchIndex + 1, searchResults.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
    } else if (e.key === 'Enter' && searchResults[selectedSearchIndex]) {
      selectSearchResult(searchResults[selectedSearchIndex]);
    }
  }

  /**
   * Dispatches selection event for the chosen search result.
   */
  function selectSearchResult(item) {
    dispatch('selectEntity', item);
    toggleSearch();
  }

  onMount(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);

    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNewBrief();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        openSaveDialog();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        fileInput.click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleSearch();
      }
    }

    window.addEventListener('keydown', handleKeydown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<header class="h-12 bg-gray-950 border-b border-cyan-600/30 px-4 flex justify-between items-center relative z-10">
  <div class="flex items-center gap-3">
    <h1 class="text-base font-bold tracking-wider text-cyan-400">WATSON</h1>
    <span class="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded">BETA</span>
    <span class="text-xs text-cyan-400/60 font-mono">{currentTime}</span>
    <div class="h-4 w-px bg-gray-700"></div>

    {#if isEditingTitle}
      <input
        type="text"
        bind:value={$briefTitle}
        on:blur={() => isEditingTitle = false}
        on:keydown={(e) => {if(e.key === 'Enter') isEditingTitle = false}}
        class="bg-gray-800 border border-cyan-500/50 rounded px-2 py-0.5 text-sm text-cyan-300 w-40"
      />
    {:else}
      <button on:click={() => isEditingTitle = true} class="text-sm text-cyan-300/80 hover:text-cyan-200 truncate max-w-[200px]">
        {$briefTitle}
      </button>
    {/if}
  </div>

  <div class="flex items-center gap-1">
    <button
      class="icon-btn"
      on:click={toggleSearch}
      title="Search (Ctrl+F)"
      class:active={showSearch}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    </button>

    <div class="h-4 w-px bg-gray-700 mx-1"></div>

    <button class="icon-btn" on:click={openNewBrief} title="New Brief (Ctrl+N)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
    </button>

    <button class="icon-btn" on:click={() => fileInput.click()} title="Open (Ctrl+O)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
      </svg>
    </button>

    <button class="icon-btn" on:click={openSaveDialog} title="Save (Ctrl+S)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
      </svg>
    </button>

    <div class="h-4 w-px bg-gray-700 mx-1"></div>

    <button class="icon-btn" on:click={copyNotes} title="Copy Report">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
      </svg>
    </button>

    <button class="icon-btn" on:click={toggleAbout} title="Help">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </button>

    <button
      class="ml-2 px-2 py-1 text-xs rounded transition-colors {$autoSaveEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-700/50 text-gray-500 border border-gray-600/50'}"
      on:click={toggleAutoSave}
      title={$autoSaveEnabled ? 'Auto-save enabled (saves to localStorage every 30s)' : 'Auto-save disabled (recommended for security)'}
    >
      {$autoSaveEnabled ? 'Auto-save ON' : 'Auto-save OFF'}
    </button>

    <button
      class="ml-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors"
      on:click={clearAutoSaveCache}
      title="Clear auto-saved data from browser"
    >
      Clear Cache
    </button>

    <div class="ml-2 text-xs text-yellow-400/80 flex items-center gap-1" title="Data stored in browser only">
      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    </div>
  </div>

  <input bind:this={fileInput} type="file" accept=".wf,.wfe" on:change={openProject} class="hidden"/>
</header>

{#if showSearch}
  <div class="search-overlay" on:click={toggleSearch}></div>
  <div class="search-dropdown">
    <div class="search-input-wrapper">
      <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <input
        bind:this={searchInputRef}
        type="text"
        bind:value={searchQuery}
        on:keydown={handleSearchKeydown}
        placeholder="Search entities..."
        class="search-input"
      />
      <kbd class="search-kbd">ESC</kbd>
    </div>
    {#if searchResults.length > 0}
      <div class="search-results">
        {#each searchResults as result, i}
          <button
            class="search-result"
            class:selected={i === selectedSearchIndex}
            on:click={() => selectSearchResult(result)}
          >
            <span class="search-result-type">{result.type}</span>
            <span class="search-result-content">{result.content || result.title}</span>
            {#if result.description}
              <span class="search-result-desc">{result.description.substring(0, 50)}</span>
            {/if}
          </button>
        {/each}
      </div>
    {:else if searchQuery.trim()}
      <div class="search-empty">No results found</div>
    {/if}
  </div>
{/if}

{#if showSaveDialog}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg p-6 max-w-md w-full shadow-2xl shadow-cyan-500/30 relative">
      <button class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all" on:click={() => showSaveDialog = false}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <h2 class="text-lg font-bold text-cyan-300 mb-4">Save Project</h2>

      <div class="space-y-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={saveWithPassword} class="w-4 h-4 accent-cyan-500" />
          <span class="text-gray-300">Encrypt with password (recommended)</span>
        </label>

        {#if saveWithPassword}
          <div class="space-y-3 pl-7">
            <input
              type="password"
              bind:value={savePassword}
              placeholder="Password"
              class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 text-sm focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="password"
              bind:value={savePasswordConfirm}
              placeholder="Confirm password"
              class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 text-sm focus:border-cyan-500 focus:outline-none"
            />
            <p class="text-xs text-amber-400">
              <svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              Save this password securely. Lost passwords cannot be recovered.
            </p>
          </div>
        {/if}

        <div class="flex gap-2 pt-4">
          <button class="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600" on:click={() => showSaveDialog = false}>
            Cancel
          </button>
          <button class="flex-1 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 font-medium" on:click={doSave}>
            Save {saveWithPassword ? 'Encrypted' : ''}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showPasswordDialog}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg p-6 max-w-md w-full shadow-2xl shadow-cyan-500/30 relative">
      <button class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all" on:click={() => { showPasswordDialog = false; pendingFile = null; }}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <h2 class="text-lg font-bold text-cyan-300 mb-4">Enter Password</h2>
      <p class="text-gray-400 text-sm mb-4">This file is encrypted. Enter the password to open it.</p>

      <div class="space-y-4">
        <input
          type="password"
          bind:value={openPassword}
          placeholder="Password"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 text-sm focus:border-cyan-500 focus:outline-none"
          on:keydown={(e) => e.key === 'Enter' && submitOpenPassword()}
          autofocus
        />

        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600" on:click={() => { showPasswordDialog = false; pendingFile = null; }}>
            Cancel
          </button>
          <button class="flex-1 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 font-medium" on:click={submitOpenPassword}>
            Open
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showAbout}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg p-6 max-w-2xl mx-4 shadow-2xl shadow-cyan-500/30 max-h-[90vh] overflow-y-auto relative">
      <button
        class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all"
        on:click={toggleAbout}
        aria-label="Close modal">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div class="flex items-center gap-3 mb-4">
        <h2 class="text-xl font-bold text-cyan-300">WATSON</h2>
        <span class="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded">{APP_STAGE}</span>
        <span class="text-xs text-gray-500 font-mono">v{APP_VERSION}</span>
      </div>
      <div class="space-y-4 text-sm text-gray-300">
        <p>Watson is a lightweight, tactical intelligence tool designed for rapid data capture and analysis. It helps investigators track entities, map relationships, and build timelines in fast-moving situations.</p>

        <div class="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-3 rounded">
          <p class="font-medium text-amber-400 mb-1">Beta Software</p>
          <p class="text-xs">This is a beta release. Features may change and bugs may exist. Please report issues on GitHub.</p>
        </div>

        <div class="bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 p-3 rounded flex gap-3">
          <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
          <p><strong>Important:</strong> This application stores all data locally in your browser session. All information will be lost when you close this tab unless you use the <strong>Save</strong> button to export your project.</p>
        </div>

        <div class="mt-4 pt-4 border-t border-cyan-600/30">
          <h3 class="text-base font-medium text-cyan-400 mb-3">Keyboard Shortcuts</h3>
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-400">
            <div><kbd class="text-cyan-300 font-mono">Ctrl+F</kbd> Search</div>
            <div><kbd class="text-cyan-300 font-mono">Ctrl+S</kbd> Save Project</div>
            <div><kbd class="text-cyan-300 font-mono">Ctrl+O</kbd> Open Project</div>
            <div><kbd class="text-cyan-300 font-mono">Ctrl+N</kbd> New Brief</div>
            <div><kbd class="text-cyan-300 font-mono">Right-click</kbd> Add Entity</div>
            <div><kbd class="text-cyan-300 font-mono">Double-click</kbd> Edit Entity</div>
          </div>
        </div>
        <p class="text-gray-500 text-xs pt-4 border-t border-gray-700 mt-4">
          Watson is open source: <a href="https://github.com/notalex-sh/watson" target="_blank" class="text-cyan-300 underline hover:text-cyan-200">github.com/notalex-sh/watson</a>
        </p>
      </div>
      <button class="btn btn-primary w-full mt-6" on:click={toggleAbout}>Close</button>
    </div>
  </div>
{/if}

<style>
  .icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
  }

  .icon-btn:hover {
    background: rgba(34, 211, 238, 0.1);
    border-color: rgba(34, 211, 238, 0.3);
    color: #22d3ee;
  }

  .icon-btn.active {
    background: rgba(34, 211, 238, 0.2);
    border-color: rgba(34, 211, 238, 0.5);
    color: #22d3ee;
  }

  .search-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
  }

  .search-dropdown {
    position: fixed;
    top: 56px;
    left: 50%;
    transform: translateX(-50%);
    width: 500px;
    max-width: calc(100vw - 32px);
    background: rgba(17, 24, 39, 0.98);
    border: 1px solid rgba(34, 211, 238, 0.3);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    z-index: 50;
    overflow: hidden;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #374151;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e5e7eb;
    font-size: 15px;
  }

  .search-input::placeholder {
    color: #6b7280;
  }

  .search-kbd {
    padding: 2px 6px;
    background: #374151;
    border-radius: 4px;
    font-size: 11px;
    color: #9ca3af;
  }

  .search-results {
    max-height: 300px;
    overflow-y: auto;
  }

  .search-result {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 10px 16px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .search-result:hover, .search-result.selected {
    background: rgba(34, 211, 238, 0.1);
  }

  .search-result-type {
    font-size: 10px;
    text-transform: uppercase;
    color: #22d3ee;
    letter-spacing: 0.5px;
  }

  .search-result-content {
    font-size: 14px;
    color: #e5e7eb;
  }

  .search-result-desc {
    font-size: 12px;
    color: #6b7280;
  }

  .search-empty {
    padding: 24px 16px;
    text-align: center;
    color: #6b7280;
    font-size: 14px;
  }
</style>
