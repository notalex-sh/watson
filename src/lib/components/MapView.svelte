<script>
  import { onMount, onDestroy } from 'svelte';
  import { entities } from '$lib/stores';
  import { browser } from '$app/environment';
  
  let mapContainer;
  let map;
  let markers = [];
  let L;
  
  $: locationEntities = $entities.filter(e => e.type === 'location' && e.metadata.lat && e.metadata.lng);
  
  onMount(async () => {
    if (browser && window.reportComponentLoaded) {
      window.reportComponentLoaded();
    }
    
    if (locationEntities.length > 0) {
      L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      
      // Wait for container to be ready
      setTimeout(() => {
        if (mapContainer && !map) {
          map = L.default.map(mapContainer).setView([-25.2744, 133.7751], 4);
          
          L.default.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
            attribution: '© Stadia Maps, © OpenMapTiles © OpenStreetMap contributors'
          }).addTo(map);
          
          updateMarkers();
        }
      }, 100);
    }
  });
  
  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
  
  function updateMarkers() {
    if (!map || !L) return;
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    locationEntities.forEach(entity => {
      const marker = L.default.marker([entity.metadata.lat, entity.metadata.lng])
        .bindPopup(`<strong>${entity.content}</strong><br>${entity.description || 'No description'}`)
        .addTo(map);
      markers.push(marker);
    });
    
    if (markers.length > 0) {
      const group = new L.default.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }
  
  $: if (map && locationEntities) {
    updateMarkers();
  }
</script>

<div class="flex-1 flex flex-col bg-gray-800/50 p-4 h-full overflow-hidden">
  {#if locationEntities.length === 0}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="text-gray-500">No location entities added yet</p>
        <p class="text-sm text-gray-600 mt-2">Add locations to see them on the map</p>
      </div>
    </div>
  {:else}
    <h3 class="text-sm font-medium text-cyan-400 mb-4">Location Map</h3>
    <div bind:this={mapContainer} class="flex-1 rounded-lg overflow-hidden border border-gray-700 bg-gray-900 min-h-0 terminal-glow"></div>
  {/if}
</div>