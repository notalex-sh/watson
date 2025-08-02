<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let loading = true;
  let loadingProgress = 0;
  let componentsLoaded = 0;
  const totalComponents = 7;
  let assetsLoaded = false;
  let isUnsupportedScreen = false;

  function checkScreenSize() {
    isUnsupportedScreen = window.innerWidth < 768;
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

    if (isUnsupportedScreen) {
        loading = false;
        return;
    }
      
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
    };
  });
</script>

{#if isUnsupportedScreen}
    <div class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 text-center p-4">
        <div>
            <h1 class="text-3xl font-bold text-cyan-400 mb-2 tracking-wider">WATSON</h1>
            <p class="text-gray-400">
                Unsupported screen dimensions. Please use a larger screen.
            </p>
        </div>
    </div>
{:else if loading}
  <div class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
    <div class="text-center">
      <div class="mb-8">
        <div class="w-20 h-20 mx-auto relative">
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-lg animate-pulse blur-xl"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-16 h-16 relative animate-spin-slow">
              <div class="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-purple-400 to-pink-400 rounded-lg blur-md"></div>
              <div class="absolute inset-2 bg-gray-900 rounded-lg"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-6 h-6 bg-gradient-to-br from-cyan-400 to-purple-400 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div class="absolute -inset-4 bg-gradient-to-r from-cyan-500/0 via-purple-500/30 to-cyan-500/0 blur-2xl animate-pulse"></div>
        </div>
      </div>
      
      <h1 class="text-3xl font-bold text-cyan-400 mb-2 tracking-wider">WATSON</h1>
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
  
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin-slow {
    animation: spin-slow 4s linear infinite;
  }
</style>