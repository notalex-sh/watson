<!--
    Modal dialogs for canvas item editing (notes, images, pins, groups).
-->
<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let showNoteModal = false;
    export let showImageModal = false;
    export let showPinModal = false;
    export let showGroupModal = false;

    export let editingNote = null;
    export let editingImage = null;
    export let editingPin = null;
    export let editingGroup = null;

    export let noteText = '';
    export let noteColor = '#FBBF24';
    export let imageCaption = '';
    export let pinLabel = '';
    export let pinColor = '#EF4444';
    export let groupName = '';
    export let groupColor = '#3B82F6';

    export let getImageSrc = () => null;

    const NOTE_COLORS = [
        '#FBBF24', '#FCD34D', '#A3E635', '#34D399', '#22D3EE',
        '#818CF8', '#F472B6', '#FB923C', '#F87171', '#E5E7EB'
    ];

    const PIN_COLORS = [
        '#EF4444', '#F97316', '#FBBF24', '#22C55E', '#14B8A6',
        '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#1F2937'
    ];

    const GROUP_COLORS = [
        '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
        '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#6366F1'
    ];

    /**
     * Closes the note modal.
     */
    function closeNoteModal() {
        dispatch('closeNote');
    }

    /**
     * Closes the image modal.
     */
    function closeImageModal() {
        dispatch('closeImage');
    }

    /**
     * Closes the pin modal.
     */
    function closePinModal() {
        dispatch('closePin');
    }

    /**
     * Closes the group modal.
     */
    function closeGroupModal() {
        dispatch('closeGroup');
    }

    /**
     * Saves the current note.
     */
    function saveNote() {
        dispatch('saveNote');
    }

    /**
     * Deletes the current note.
     */
    function deleteNote() {
        dispatch('deleteNote', editingNote?.id);
    }

    /**
     * Saves the image caption.
     */
    function saveImageCaption() {
        dispatch('saveImageCaption');
    }

    /**
     * Deletes the current image.
     */
    function deleteImage() {
        dispatch('deleteImage', editingImage?.id);
    }

    /**
     * Handles image file upload.
     */
    function handleImageUpload(e) {
        dispatch('uploadImage', e);
    }

    /**
     * Saves the current pin.
     */
    function savePin() {
        dispatch('savePin');
    }

    /**
     * Deletes the current pin.
     */
    function deletePin() {
        dispatch('deletePin', editingPin?.id);
    }

    /**
     * Saves the current group.
     */
    function saveGroup() {
        dispatch('saveGroup');
    }

    /**
     * Deletes the current group.
     */
    function deleteGroup() {
        dispatch('deleteGroup', editingGroup?.id);
    }

    /**
     * Updates note color selection.
     */
    function selectNoteColor(color) {
        dispatch('updateNoteColor', color);
    }

    /**
     * Updates pin color selection.
     */
    function selectPinColor(color) {
        dispatch('updatePinColor', color);
    }

    /**
     * Updates group color selection.
     */
    function selectGroupColor(color) {
        dispatch('updateGroupColor', color);
    }
</script>

