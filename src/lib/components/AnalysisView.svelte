<!--
  Analysis dashboard panel displaying entity and connection statistics.
-->
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

<div class="flex-1 overflow-y-auto p-5 bg-gray-900/30 h-full">
  <h3 class="text-sm font-medium text-cyan-300 mb-4">Intelligence Analysis</h3>
  
  <div class="grid grid-cols-2 gap-3">
    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-600/30 hover:border-cyan-400 transition-all">
      <div class="text-2xl font-semibold text-cyan-300">{$stats.total}</div>
      <div class="text-xs text-cyan-500/70 uppercase tracking-wider">Total Items</div>
    </div>
    
     <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-blue-600/30 hover:border-blue-400 transition-all">
      <div class="text-2xl font-semibold text-blue-400">{$stats.events}</div>
      <div class="text-xs text-blue-500/70 uppercase tracking-wider">Events/Incidents</div>
    </div>

    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-600/30 hover:border-cyan-400 transition-all">
      <div class="text-2xl font-semibold text-cyan-400">{$stats.people}</div>
      <div class="text-xs text-cyan-500/70 uppercase tracking-wider">People/Orgs</div>
    </div>
    
    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-purple-600/30 hover:border-purple-400 transition-all">
      <div class="text-2xl font-semibold text-purple-400">{$stats.contacts}</div>
      <div class="text-xs text-purple-500/70 uppercase tracking-wider">Contacts</div>
    </div>
    
    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-orange-600/30 hover:border-orange-400 transition-all">
      <div class="text-2xl font-semibold text-orange-400">{$stats.locations}</div>
      <div class="text-xs text-orange-500/70 uppercase tracking-wider">Locations</div>
    </div>
    
    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-blue-600/30 hover:border-blue-400 transition-all">
      <div class="text-2xl font-semibold text-blue-400">{$stats.vehicles}</div>
      <div class="text-xs text-blue-500/70 uppercase tracking-wider">Vehicles</div>
    </div>
    
    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/30 hover:border-yellow-400 transition-all">
      <div class="text-2xl font-semibold text-yellow-400">{$stats.objects}</div>
      <div class="text-xs text-yellow-500/70 uppercase tracking-wider">Objects</div>
    </div>

    <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-green-600/30 hover:border-green-400 transition-all">
      <div class="text-2xl font-semibold text-green-400">{$stats.intel}</div>
      <div class="text-xs text-green-500/70 uppercase tracking-wider">Intel</div>
    </div>
  </div>
  
  <div class="mt-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-purple-600/30 hover:border-purple-400 transition-all">
    <div class="text-lg font-semibold text-purple-400">{$stats.connections}</div>
    <div class="text-xs text-purple-500/70 uppercase tracking-wider">Total Connections</div>
  </div>
  
  <div class="mt-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-600/30 hover:border-cyan-400 transition-all">
    <div class="text-lg font-semibold text-cyan-400">{$stats.mostConnected.name || 'None'}</div>
    <div class="text-xs text-cyan-500/70 uppercase tracking-wider">
      Most Connected Item {$stats.mostConnected.count > 0 ? `(${$stats.mostConnected.count} links)` : ''}
    </div>
  </div>
</div>