<script>
  import { stats } from '$lib/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  onMount(() => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
  });
</script>

<div class="flex-1 overflow-y-auto p-5 bg-gray-800/50 h-full">
  <h3 class="text-sm font-medium text-cyan-400 mb-4">Intelligence Analysis</h3>
  
  <div class="grid grid-cols-2 gap-3">
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="text-2xl font-semibold text-gray-300">{$stats.total}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider">Total Entities</div>
    </div>
    
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="text-2xl font-semibold text-cyan-400">{$stats.people}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider">People/Orgs</div>
    </div>
    
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="text-2xl font-semibold text-orange-400">{$stats.locations}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider">Locations</div>
    </div>
    
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="text-2xl font-semibold text-pink-400">{$stats.sources}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider">Sources</div>
    </div>
    
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="text-2xl font-semibold text-green-400">{$stats.documents}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider">Documents</div>
    </div>
    
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="text-2xl font-semibold text-purple-400">{$stats.connections}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wider">Connections</div>
    </div>
  </div>
  
  <div class="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
    <div class="text-lg font-semibold text-cyan-400">{$stats.mostConnected.name || 'None'}</div>
    <div class="text-xs text-gray-500 uppercase tracking-wider">
      Most Connected Entity {$stats.mostConnected.count > 0 ? `(${$stats.mostConnected.count} links)` : ''}
    </div>
  </div>
</div>