{#if showGroupModal}
    <div class="modal-overlay" on:click={closeGroupModal}>
        <div class="group-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Edit Group</h3>
                <button class="modal-close" on:click={closeGroupModal}>×</button>
            </div>
            <div class="modal-body">
                <label class="modal-label">
                    Group Name
                    <input
                        type="text"
                        class="modal-input"
                        bind:value={groupName}
                        placeholder="Enter group name..."
                        on:keydown={(e) => e.key === 'Enter' && saveGroup()}
                    />
                </label>
                <label class="modal-label">
                    Color
                    <div class="color-picker">
                        {#each GROUP_COLORS as color}
                            <button
                                class="color-option"
                                class:selected={groupColor === color}
                                style="background: {color}"
                                on:click={() => selectGroupColor(color)}
                            ></button>
                        {/each}
                    </div>
                </label>
            </div>
            <div class="modal-footer">
                <button class="modal-btn danger" on:click={() => { deleteGroup(); closeGroupModal(); }}>
                    Delete Group
                </button>
                <button class="modal-btn secondary" on:click={closeGroupModal}>Cancel</button>
                <button class="modal-btn primary" on:click={saveGroup} disabled={!groupName.trim()}>
                    Save
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showNoteModal}
    <div class="modal-overlay" on:click={closeNoteModal}>
        <div class="group-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>{editingNote ? 'Edit Note' : 'Add Sticky Note'}</h3>
                <button class="modal-close" on:click={closeNoteModal}>×</button>
            </div>
            <div class="modal-body">
                <label class="modal-label">
                    Note Text
                    <textarea
                        class="modal-textarea"
                        bind:value={noteText}
                        placeholder="Enter note text..."
                        rows="4"
                    ></textarea>
                </label>
                <label class="modal-label">
                    Color
                    <div class="color-picker">
                        {#each NOTE_COLORS as color}
                            <button
                                class="color-option"
                                class:selected={noteColor === color}
                                style="background: {color}"
                                on:click={() => selectNoteColor(color)}
                            ></button>
                        {/each}
                    </div>
                </label>
            </div>
            <div class="modal-footer">
                {#if editingNote}
                    <button class="modal-btn danger" on:click={() => { deleteNote(); closeNoteModal(); }}>
                        Delete
                    </button>
                {/if}
                <button class="modal-btn secondary" on:click={closeNoteModal}>Cancel</button>
                <button class="modal-btn primary" on:click={saveNote} disabled={!noteText.trim()}>
                    {editingNote ? 'Save' : 'Add'}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showImageModal}
    <div class="modal-overlay" on:click={closeImageModal}>
        <div class="group-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>{editingImage ? 'Edit Caption' : 'Add Image'}</h3>
                <button class="modal-close" on:click={closeImageModal}>×</button>
            </div>
            <div class="modal-body">
                {#if !editingImage}
                    <div class="upload-section">
                        <label class="upload-btn">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                            </svg>
                            Upload Image
                            <input type="file" accept="image/*" class="hidden" on:change={handleImageUpload} />
                        </label>
                        <p class="upload-hint">Or paste an image anywhere on the canvas (Ctrl+V)</p>
                    </div>
                {:else}
                    {#if editingImage}
                        {@const imgSrc = getImageSrc(editingImage)}
                        {#if imgSrc}
                            <div class="image-preview">
                                <img src={imgSrc} alt="Preview" />
                            </div>
                        {/if}
                    {/if}
                {/if}
                <label class="modal-label">
                    Caption (optional)
                    <input
                        type="text"
                        class="modal-input"
                        bind:value={imageCaption}
                        placeholder="Enter caption..."
                    />
                </label>
            </div>
            <div class="modal-footer">
                {#if editingImage}
                    <button class="modal-btn danger" on:click={() => { deleteImage(); closeImageModal(); }}>
                        Delete
                    </button>
                    <button class="modal-btn secondary" on:click={closeImageModal}>Cancel</button>
                    <button class="modal-btn primary" on:click={saveImageCaption}>
                        Save
                    </button>
                {:else}
                    <button class="modal-btn secondary" on:click={closeImageModal}>Cancel</button>
                {/if}
            </div>
        </div>
    </div>
{/if}

{#if showPinModal}
    <div class="modal-overlay" on:click={closePinModal}>
        <div class="group-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>{editingPin ? 'Edit Pin' : 'Add Pin'}</h3>
                <button class="modal-close" on:click={closePinModal}>×</button>
            </div>
            <div class="modal-body">
                <label class="modal-label">
                    Label (optional)
                    <input
                        type="text"
                        class="modal-input"
                        bind:value={pinLabel}
                        placeholder="Enter pin label..."
                    />
                </label>
                <label class="modal-label">
                    Color
                    <div class="color-picker">
                        {#each PIN_COLORS as color}
                            <button
                                class="color-option"
                                class:selected={pinColor === color}
                                style="background: {color}"
                                on:click={() => selectPinColor(color)}
                            ></button>
                        {/each}
                    </div>
                </label>
            </div>
            <div class="modal-footer">
                {#if editingPin}
                    <button class="modal-btn danger" on:click={() => { deletePin(); closePinModal(); }}>
                        Delete
                    </button>
                {/if}
                <button class="modal-btn secondary" on:click={closePinModal}>Cancel</button>
                <button class="modal-btn primary" on:click={savePin}>
                    {editingPin ? 'Save' : 'Add'}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    }

    .group-modal {
        background: #1f2937;
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 12px;
        width: 320px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #374151;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #e5e7eb;
    }

    .modal-close {
        background: none;
        border: none;
        color: #6b7280;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }

    .modal-close:hover {
        color: #e5e7eb;
    }

    .modal-body {
        padding: 20px;
    }

    .modal-label {
        display: block;
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 16px;
    }

    .modal-input {
        display: block;
        width: 100%;
        margin-top: 6px;
        padding: 10px 12px;
        background: #111827;
        border: 1px solid #374151;
        border-radius: 6px;
        color: #e5e7eb;
        font-size: 14px;
    }

    .modal-input:focus {
        outline: none;
        border-color: #22d3ee;
    }

    .modal-textarea {
        display: block;
        width: 100%;
        margin-top: 6px;
        padding: 10px 12px;
        background: #111827;
        border: 1px solid #374151;
        border-radius: 6px;
        color: #e5e7eb;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
        font-family: inherit;
    }

    .modal-textarea:focus {
        outline: none;
        border-color: #22d3ee;
    }

    .image-preview {
        margin-top: 12px;
        border: 1px solid #374151;
        border-radius: 6px;
        overflow: hidden;
        max-height: 200px;
    }

    .image-preview img {
        width: 100%;
        height: auto;
        max-height: 200px;
        object-fit: contain;
        display: block;
    }

    .color-picker {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
    }

    .color-option {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        transition: transform 0.15s, border-color 0.15s;
    }

    .color-option:hover {
        transform: scale(1.1);
    }

    .color-option.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
    }

    .modal-footer {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding: 16px 20px;
        border-top: 1px solid #374151;
    }

    .modal-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: background 0.2s;
    }

    .modal-btn.primary {
        background: #22d3ee;
        color: #0a0f1a;
    }

    .modal-btn.primary:hover:not(:disabled) {
        background: #06b6d4;
    }

    .modal-btn.primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .modal-btn.secondary {
        background: #374151;
        color: #e5e7eb;
    }

    .modal-btn.secondary:hover {
        background: #4b5563;
    }

    .modal-btn.danger {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        margin-right: auto;
    }

    .modal-btn.danger:hover {
        background: rgba(239, 68, 68, 0.3);
    }

    .upload-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        border: 2px dashed #374151;
        border-radius: 8px;
        margin-bottom: 16px;
        background: rgba(17, 24, 39, 0.5);
    }

    .upload-btn {
        display: inline-flex;
        align-items: center;
        padding: 10px 20px;
        background: #0891b2;
        border: 1px solid #22d3ee;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
    }

    .upload-btn:hover {
        background: #0e7490;
    }

    .upload-btn svg {
        width: 20px;
        height: 20px;
        margin-right: 8px;
    }

    .upload-hint {
        margin-top: 12px;
        font-size: 12px;
        color: #6b7280;
    }

    .hidden {
        display: none;
    }
</style>
