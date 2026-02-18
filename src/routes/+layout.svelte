<!--
  Root layout with loading animation, screen size detection, and unsaved changes warning.
-->
<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { notes, entities, links, events } from '$lib/stores';

  let loading = true;
  let loadingProgress = 0;
  let componentsLoaded = 0;
  const totalComponents = 7;
  let assetsLoaded = false;
  let isUnsupportedScreen = false;
  let logoReady = false;
  let canvas;
  let animationFrameId;

  function checkScreenSize() {
    isUnsupportedScreen = window.innerWidth < 768;
  }

  function beforeUnloadHandler(e) {
    if ($notes.length > 0 || $entities.length > 0 || $links.length > 0 || $events.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
  }

  if (browser) {
    window.reportComponentLoaded = () => {
      componentsLoaded++;
      loadingProgress = Math.min(95, (componentsLoaded / totalComponents) * 80);
    };
  }

  onMount(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('beforeunload', beforeUnloadHandler);

    const logoImg = new Image();
    logoImg.src = '/watson-logo.png';
    if (logoImg.complete) {
      logoReady = true;
    } else {
      logoImg.onload = () => { logoReady = true; };
      logoImg.onerror = () => { logoReady = true; };
    }

    if (isUnsupportedScreen) {
        loading = false;
        return;
    }

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let nodes = [];

    for (let i = 0; i < 50; i++) {
        nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, width, height);

        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > width) node.vx *= -1;
            if (node.y < 0 || node.y > height) node.vy *= -1;

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#00DDFF';
            ctx.fill();
        });
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.strokeStyle = `rgba(0, 221, 255, ${1 - dist / 150})`;
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(draw);
    }

    draw();
      
    const startTime = Date.now();
    
    const checkResourcesLoaded = () => {
      if (document.fonts && document.fonts.ready) {
        
        document.fonts.ready.then(() => {
          assetsLoaded = true;
          loadingProgress = Math.max(loadingProgress, 90);
        });
      }
      if (componentsLoaded >= totalComponents && assetsLoaded) {
        loadingProgress = 100;
        const elapsed = Date.now() - startTime;
        const minTime = 200;
        setTimeout(() => {
          loading = false;
        }, Math.max(0, minTime - elapsed));
      } else {
        setTimeout(checkResourcesLoaded, 100);
      }
    };
    
    setTimeout(checkResourcesLoaded, 100);
    setTimeout(() => {
      if (loading) {
        loadingProgress = 100;
        loading = false;
      }
    }, 500);

    return () => {
        window.removeEventListener('resize', checkScreenSize);
        window.removeEventListener('beforeunload', beforeUnloadHandler); 
        cancelAnimationFrame(animationFrameId);
    };
  });
</script>

{#if isUnsupportedScreen}
    <div class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 text-center p-4">
        <div>
            <img src="/watson-logo.png" alt="Watson" class="w-16 h-16 mx-auto mb-3 drop-shadow-[0_0_10px_rgba(0,221,255,0.4)]" />
            <h1 class="text-3xl font-bold text-cyan-400 mb-2 tracking-wider">WATSON</h1>
            <p class="text-gray-400">
                Unsupported screen dimensions.
                Please use a larger screen.
            </p>
        </div>
    </div>
{:else if loading}
  <div class="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 overflow-hidden">
    <canvas bind:this={canvas} class="absolute inset-0 w-full h-full"></canvas>
    <div class="text-center z-10 transition-opacity duration-150" class:opacity-0={!logoReady}>
      <img src="/watson-logo.png" alt="Watson" class="w-24 h-24 mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(0,221,255,0.4)]" />
      <h1 class="text-4xl font-bold text-cyan-400 mb-2 tracking-wider">WATSON</h1>
      <p class="text-sm text-gray-500 mb-8">Intel. Fast. Field-Ready.</p>
      
      <div class="w-64 mx-auto mb-4">
        <div class="bg-gray-800 rounded-full h-1 overflow-hidden relative">
          <div 
            class="bg-cyan-600 h-full transition-all duration-300 ease-out rounded-full"
            style="width: {loadingProgress}%"
          ></div>
          <div           
            class="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-30 animate-pulse"
            style="width: {loadingProgress}%"
          ></div>
        </div>
      </div>
      
      <p class="text-xs text-gray-600 min-h-[16px]">
        {#if loadingProgress < 20}
          Initializing secure environment...
         {:else if loadingProgress < 40}
            Loading application components...
        {:else if loadingProgress < 60}
          Setting up entity tracking...
        {:else if loadingProgress < 80}
          Preparing analysis tools...
        {:else if loadingProgress < 95}
          Finalizing interface...
         {:else}
          Ready to launch...
        {/if}
      </p>
    </div>
  </div>
{/if}

<div class="h-screen min-h-screen overflow-hidden bg-gray-900 transition-opacity duration-500 flex flex-col relative z-10" class:opacity-0={loading || isUnsupportedScreen}>
  <slot />
</div>

<style>
  :global(html) {
    background: #111827;
  }
  
  :global(body) {
    background-color: #111827;
    position: relative;
  }
  
  :global(body)::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(6, 182, 212, 0.03) 2px,
      rgba(6, 182, 212, 0.03) 4px
    );
    pointer-events: none;
    z-index: 1;
  }
  
  :global(::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }
  
  :global(::-webkit-scrollbar-track) {
    background: #1f2937;
  }
  
  :global(::-webkit-scrollbar-thumb) {
    background: #374151;
    border-radius: 4px;
  }
  
  :global(::-webkit-scrollbar-thumb:hover) {
    background: #4b5563;
  }

  @media print {
    :global(html),
    :global(body) {
      background: white !important;
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    :global(body)::before,
    :global(.fixed),
    :global(canvas),
    :global(.z-50),
    :global([class*="z-"]:not(.z-10)) {
      display: none !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
    }

    :global(.h-screen),
    :global(.min-h-screen),
    :global(.overflow-hidden) {
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
    }
  }
</style>