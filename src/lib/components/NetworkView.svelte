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
  let layout = 'horizontal-tree';
  const nodeColors = {
    'text': '#00BCD4', 'email': '#9C27B0', 'phone': '#9C27B0', 'url': '#E91E63',
    'location': '#FF9800', 'vehicle': '#2196F3', 'object': '#FFEB3B',
    'event': '#2196F3', 'incident': '#E91E63', 'intel': '#4CAF50'
  };
  function applyLayout(shouldFit = true) {
    if (!canvas || $allItems.length === 0) {
        nodes = [];
        draw();
        return;
    };

    const graphNodes = new Map($allItems.map(item => [item.id, { id: item.id, item, children: [], parent: null }]));
    $allLinks.forEach(link => {
        const fromNode = graphNodes.get(link.from);
        const toNode = graphNodes.get(link.to);
        if (fromNode && toNode) {
            fromNode.children.push(toNode);
            toNode.parent = fromNode;
        }
    });
    const roots = Array.from(graphNodes.values()).filter(n => !n.parent);

    calculateNodePositions(roots, Array.from(graphNodes.values()));

    if (shouldFit) {
        fitAndCenter();
    } else {
        draw();
    }
  }

  function calculateNodePositions(roots, allGraphNodes) {
    const positions = new Map();
    const visited = new Set();
    const nodeSpacingX = 250;
    const nodeSpacingY = 200;
    if (layout === 'horizontal-tree') {
        let yCursor = 0;
        function layoutSubtree(node, depth, y) {
            if (visited.has(node.id)) return 0;
            visited.add(node.id);
            const childrenHeight = node.children.reduce((acc, child) => acc + layoutSubtree(child, depth + 1, y + acc), 0);
            const nodeHeight = Math.max(childrenHeight, 150);
            positions.set(node.id, { x: depth * nodeSpacingX, y: y + (childrenHeight > 0 ? (childrenHeight - 150) / 2 : 0) });
            return nodeHeight;
        }
        roots.forEach(root => {
            yCursor += layoutSubtree(root, 0, yCursor);
        });
    } else if (layout === 'vertical-tree') {
        let xCursor = 0;
        function layoutSubtree(node, depth, x) {
            if (visited.has(node.id)) return 0;
            visited.add(node.id);
            const childrenWidth = node.children.reduce((acc, child) => acc + layoutSubtree(child, depth + 1, x + acc), 0);
            const nodeWidth = Math.max(childrenWidth, nodeSpacingX);
            positions.set(node.id, { y: depth * nodeSpacingY, x: x + (childrenWidth > 0 ? (childrenWidth - nodeSpacingX) / 2 : 0) });
            return nodeWidth;
        }
        roots.forEach(root => {
            xCursor += layoutSubtree(root, 0, xCursor);
        });
    } else if (layout === 'grid') {
        const numCols = Math.ceil(Math.sqrt(allGraphNodes.length));
        allGraphNodes.forEach((node, i) => {
            positions.set(node.id, { x: (i % numCols) * nodeSpacingX, y: Math.floor(i / numCols) * 150 });
        });
    } else { // Circle
        const radius = (allGraphNodes.length * 100) / (2 * Math.PI);
        allGraphNodes.forEach((node, i) => {
            const angle = (i / allGraphNodes.length) * 2 * Math.PI;
            positions.set(node.id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        });
    }

    nodes = allGraphNodes.map(n => ({
        id: n.id,
        item: n.item,
        ...(positions.get(n.id) || { x: 0, y: 0 })
    }));
  }

  function fitAndCenter() {
      if (!canvas || nodes.length === 0) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(node => {
          minX = Math.min(minX, node.x);
          maxX = Math.max(maxX, node.x);
          minY = Math.min(minY, node.y);
          maxY = Math.max(maxY, node.y);
      });
      const graphWidth = (maxX - minX) || 1;
      const graphHeight = (maxY - minY) || 1;
      const padding = 150;
      const scaleX = (canvas.width - padding) / graphWidth;
      const scaleY = (canvas.height - padding) / graphHeight;
      zoom = Math.max(0.1, Math.min(scaleX, scaleY, 2));

      const graphCenterX = minX + graphWidth / 2;
      const graphCenterY = minY + graphHeight / 2;

      panOffset = {
          x: canvas.width / 2 - graphCenterX * zoom,
          y: canvas.height / 2 - graphCenterY * zoom
      };
      draw();
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
      const nodeSize = (node.item.itemType === 'event' ? 25 : 20) / zoom;
      if (!isFinite(nodeSize) || nodeSize <= 0) return;

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

  function handleMouseDown(e) { isPanning = true;
    panStart.x = e.clientX - panOffset.x; panStart.y = e.clientY - panOffset.y;
    canvas.style.cursor = 'grabbing';
  }
  function handleMouseMove(e) { if (isPanning) { panOffset.x = e.clientX - panStart.x;
  panOffset.y = e.clientY - panStart.y; draw();
  } }
  function handleMouseUp() { isPanning = false; canvas.style.cursor = 'grab';
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newZoom = Math.max(0.1, Math.min(5, e.deltaY > 0 ? zoom * 0.9 : zoom * 1.1));
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

  onMount(() => {
    if (window.reportComponentLoaded) window.reportComponentLoaded();
    ctx = canvas.getContext('2d');
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
  });
  onDestroy(() => { if (resizeObserver) resizeObserver.disconnect(); });

  $: if (ctx) {
      const unsub = allItems.subscribe(() => applyLayout(false));
      const unsubLinks = allLinks.subscribe(() => applyLayout(false));
      onDestroy(() => {
          unsub();
          unsubLinks();
      });
  }
</script>

<div class="flex flex-col h-full overflow-hidden bg-gray-900/30">
  <div class="p-2 flex flex-col md:flex-row gap-2">
      <div class="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 text-xs text-gray-400">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['event']};"></span>Event</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['incident']};"></span>Incident</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['text']};"></span>Person/Org</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['phone']};"></span>Contact</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['url']};"></span>Source</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['location']};"></span>Location</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['vehicle']};"></span>Vehicle</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['object']};"></span>Object</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: {nodeColors['intel']};"></span>Intel</span>
      </div>
      <div class="flex-shrink-0 flex gap-2">
          <select bind:value={layout} class="input input-sm" on:change="{() => applyLayout(true)}">
              <option value="horizontal-tree">H-Tree</option>
              <option value="vertical-tree">V-Tree</option>
              <option value="grid">Grid</option>
              <option value="circle">Circle</option>
          </select>
          <button class="btn btn-small flex items-center justify-center" on:click={resetView} title="Reset View">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 9a9 9 0 0 1 14.65-5.65M20 15a9 9 0 0 1-14.65 5.65" />
              </svg>
          </button>
      </div>
  </div>
  <div class="flex-1 p-2 pt-0 min-h-0">
   <div class="relative bg-gray-800/80 backdrop-blur-sm rounded-lg h-full border border-cyan-600/30 terminal-glow">
      <canvas bind:this={canvas} class="absolute inset-0 cursor-grab w-full h-full" on:mousedown="{handleMouseDown}" on:mousemove="{handleMouseMove}" on:mouseup="{handleMouseUp}" on:mouseleave="{handleMouseUp}" on:wheel="{handleWheel}"/>
    </div>
  </div>
</div>