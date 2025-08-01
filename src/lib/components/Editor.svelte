<script>
  import { notes, entities, links } from '$lib/stores';
  import { handleAutoPairs } from '$lib/utils';
  
  let textarea;
  let showQuickInsert = false;
  let quickInsertPosition = 0;
  let quickInsertSearch = '';
  let selectedIndex = 0;
  
  $: wordCount = $notes.trim() ? $notes.trim().split(/\s+/).length : 0;
  $: charCount = $notes.length;
  
  $: filteredEntities = $entities.filter(e => 
    e.content.toLowerCase().includes(quickInsertSearch.toLowerCase())
  ).slice(0, 5);
  
  $: if (showQuickInsert) {
    selectedIndex = 0;
  }
  
  function handleKeyDown(e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const start = e.target.selectionStart;
      const textBefore = e.target.value.substring(0, start);
      const lastChar = textBefore[textBefore.length - 1];
      
      // Only trigger if preceded by space or at start
      if (!lastChar || lastChar === ' ' || lastChar === '\n') {
        e.preventDefault();
        quickInsertPosition = start;
        quickInsertSearch = '';
        showQuickInsert = true;
        return;
      }
    }
    
    if (showQuickInsert) {
      if (e.key === 'Escape') {
        e.preventDefault();
        showQuickInsert = false;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredEntities.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredEntities[selectedIndex]) {
          insertEntity(filteredEntities[selectedIndex]);
        }
      } else if (e.key === 'Backspace' && quickInsertSearch === '') {
        showQuickInsert = false;
      }
    } else {
      handleAutoPairs(e, e.target);
    }
  }
  
  function handleInput(e) {
    if (showQuickInsert) {
      const start = quickInsertPosition;
      const current = e.target.selectionStart;
      
      if (current > start) {
        quickInsertSearch = e.target.value.substring(start, current);
      } else {
        showQuickInsert = false;
      }
    }
  }
  
  function insertEntity(entity) {
    const before = $notes.substring(0, quickInsertPosition);
    const after = $notes.substring(quickInsertPosition + quickInsertSearch.length);
    
    notes.set(before + entity.content + after);
    showQuickInsert = false;
    
    setTimeout(() => {
      const newPosition = quickInsertPosition + entity.content.length;
      textarea.selectionStart = textarea.selectionEnd = newPosition;
      textarea.focus();
    }, 0);
  }
  
  function getQuickInsertPosition() {
    if (!textarea || !showQuickInsert) return { top: 0, left: 0 };
    
    const dummy = document.createElement('div');
    const computedStyle = window.getComputedStyle(textarea);
    
    dummy.style.position = 'absolute';
    dummy.style.visibility = 'hidden';
    dummy.style.whiteSpace = 'pre-wrap';
    dummy.style.wordWrap = 'break-word';
    dummy.style.font = computedStyle.font;
    dummy.style.padding = computedStyle.padding;
    dummy.style.border = computedStyle.border;
    dummy.style.width = computedStyle.width;
    
    const textBeforeCursor = $notes.substring(0, quickInsertPosition);
    dummy.textContent = textBeforeCursor;
    
    document.body.appendChild(dummy);
    
    const span = document.createElement('span');
    span.textContent = '|';
    dummy.appendChild(span);
    
    const rect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    
    document.body.removeChild(dummy);
    
    return {
      top: rect.top + (spanRect.top - dummy.getBoundingClientRect().top) + 20,
      left: rect.left + (spanRect.left - dummy.getBoundingClientRect().left)
    };
  }
  
  $: quickInsertPos = getQuickInsertPosition();
</script>

<div class="flex-1 flex flex-col bg-gray-900/95">
  <div class="flex-1 p-6 overflow-y-auto min-h-0 relative">
    <textarea
      bind:this={textarea}
      bind:value={$notes}
      on:keydown={handleKeyDown}
      on:input={handleInput}
      placeholder="> Welcome to Watson — Tactical Intelligence, Captured Fast"
      class="w-full h-full bg-transparent border-none outline-none text-cyan-100 resize-none text-sm leading-relaxed placeholder-cyan-600/50 focus:placeholder-cyan-500/70 font-mono"
      style="text-shadow: 0 0 2px rgba(6, 182, 212, 0.3);"
    />
    
    {#if showQuickInsert}
      <div 
        class="absolute bg-gray-800/95 backdrop-blur-sm border border-cyan-400 rounded-lg shadow-2xl shadow-cyan-500/30 z-50 max-w-sm"
        style="top: {quickInsertPos.top}px; left: {quickInsertPos.left}px"
      >
        <div class="px-3 py-2 border-b border-cyan-600/30">
          <p class="text-xs text-gray-400">Quick Insert Entity</p>
          <p class="text-xs text-cyan-300 mt-1 font-mono">/{quickInsertSearch}</p>
        </div>
        {#if filteredEntities.length === 0}
          <div class="px-3 py-2 text-sm text-gray-500">No entities found</div>
        {:else}
          <div class="py-1">
            {#each filteredEntities as entity, index}
              <button
                class="w-full text-left px-3 py-2 hover:bg-cyan-600/20 text-sm flex items-center gap-2 transition-colors {index === selectedIndex ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300'}"
                on:click={() => insertEntity(entity)}
              >
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
                  {entity.type === 'text' ? 'P/O' : 
                   entity.type === 'email' ? 'EM' :
                   entity.type === 'phone' ? 'PH' :
                   entity.type === 'url' ? 'SRC' :
                   entity.type === 'image' ? 'DOC' :
                   entity.type === 'location' ? 'LOC' :
                   entity.type === 'vehicle' ? 'VEH' :
                   entity.type === 'object' ? 'OBJ' : '?'}
                </span>
                <span class="truncate">{entity.content}</span>
              </button>
            {/each}
          </div>
        {/if}
        <div class="px-3 py-2 border-t border-cyan-600/30 text-xs text-gray-500 bg-gray-900/50">
          <span class="text-cyan-400">↑↓</span> Navigate • <span class="text-cyan-400">Enter</span> Select • <span class="text-cyan-400">Esc</span> Cancel
        </div>
      </div>
    {/if}
  </div>
  
  <div class="bg-gray-800/90 backdrop-blur-sm border-t border-cyan-600/30 px-6 py-3 flex justify-between items-center">
    <div class="flex gap-6 text-xs text-gray-400">
      <span>Words: <span class="font-medium text-cyan-400">{wordCount}</span></span>
      <span>Characters: <span class="font-medium text-cyan-400">{charCount}</span></span>
      <span>Entities: <span class="font-medium text-cyan-300">{$entities.length}</span></span>
      <span>Links: <span class="font-medium text-cyan-300">{$links.length}</span></span>
    </div>
    <div class="flex items-center gap-4 text-xs text-gray-500">
      <span class="text-cyan-500/70">Press <span class="text-cyan-300 font-semibold">/</span> to quick insert</span>
      <span class="text-cyan-600/50">[Tactical Intel Drafting Tool]</span>
    </div>
  </div>
</div>