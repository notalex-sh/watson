<!--
  Image manager modal for viewing, copying shortcuts, and deleting report images.
-->
<script>
    import { createEventDispatcher } from 'svelte';
    import { images, imageIdCounter, entities } from '$lib/stores';

    const dispatch = createEventDispatcher();

    $: entityImageMap = $entities.reduce((acc, entity) => {
        if (entity.metadata?.imageId) {
            if (!acc[entity.metadata.imageId]) acc[entity.metadata.imageId] = [];
            acc[entity.metadata.imageId].push(entity.content);
        }
        return acc;
    }, {});

    $: imageList = Object.entries($images).map(([id, src]) => ({
        id: parseInt(id),
        src,
        usedBy: entityImageMap[id] || []
    })).sort((a, b) => a.id - b.id);

    function deleteImage(id) {
        if (confirm(`Delete image ${id}? Any references to img:${id} will show as missing.`)) {
            images.update(imgs => {
                const updated = { ...imgs };
                delete updated[id];
                return updated;
            });
        }
    }

    function copyShortcut(id) {
        const shortcut = `![Image ${id}](img:${id})`;
        navigator.clipboard.writeText(shortcut);
        dispatch('notification', { message: 'Shortcut copied!' });
    }

    function copyWithCaption(id) {
        const caption = prompt('Enter caption:') || 'Caption';
        const shortcut = `![${caption}](img:${id} "${caption}")`;
        navigator.clipboard.writeText(shortcut);
        dispatch('notification', { message: 'Shortcut with caption copied!' });
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imageIdCounter.update(n => n + 1);
                const imgId = $imageIdCounter + 1;
                images.update(imgs => ({
                    ...imgs,
                    [imgId]: ev.target.result
                }));
                imageIdCounter.set(imgId);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }
</script>

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-3xl w-full shadow-2xl shadow-cyan-500/30 p-6 relative my-8 max-h-[85vh] overflow-hidden flex flex-col">
        <button
            class="absolute top-3 right-3 z-50 w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all"
            on:click={() => dispatch('close')}
            aria-label="Close modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>

        <h3 class="text-lg font-semibold text-cyan-400 mb-4">Image Manager</h3>

        <div class="toolbar mb-4 flex gap-2">
            <label class="btn btn-primary cursor-pointer">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Upload Image
                <input type="file" accept="image/*" class="hidden" on:change={handleFileUpload} />
            </label>
            <span class="text-gray-500 text-sm flex items-center ml-2">
                {imageList.length} image{imageList.length !== 1 ? 's' : ''} in report
            </span>
        </div>

        <div class="flex-1 overflow-y-auto">
            {#if imageList.length === 0}
                <div class="empty-state">
                    <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <p class="text-gray-500">No images yet</p>
                    <p class="text-gray-600 text-sm mt-1">Paste images in the editor or upload above</p>
                </div>
            {:else}
                <div class="image-grid">
                    {#each imageList as image}
                        <div class="image-card">
                            <div class="image-preview">
                                <img src={image.src} alt="Image {image.id}" />
                            </div>
                            <div class="image-info">
                                <div class="image-meta">
                                    <span class="image-id">img:{image.id}</span>
                                    {#if image.usedBy.length > 0}
                                        <span class="image-source" title={image.usedBy.join(', ')}>
                                            Entity: {image.usedBy[0]}{image.usedBy.length > 1 ? ` +${image.usedBy.length - 1}` : ''}
                                        </span>
                                    {/if}
                                </div>
                                <div class="image-actions">
                                    <button class="action-btn" on:click={() => copyShortcut(image.id)} title="Copy shortcut">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                                        </svg>
                                    </button>
                                    <button class="action-btn" on:click={() => copyWithCaption(image.id)} title="Copy with caption">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                        </svg>
                                    </button>
                                    <button class="action-btn delete" on:click={() => deleteImage(image.id)} title="Delete image">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="mt-4 pt-4 border-t border-gray-800">
            <p class="text-xs text-gray-500">
                Use <code class="bg-gray-800 px-1 rounded">![alt](img:ID)</code> or <code class="bg-gray-800 px-1 rounded">![alt](img:ID "caption")</code> to insert images in your report.
            </p>
        </div>
    </div>
</div>

<style>
    .toolbar {
        display: flex;
        align-items: center;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
        background: #374151;
        color: #e5e7eb;
        border: 1px solid #4b5563;
    }

    .btn:hover {
        background: #4b5563;
    }

    .btn-primary {
        background: #0891b2;
        border-color: #22d3ee;
        color: white;
    }

    .btn-primary:hover {
        background: #0e7490;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
    }

    .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
    }

    .image-card {
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 8px;
        overflow: hidden;
    }

    .image-preview {
        width: 100%;
        height: 140px;
        background: #111827;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .image-preview img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    .image-info {
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .image-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .image-id {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: #22d3ee;
        background: #164e63;
        padding: 2px 8px;
        border-radius: 4px;
    }

    .image-source {
        font-size: 10px;
        color: #a78bfa;
        background: #4c1d95;
        padding: 2px 6px;
        border-radius: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100px;
    }

    .image-actions {
        display: flex;
        gap: 4px;
    }

    .action-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #374151;
        border: 1px solid #4b5563;
        border-radius: 4px;
        color: #9ca3af;
        transition: all 0.15s;
    }

    .action-btn:hover {
        background: #4b5563;
        color: #e5e7eb;
    }

    .action-btn.delete:hover {
        background: #7f1d1d;
        border-color: #ef4444;
        color: #ef4444;
    }
</style>
