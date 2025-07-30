<script>
  import { notes } from '$lib/stores';
  import { onMount } from 'svelte';
  
  let currentTime = '';
  let showAbout = false;
  
  function updateTime() {
    const now = new Date();
    currentTime = now.toTimeString().split(' ')[0];
  }
  
  function copyNotes() {
    navigator.clipboard.writeText($notes);
    showNotification('Notes copied to clipboard');
  }
  
  function openNewBrief() {
    window.open(window.location.href, '_blank');
  }
  
  // Notfis for stuff
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded text-sm z-50 shadow-xl transition-all transform translate-y-0 ${
      type === 'error' ? 'bg-red-600 text-white' : 'bg-cyan-600 text-gray-900'
    }`;
    notification.style.transform = 'translateY(100px)';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
      notification.style.transform = 'translateY(100px)';
      setTimeout(() => notification.remove(), 300);
    }, 2700);
  }
  
  function toggleAbout() {
    showAbout = !showAbout;
  }
  
  onMount(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    // Keyboard shortcut for new brief (ctrl + n)
    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNewBrief();
      }
    }
    
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<header class="h-[57px] bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center relative z-10">
  <div class="flex items-center gap-3">
    <h1 class="text-lg font-bold text-cyan-400 tracking-wider">WATSON</h1>
    <span class="text-xs text-cyan-400">[{currentTime}]</span>
  </div>
  
  <div class="flex items-center gap-4">
    <span class="text-xs text-yellow-400 flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      DOES NOT SAVE
    </span>
    <button 
      class="btn btn-small"
      on:click={openNewBrief}
      title="Open new brief (Ctrl+N)"
    >
      New Brief
    </button>
    <button 
      class="btn btn-primary btn-small"
      on:click={copyNotes}
    >
      Copy Notes
    </button>
    <button 
      class="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-600 flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-all"
      on:click={toggleAbout}
      aria-label="About"
    >
      ?
    </button>
  </div>
</header>

{#if showAbout}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" on:click={toggleAbout}>
    <div class="bg-gray-900 border border-cyan-600 rounded-lg p-6 max-w-md mx-4 shadow-2xl shadow-cyan-900/30" on:click|stopPropagation>
      <h2 class="text-xl font-bold text-cyan-400 mb-4">ABOUT WATSON</h2>
      <div class="space-y-3 text-sm text-gray-300">
        <p>Watson is a lightweight, tactical intelligence tool built for the front lines. It helps investigators and analysts quickly track entities, map relationships, and write initial reports or briefings during fast-moving incidents or field operations.</p>
        <div class="bg-yellow-900/20 border border-yellow-600/50 text-yellow-400 p-3 rounded flex gap-2">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p>This application does not save data. All information exists only in this browser session and will be lost when you close this tab. Please ensure you copy any data you want to preserve before leaving the page.</p>
        </div>
        <ul class="list-disc pl-5 space-y-1 text-gray-400 text-xs">
            <li>Take fast, structured intelligence notes for briefs and reports</li>
            <li>Track people, organisations, locations, and sources as context</li>
            <li>Map relationships to support situational awareness</li>
            <li>Visualise connections and geographic data as you write</li>
            <li>100% client-side — no data leaves this tab</li>
        </ul>
        <p class="text-gray-400 text-xs ">
            Watson is fully open source to ensure transparency and trust. See the code at    
            <a href="https://github.com/notalex-sh/watson" target="_blank" class="text-cyan-400 underline hover:text-cyan-300">
                github.com/notalex-sh/watson</a>.
        </p>

        <div class="mt-4 pt-4 border-t border-gray-800">
          <h3 class="text-sm font-medium text-gray-400 mb-2">Keyboard Shortcuts</h3>
          <ul class="text-xs text-gray-500 space-y-1">
            <li><span class="text-cyan-400">Ctrl+N</span> - Open new brief</li>
            <li><span class="text-cyan-400">Click entity</span> - View details</li>
            <li><span class="text-cyan-400">Scroll</span> - Zoom network view</li>
          </ul>
        </div>
        <p class="text-gray-400 text-xs py-2">
            Watson was created by 
            <a href="https://www.notalex.sh" target="_blank" class="text-cyan-400 underline hover:text-cyan-300">
                notalex.sh</a>.
        </p>
      </div>
      <button 
        class="btn btn-primary w-full mt-6"
        on:click={toggleAbout}
      >
        Close
      </button>
    </div>
  </div>
{/if}