<script>
  import { onMount, onDestroy } from 'svelte';
  import { allItems, allLinks } from '$lib/stores';
  
  let canvas;
  let ctx;
  let nodes = [];
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let panOffset = { x: 0, y: 0 };
  let zoom = 1;
  let resizeObserver;

  const nodeColors = {
    'text': '#00BCD4', 'email': '#9C27B0', 'phone': '#9C27B0', 'url': '#E91E63', 
    'location': '#FF9800', 'vehicle': '#2196F3', 'object': '#FFEB3B',
    'event': '#2196F3', 'incident': '#E91E63'
  };

  function initNodes() {
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    if ($allItems.length === 0) {
      nodes = [];
      return;
    }
    
    nodes = $allItems.map((item, index) => {
      const angle = (index / $allItems.length) * Math.PI * 2;
      return {
        id: item.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        item,
      };
    });
  }
  
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
      const nodeSize = node.item.itemType === 'event' ? 25 / zoom : 20 / zoom;
      
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 2);
      gradient.addColorStop(0, nodeColors[node.item.type] + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fillStyle = nodeColors[node.item.type] || '#666';
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
  
  function handleMouseDown(e) { isPanning = true; panStart.x = e.clientX - panOffset.x; panStart.y = e.clientY - panOffset.y;
  canvas.style.cursor = 'grabbing'; }
  function handleMouseMove(e) { if (isPanning) { panOffset.x = e.clientX - panStart.x;
  panOffset.y = e.clientY - panStart.y; draw(); } }
  function handleMouseUp() { isPanning = false; canvas.style.cursor = 'grab';
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    panOffset.x = x - (x - panOffset.x) * (newZoom / zoom);
    panOffset.y = y - (y - panOffset.y) * (newZoom / zoom);
    zoom = newZoom;
    draw();
  }
  
  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    draw();
  }
  
  function resetView() { zoom = 1;
  panOffset = { x: 0, y: 0 }; initNodes(); draw();
  }
  
  onMount(() => {
    if (window.reportComponentLoaded) window.reportComponentLoaded();
    ctx = canvas.getContext('2d');
    requestAnimationFrame(() => { resizeCanvas(); initNodes(); draw(); });
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
  });

  onDestroy(() => { if (resizeObserver) resizeObserver.disconnect(); });
  
  $: if (ctx && ($allItems || $allLinks)) { initNodes(); draw();
  }
</script>

<div class="flex flex-col h-full overflow-hidden bg-gray-900/30">
  <div class="p-4 pb-0">
    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-sm font-medium text-cyan-300 mb-2">Network Graph</h3>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-500 shadow-lg"></span> Event</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 shadow-lg"></span> Incident</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-cyan-400 shadow-lg"></span> Person/Org</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-purple-500 shadow-lg"></span> Contact</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-pink-500 shadow-lg"></span> Source</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-orange-500 shadow-lg"></span> Location</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-500 shadow-lg"></span> Vehicle</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-500 shadow-lg"></span> Object</span>
        </div>
      </div>
      <button class="btn btn-small" on:click={resetView}>RESET VIEW</button>
    </div>
    <p class="text-xs text-cyan-600/70 mt-2">Pan with mouse • Scroll to zoom</p>
  </div>
  
  <div class="flex-1 p-4 min-h-0">
    <div class="relative bg-gray-800/80 backdrop-blur-sm rounded-lg h-full border border-cyan-600/30 terminal-glow">
      <canvas bind:this={canvas} class="absolute inset-0 cursor-grab w-full h-full" on:mousedown={handleMouseDown} on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} on:mouseleave={handleMouseUp} on:wheel={handleWheel}/>
    </div>
  </div>
</div>