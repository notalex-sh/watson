<!--
  Interactive map panel displaying location entities using Leaflet.
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { entities } from '$lib/stores';
  import { browser } from '$app/environment';

  export let isCollapsed = false;

  let mapContainer;
  let map;
  let markers = [];
  let L;
  let mapInitialized = false;

  $: locationEntities = $entities.filter(e => e.type === 'location' && e.metadata?.lat && e.metadata?.lng);
  $: if (!isCollapsed && locationEntities.length > 0 && mapContainer && L) {
    setTimeout(() => {
      if (!map) {
        initMap();
      } else {
        map.invalidateSize();
        updateMarkers();
      }
    }, 100);
  }

  /**
   * Initializes the Leaflet map with dark theme tiles.
   */
  async function initMap() {
    if (!mapContainer || mapInitialized || locationEntities.length === 0) return;
    
    try {
      if (!map) {
        map = L.default.map(mapContainer).setView([-25.2744, 133.7751], 4);
        
        L.default.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
          attribution: '© Stadia Maps, © OpenMapTiles © OpenStreetMap contributors'
        }).addTo(map);
        
        mapInitialized = true;
      }

      updateMarkers();
    } catch (err) {
      console.error('Map initialization error:', err);
    }
  }

  /**
   * Updates map markers based on current location entities.
   */
  function updateMarkers() {
    if (!map || !L) return;
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    locationEntities.forEach(entity => {
      const icon = L.default.divIcon({
        className: 'custom-map-marker',
        html: '<div class="w-6 h-6 bg-orange-500 rounded-full border-2 border-cyan-400 shadow-lg shadow-orange-500/50 animate-pulse"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const marker = L.default.marker([entity.metadata.lat, entity.metadata.lng], { icon })
        .bindPopup(`<strong>${entity.content}</strong><br>${entity.description || 'No description'}`)
        .addTo(map);
      markers.push(marker);
    });
    
    if (markers.length > 0) {
      const group = new L.default.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }
  
  onMount(async () => {
    if (browser) {
      if (window.reportComponentLoaded) {
        window.reportComponentLoaded();
      }
      
      if (locationEntities.length > 0) {
        L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        
        if (!isCollapsed) {
          setTimeout(initMap, 100);
        }
      }
    }
  });
  
  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
      mapInitialized = false;
    }
  });
</script>

<div class="flex-1 flex flex-col bg-gray-900/30 p-4 h-full overflow-hidden" class:hidden={isCollapsed}>
  {#if locationEntities.length === 0}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 text-cyan-600/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="text-cyan-500/70">No location entities added yet</p>
        <p class="text-sm text-cyan-600/50 mt-2">Add locations to see them on the map</p>
      </div>
    </div>
  {:else}
    <h3 class="text-sm font-medium text-cyan-300 mb-4">Location Map</h3>
    <div id="map-container-for-export" bind:this={mapContainer} class="flex-1 rounded-lg overflow-hidden border border-cyan-600/30 bg-gray-900/80 backdrop-blur-sm min-h-0 terminal-glow"></div>
  {/if}
</div>

<style>
  :global(.custom-map-marker) {
    background: transparent !important;
    border: none !important;
  }
</style>