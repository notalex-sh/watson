<script>
  import { notes, entities, links } from '$lib/stores';
  import { handleAutoPairs } from '$lib/utils';
  
  $: wordCount = $notes.trim() ? $notes.trim().split(/\s+/).length : 0;
  $: charCount = $notes.length;
</script>

<div class="flex-1 flex flex-col bg-gray-900">
  <div class="flex-1 p-6 overflow-y-auto min-h-0">
    <textarea
      bind:value={$notes}
      on:keydown={(e) => handleAutoPairs(e, e.target)}
      placeholder="> Welcome to Watson — Tactical Intelligence, Captured Fast"
      class="w-full h-full bg-transparent border-none outline-none text-gray-300 resize-none text-sm leading-relaxed placeholder-gray-600 focus:placeholder-gray-500"
      style="text-shadow: 0 0 1px rgba(6, 182, 212, 0.1);"
    />
  </div>
  
  <div class="bg-gray-800 border-t border-gray-700 px-6 py-3 flex justify-between items-center">
    <div class="flex gap-6 text-xs text-gray-500">
      <span>Words: <span class="font-medium text-gray-400">{wordCount}</span></span>
      <span>Characters: <span class="font-medium text-gray-400">{charCount}</span></span>
      <span>Entities: <span class="font-medium text-cyan-400">{$entities.length}</span></span>
      <span>Links: <span class="font-medium text-cyan-400">{$links.length}</span></span>
    </div>
    <span class="text-xs text-gray-600">[Tactical Intel Drafting Tool]</span>
  </div>
</div>