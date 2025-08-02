<script>
  import { notes, entities, links, entityIdCounter, events } from '$lib/stores';
  import { onMount } from 'svelte';
  import { exportProject, importProject } from '$lib/utils';

  let currentTime = '';
  let showAbout = false;
  let fileInput;

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

  function saveProject() {
    // Pass the events store to the export function
    exportProject($notes, $entities, $links, $events);
    showNotification('Project saved');
  }

  function openProject(event) {
    const file = event.target.files[0];
    if (file) {
      importProject(file, (data) => {
        notes.set(data.notes);
        entities.set(data.entities);
        links.set(data.links);
        // Load events, defaulting to an empty array if not present
        events.set(data.events || []);

        if (data.entities.length > 0) {
          const maxId = Math.max(...data.entities.map(e => e.id));
          entityIdCounter.set(maxId);
        }

        showNotification('Project loaded');
        fileInput.value = ''; // Reset file input
      });
    }
  }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded text-sm z-[9999] shadow-xl transition-all transform translate-y-0 backdrop-blur-sm ${
      type === 'error' ? 'bg-red-500/80 text-white border border-red-400' : 'bg-cyan-500/80 text-gray-900 border border-cyan-400'
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

    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNewBrief();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        fileInput.click();
      }
    }

    window.addEventListener('keydown', handleKeydown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<header class="h-[57px] bg-gray-900 border-b border-cyan-600/30 px-6 py-3 flex justify-between items-center relative z-10">
  <div class="flex items-center gap-3">
    <div class="relative group">
      <div class="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
      <h1 class="relative text-lg font-bold tracking-wider flex items-center gap-0.5">
        <span class="text-cyan-400 transition-all duration-300 hover:text-cyan-300">W</span>
        <span class="text-cyan-400/90 transition-all duration-300 hover:text-cyan-300 delay-50">A</span>
        <span class="text-cyan-400/80 transition-all duration-300 hover:text-cyan-300 delay-100">T</span>
        <span class="text-cyan-400/70 transition-all duration-300 hover:text-cyan-300 delay-150">S</span>
        <span class="text-cyan-400/80 transition-all duration-300 hover:text-cyan-300 delay-200">O</span>
        <span class="text-cyan-400/90 transition-all duration-300 hover:text-cyan-300 delay-250">N</span>
      </h1>
    </div>
    <span class="text-xs text-cyan-400 font-mono">[{currentTime}]</span>
  </div>

  <div class="flex items-center gap-4">
    <span class="text-xs text-yellow-300 flex items-center gap-1 animate-pulse">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
      SESSION ONLY
    </span>
    <button class="btn btn-small" on:click={() => fileInput.click()} title="Open project (Ctrl+O)">Open</button>
    <button class="btn btn-small" on:click={saveProject} title="Save project (Ctrl+S)">Save</button>
    <button class="btn btn-small" on:click={openNewBrief} title="Open new brief (Ctrl+N)">New Brief</button>
    <button class="btn btn-primary btn-small" on:click={copyNotes}>Copy Notes</button>
    <button class="w-8 h-8 rounded bg-gray-800/80 backdrop-blur-sm hover:bg-cyan-600/20 border border-cyan-500/50 hover:border-cyan-400 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/30" on:click={toggleAbout} aria-label="About">?</button>
  </div>

  <input bind:this={fileInput} type="file" accept=".wf" on:change={openProject} class="hidden"/>
</header>

{#if showAbout}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" on:click={toggleAbout}>
    <div class="bg-gray-900/95 backdrop-blur-md border border-cyan-400 rounded-lg p-6 max-w-md mx-4 shadow-2xl shadow-cyan-500/30 max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
      <h2 class="text-xl font-bold text-cyan-300 mb-4">ABOUT WATSON</h2>
      <div class="space-y-3 text-sm text-gray-300">
        <p>Watson is a lightweight, tactical intelligence tool. It helps investigators and analysts quickly track entities, map relationships, and build timelines during fast-moving incidents or field operations.</p>
        <div class="bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 p-3 rounded flex gap-2">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
            <p>This application stores data only in your browser session. All information will be lost when you close this tab unless you save your project.</p>
        </div>
        <ul class="list-disc pl-5 space-y-1 text-cyan-100/80 text-xs">
            <li>Take fast, structured intelligence notes for briefs and reports</li>
            <li>Track people, organisations, locations, vehicles, and objects</li>
            <li>Build event timelines and link entities to key moments</li>
            <li>Map relationships to support situational awareness</li>
            <li>Visualise connections and geographic data as you write</li>
            <li>Save and load projects locally (.wf files)</li>
            <li>100% client-side — no data leaves your device</li>
        </ul>
        <p class="text-gray-400 text-xs">
            Watson is fully open source to ensure transparency and trust.
            See the code at <a href="https://github.com/notalex-sh/watson" target="_blank" class="text-cyan-300 underline hover:text-cyan-200">github.com/notalex-sh/watson</a>.
        </p>

        <div class="mt-4 pt-4 border-t border-cyan-600/30">
          <h3 class="text-sm font-medium text-cyan-400 mb-2">Keyboard Shortcuts</h3>
          <ul class="text-xs text-gray-400 space-y-1">
            <li><span class="text-cyan-300 font-mono">Ctrl+N</span> - Open new brief</li>
            <li><span class="text-cyan-300 font-mono">Ctrl+S</span> - Save project</li>
            <li><span class="text-cyan-300 font-mono">Ctrl+O</span> - Open project</li>
            <li><span class="text-cyan-300 font-mono">Ctrl+E</span> - Add entity</li>
            <li><span class="text-cyan-300 font-mono">Ctrl+M</span> - Toggle Map/Timeline Panel</li>
            <li><span class="text-cyan-300 font-mono">/</span> - Quick insert entity or event time</li>
            <li><span class="text-cyan-300 font-mono">/now</span> - Quick insert current time</li>
          </ul>
        </div>
        <p class="text-gray-400 text-xs pt-2">
            Watson was created by
            <a href="https://www.notalex.sh" target="_blank" class="text-cyan-300 underline hover:text-cyan-200">notalex.sh</a>.
        </p>
      </div>
      <button class="btn btn-primary w-full mt-6" on:click={toggleAbout}>Close</button>
    </div>
  </div>
{/if}