<!--
  Canvas-based network visualization panel with interactive panning and zooming.
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { allItems, allLinks } from '$lib/stores';
  import { GRAPH_CONFIG, getLayoutFunction, calculateFitParams } from '$lib/graph-layouts';

  let canvas;
  let ctx;
  let nodes = [];
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let panOffset = { x: 0, y: 0 };
  let zoom = 1;
  let resizeObserver;
  let layout = 'hierarchy';

  let unsubItems;
  let unsubLinks;

  /**
   * Applies the selected layout algorithm and optionally fits to view.
   */
  function applyLayout(shouldFit = true) {
    if (!canvas || $allItems.length === 0) {
      nodes = [];
      draw();
      return;
    }

    const layoutFn = getLayoutFunction(layout);
    const positions = layoutFn($allItems, $allLinks, GRAPH_CONFIG);

    nodes = $allItems.map(item => ({
      id: item.id,
      item,
      x: positions.get(item.id)?.x ?? 0,
      y: positions.get(item.id)?.y ?? 0
    }));

    if (shouldFit) {
      fitAndCenter();
    } else {
      draw();
    }
  }

  /**
   * Adjusts zoom and pan to fit all nodes in the viewport.
   */
  function fitAndCenter() {
    if (!canvas || nodes.length === 0) return;

    const positions = new Map();
    nodes.forEach(node => {
      positions.set(node.id, { x: node.x, y: node.y });
    });

    const { zoom: newZoom, panX, panY } = calculateFitParams(
      positions,
      canvas.width,
      canvas.height,
      GRAPH_CONFIG
    );

    zoom = newZoom;
    panOffset = { x: panX, y: panY };
    draw();
  }

  /**
   * Renders nodes and links to the canvas.
   */
  function draw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if ($allItems.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px \'JetBrains Mono\', monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No items to display', canvas.width / 2, canvas.height / 2);
      return;
    }

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5 / zoom;

    $allLinks.forEach(link => {
      const fromNode = nodes.find(n => n.id === link.from);
      const toNode = nodes.find(n => n.id === link.to);
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      }
    });

    nodes.forEach(node => {
      const nodeSize = (node.item.itemType === 'event' ? 25 : 20) / zoom;
      if (!isFinite(nodeSize) || nodeSize <= 0) return;

      const nodeColor = GRAPH_CONFIG.nodeColors[node.item.type] || '#666';

      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 2);
      gradient.addColorStop(0, nodeColor + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      const label = node.item.content.substring(0, 15) + (node.item.content.length > 15 ? '...' : '');
      ctx.font = `${12 / zoom}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
      ctx.fillRect(node.x - textWidth/2 - 4/zoom, node.y + nodeSize + 5/zoom, textWidth + 8/zoom, 16/zoom);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText(label, node.x, node.y + nodeSize + 16 / zoom);
    });

    ctx.restore();
  }

  function handleMouseDown(e) {
    isPanning = true;
    panStart.x = e.clientX - panOffset.x;
    panStart.y = e.clientY - panOffset.y;
    canvas.style.cursor = 'grabbing';
  }

  function handleMouseMove(e) {
    if (isPanning) {
      panOffset.x = e.clientX - panStart.x;
      panOffset.y = e.clientY - panStart.y;
      draw();
    }
  }

  function handleMouseUp() {
    isPanning = false;
    if (canvas) canvas.style.cursor = 'grab';
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { minZoom, maxZoom } = GRAPH_CONFIG;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * zoomFactor));

    const worldX = (x - panOffset.x) / zoom;
    const worldY = (y - panOffset.y) / zoom;
    panOffset.x = x - worldX * newZoom;
    panOffset.y = y - worldY * newZoom;
    zoom = newZoom;
    draw();
  }

  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    applyLayout();
  }

  function resetView() {
    applyLayout(true);
  }

  function handleLayoutChange() {
    applyLayout(true);
  }

  onMount(() => {
    if (window.reportComponentLoaded) window.reportComponentLoaded();
    ctx = canvas.getContext('2d');

    resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    unsubItems = allItems.subscribe(() => applyLayout(false));
    unsubLinks = allLinks.subscribe(() => applyLayout(false));
  });

  onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (unsubItems) unsubItems();
    if (unsubLinks) unsubLinks();
  });
</script>

<div class="flex flex-col h-full overflow-hidden bg-gray-900/30">
  <div class="p-2 flex flex-col md:flex-row gap-2">
    <div class="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs text-gray-400">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['event']};"></span>Event</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['incident']};"></span>Incident</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['text']};"></span>Person/Org</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['phone']};"></span>Contact</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['location']};"></span>Location</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['vehicle']};"></span>Vehicle</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['object']};"></span>Object</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {GRAPH_CONFIG.nodeColors['intel']};"></span>Intel</span>
    </div>

    <div class="flex-shrink-0 flex gap-2">
      <select bind:value={layout} class="input input-sm" on:change={handleLayoutChange}>
        <option value="hierarchy">Hierarchy</option>
        <option value="circular">Circular</option>
        <option value="grouped">Grouped</option>
        <option value="peacock">Peacock</option>
        <option value="grid">Grid</option>
      </select>
      <button
        class="btn btn-small flex items-center justify-center"
        on:click={resetView}
        title="Reset View">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 9a9 9 0 0 1 14.65-5.65M20 15a9 9 0 0 1-14.65 5.65" />
        </svg>
      </button>
    </div>
  </div>
  <div class="flex-1 p-2 pt-0 min-h-0">
    <div id="network-canvas-container" class="relative bg-gray-800/80 backdrop-blur-sm rounded-lg h-full border border-cyan-600/30 terminal-glow" style="background-color: #111827;">
      <canvas
        bind:this={canvas}
        class="absolute inset-0 cursor-grab w-full h-full"
        on:mousedown={handleMouseDown}
        on:mousemove={handleMouseMove}
        on:mouseup={handleMouseUp}
        on:mouseleave={handleMouseUp}
        on:wheel={handleWheel}/>
    </div>
  </div>
</div>
