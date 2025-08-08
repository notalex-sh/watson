<script>
  import { notes, entities, events } from '$lib/stores';
  import { handleAutoPairs, formatDate } from '$lib/utils';
  import { derived } from 'svelte/store';

  export let isMapPanelCollapsed = true;

  let textarea;
  let showQuickInsert = false;
  let quickInsertPosition = 0;
  let quickInsertSearch = '';
  let selectedIndex = 0;

  $: wordCount = $notes.trim() ? $notes.trim().split(/\s+/).length : 0;
  $: charCount = $notes.length;
  
  const quickInsertItems = derived([entities, events], ([$entities, $events]) => {
      const entityItems = $entities.map(e => ({...e, type: 'entity', label: e.content}));
      const eventItems = $events.map(ev => ({...ev, type: 'event', label: ev.title}));
      return [...entityItems, ...eventItems];
  });
  $: filteredItems = $quickInsertItems.filter(item =>
    item.label.toLowerCase().includes(quickInsertSearch.toLowerCase())
  ).slice(0, 7);
  $: if (showQuickInsert) {
    selectedIndex = 0;
  }

  function handleKeyDown(e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const start = e.target.selectionStart;
      const textBefore = e.target.value.substring(0, start);
      const lastChar = textBefore[textBefore.length - 1];
      if (!lastChar || lastChar === ' ' || lastChar === '\n' || lastChar === '(') {
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
        selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          insertItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Backspace' && quickInsertSearch === '') {
        showQuickInsert = false;
      }
    } else {
        if (e.key === 'Tab' && e.shiftKey) {
          // do nothing to allow the quick add modal to open
        } else {
          handleAutoPairs(e, e.target);
        }
    }
     if (e.key === ' ' && !showQuickInsert) {
        const start = e.target.selectionStart;
        const textBefore = e.target.value.substring(0, start);
        if (textBefore.endsWith('/now')) {
            e.preventDefault();
            const position = start - 4;
            const before = $notes.substring(0, position);
            const after = $notes.substring(start);
            const formattedNow = formatDate(new Date());
            notes.set(before + formattedNow + after);
            setTimeout(() => {
                const newPosition = position + formattedNow.length;
                textarea.selectionStart = textarea.selectionEnd = newPosition;
                textarea.focus();
            }, 0);
            return;
        }
    }
  }

  function handleInput(e) {
    if (showQuickInsert) {
      const start = quickInsertPosition;
      const current = e.target.selectionStart;

      if (current > start) {
        quickInsertSearch = e.target.value.substring(start + 1, current);
      } else {
        showQuickInsert = false;
      }
    }
  }

  function insertItem(item) {
    let contentToInsert = '';
    if (item.type === 'entity') {
        contentToInsert = item.content;
    } else if (item.type === 'event') {
        contentToInsert = formatDate(item.date);
    }

    const currentText = textarea.value;
    const cursorPos = textarea.selectionStart;
    const before = currentText.substring(0, quickInsertPosition);
    const after = currentText.substring(cursorPos);

    notes.set(before + contentToInsert + after);
    showQuickInsert = false;
    setTimeout(() => {
      const newPosition = before.length + contentToInsert.length;
      textarea.selectionStart = textarea.selectionEnd = newPosition;
      textarea.focus();
    }, 0);
  }

  function getQuickInsertPosition() {
    if (!textarea || !showQuickInsert) return { top: 0, left: 0 };
    const dummy = document.createElement('div');
    const computedStyle = window.getComputedStyle(textarea);
    Object.assign(dummy.style, {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        font: computedStyle.font,
        padding: computedStyle.padding,
        border: computedStyle.border,
        width: computedStyle.width
    });
    dummy.textContent = $notes.substring(0, quickInsertPosition);
    document.body.appendChild(dummy);

    const span = document.createElement('span');
    dummy.appendChild(span);

    const rect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    const dummyRect = dummy.getBoundingClientRect();

    document.body.removeChild(dummy);

    return {
      top: rect.top + (spanRect.top - dummyRect.top) + 20,
      left: rect.left + (spanRect.left - dummyRect.left)
    };
  }

  $: quickInsertPos = getQuickInsertPosition();
</script>

<div class="flex-1 flex flex-col bg-gray-950">
  <div class="flex-1 p-6 overflow-y-auto min-h-0 relative">
    <textarea
      bind:this={textarea}
      bind:value={$notes}
      on:keydown={handleKeyDown}
      on:input={handleInput}
      placeholder="> Welcome to Watson — Tactical Intelligence, Captured Fast"
      class="w-full h-full bg-transparent border-none outline-none text-cyan-100 resize-none text-sm leading-relaxed placeholder-cyan-600/50 focus:placeholder-cyan-500/70 font-mono"
      style="text-shadow: 0 0 5px rgba(0, 221, 255, 0.3);"
    />

    {#if showQuickInsert}
      <div
        class="absolute bg-gray-900/95 backdrop-blur-sm border border-cyan-400 rounded-lg shadow-2xl shadow-cyan-500/30 z-50 max-w-sm"
        style="top: {quickInsertPos.top}px; left: {quickInsertPos.left}px"
      >
        <div class="px-3 py-2 border-b border-cyan-600/30">
          <p class="text-xs text-gray-400">Quick Insert</p>
          <p class="text-xs text-cyan-300 mt-1 font-mono">/{quickInsertSearch}</p>
        </div>
        
        {#if filteredItems.length === 0}
          <div class="px-3 py-2 text-sm text-gray-500">No items found</div>
        {:else}
          <div class="py-1">
            {#each filteredItems as item, index}
              <button
                class="w-full text-left px-3 py-2 hover:bg-cyan-600/20 text-sm flex items-center 
                   gap-2 transition-colors {index === selectedIndex ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-300'}"
                on:click={() => insertItem(item)}
              >
                {#if item.type === 'entity'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium { item.type === 'text' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-700 text-gray-400'}">ENT</span>
                {:else if item.type === 'event'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-900/30 text-pink-400">EVT</span>
                {/if}
                <span class="truncate">{item.label}</span>
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

  <div class="bg-gray-900/90 backdrop-blur-sm border-t border-cyan-600/30 px-6 py-3 flex justify-between items-center">
    <div class="flex gap-6 text-xs text-gray-400">
      <span>Words: <span class="font-medium text-cyan-400">{wordCount}</span></span>
      <span>Characters: <span class="font-medium text-cyan-400">{charCount}</span></span>
    </div>
    <div class="flex items-center gap-4 text-xs text-gray-500">
      {#if isMapPanelCollapsed}
        <span class="text-cyan-600/50">[Tactical Intel Drafting Tool]</span>
      {/if}
    </div>
  </div>
</div>