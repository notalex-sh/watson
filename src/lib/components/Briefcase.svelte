<!--
  Briefcase properties panel for editing brief title and case number.
-->
<script>
    import { briefTitle, caseNumber } from '$lib/stores';
</script>

<div class="p-5 bg-gray-900/30 h-full">
    <h3 class="text-sm font-medium text-cyan-300 mb-4">Briefcase Properties</h3>
    <div class="space-y-4">
        <div>
            <label for="briefTitle" class="block text-xs font-medium text-gray-400 mb-1">Brief Title</label>
            <input id="briefTitle" type="text" bind:value={$briefTitle} class="input" placeholder="e.g., Operation Nightfall" />
        </div>
        <div>
            <label for="caseNumber" class="block text-xs font-medium text-gray-400 mb-1">Case Number</label>
            <input id="caseNumber" type="text" bind:value={$caseNumber} class="input" placeholder="e.g., 2024-12345" />
        </div>
    </div>
</div>