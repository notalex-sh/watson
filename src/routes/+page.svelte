<script>
    /**
     * Main Watson application page.
     * Displays split view with graph canvas and text editor.
     * Handles entity/link creation with autocomplete.
     */
    import { onMount } from 'svelte';
    import Header from '$lib/components/Header.svelte';
    import GraphCanvas from '$lib/components/GraphCanvas.svelte';
    import MapView from '$lib/components/MapView.svelte';
    import TimelineView from '$lib/components/TimelineView.svelte';
    import IntelView from '$lib/components/IntelView.svelte';
    import AnalysisView from '$lib/components/AnalysisView.svelte';
    import QuickAddModal from '$lib/components/QuickAddModal.svelte';
    import LinkModal from '$lib/components/LinkModal.svelte';
    import ImageManager from '$lib/components/ImageManager.svelte';
    import ResourcesView from '$lib/components/ResourcesView.svelte';
    import { allItems, notes, selectedNodes, nodePositions, entities, entityIdCounter, allLinks, briefTitle, caseNumber, author, quickNotes, LINK_TYPES, selectedLink, links, images, imageIdCounter, classification, eventLinkColors, events, groups, groupIdCounter, canvasNotes, canvasImages, canvasPins, canvasItemIdCounter, canvasState, autoSaveEnabled, resources, resourceIdCounter } from '$lib/stores';
    import { renderMarkdown } from '$lib/markdown.js';
    import { escapeHtml } from '$lib/utils.js';
    import { FILE_VERSION } from '$lib/constants.js';
    import { openPDFExport } from '$lib/utils/pdfTemplate.js';

    let lastSaved = null;
    let autoSaveInterval;
    let hasUnsavedChanges = false;

    /**
     * Saves current project state to localStorage.
     */
    function autoSave() {
        if (!$autoSaveEnabled) return;
        try {
            const projectData = {
                version: FILE_VERSION,
                timestamp: new Date().toISOString(),
                briefTitle: $briefTitle,
                caseNumber: $caseNumber,
                author: $author,
                classification: $classification,
                report: $notes,
                quickNotes: $quickNotes,
                entities: $entities,
                links: $links,
                events: $events,
                nodePositions: $nodePositions,
                images: $images,
                canvasState: $canvasState,
                entityIdCounter: $entityIdCounter,
                imageIdCounter: $imageIdCounter,
                eventLinkColors: $eventLinkColors,
                groups: $groups,
                groupIdCounter: $groupIdCounter,
                canvasNotes: $canvasNotes,
                canvasImages: $canvasImages,
                canvasPins: $canvasPins,
                canvasItemIdCounter: $canvasItemIdCounter,
                resources: $resources,
                resourceIdCounter: $resourceIdCounter
            };
            localStorage.setItem('watson-autosave', JSON.stringify(projectData));
            lastSaved = new Date();
            hasUnsavedChanges = false;
        } catch (e) {
            console.warn('Auto-save failed:', e);
        }
    }

    /**
     * Loads auto-saved project data from localStorage.
     */
    function loadAutoSave() {
        try {
            const saved = localStorage.getItem('watson-autosave');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.entities?.length > 0 || data.report?.length > 0) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('Failed to load auto-save:', e);
        }
        return null;
    }

    /**
     * Clears auto-saved data from localStorage.
     */
    function clearAutoSave() {
        localStorage.removeItem('watson-autosave');
        lastSaved = null;
    }

    let splitPercent = 50;
    let isDragging = false;
    const SNAP_THRESHOLD = 8;
    const SNAP_POINTS = [0, 25, 50, 75, 100];

    let showEntityPicker = false;

    let reportView = 'split';
    let includeDate = true;
    let previewPane;
    let reportTextarea;

    $: renderedHtml = renderMarkdown($notes, $images);

    /**
     * Syncs editor scroll position to preview pane.
     */
    function handleEditorScroll(e) {
        if (!previewPane || reportView !== 'split') return;
        const editor = e.target;
        const scrollPercent = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        previewPane.scrollTop = scrollPercent * (previewPane.scrollHeight - previewPane.clientHeight);
    }

    /**
     * Opens report as PDF in new window using Paged.js.
     */
    function exportPDF() {
        openPDFExport({
            title: $briefTitle,
            caseNumber: $caseNumber,
            author: $author,
            classification: $classification,
            content: renderedHtml,
            includeDate
        });
    }

    let showPropertiesPanel = false;
    let showTimelinePanel = false;
    let showMapPanel = false;
    let showIntelPanel = false;
    let showAnalysisPanel = false;
    let showNotesPanel = false;
    let showResourcesPanel = false;

    let showQuickAddModal = false;
    let showLinkModal = false;
    let showImageManager = false;
    let editingEntity = null;
    let editingLink = null;
    let linkPrefillSource = null;
    let linkPrefillTarget = null;
    let pendingEntityPosition = null;

    $: selectedItem = $selectedNodes.length === 1 ? $allItems.find(i => i.id === $selectedNodes[0]) : null;
    $: entityCount = $allItems.length;
    $: linkCount = $allLinks.length;

    $: wordCount = ($notes || '').trim()
        ? $notes.trim().split(/\s+/).filter(w => w.length > 0).length
        : 0;
    $: charCount = ($notes || '').length;

    $: selectedItemLinks = selectedItem ? $allLinks.filter(l => l.from === selectedItem.id || l.to === selectedItem.id).map(l => {
        const otherId = l.from === selectedItem.id ? l.to : l.from;
        const otherItem = $allItems.find(i => i.id === otherId);
        const direction = l.from === selectedItem.id ? 'outgoing' : 'incoming';
        return { ...l, otherItem, direction };
    }) : [];

    $: selectedLinkDetails = $selectedLink ? (() => {
        const currentLink = $allLinks.find(l =>
            l.from === $selectedLink.from && l.to === $selectedLink.to
        ) || $selectedLink;
        const fromItem = $allItems.find(i => i.id === currentLink.from);
        const toItem = $allItems.find(i => i.id === currentLink.to);
        return { ...currentLink, fromItem, toItem };
    })() : null;

    $: if (!selectedItem && !selectedLinkDetails && showPropertiesPanel) {
        showPropertiesPanel = false;
    }

    function updateLinkColor(linkId, color) {
        if ($selectedLink?.isEventLink) {
            const eventLinkId = `${$selectedLink.from}--${$selectedLink.to}`;
            eventLinkColors.update(colors => ({
                ...colors,
                [eventLinkId]: color
            }));
        } else {
            links.update(l => l.map(link =>
                (link.from === $selectedLink.from && link.to === $selectedLink.to)
                    ? { ...link, customColor: color }
                    : link
            ));
        }
    }

    function clearLinkColor() {
        if ($selectedLink?.isEventLink) {
            const eventLinkId = `${$selectedLink.from}--${$selectedLink.to}`;
            eventLinkColors.update(colors => {
                const newColors = { ...colors };
                delete newColors[eventLinkId];
                return newColors;
            });
        } else {
            links.update(l => l.map(link =>
                (link.from === $selectedLink.from && link.to === $selectedLink.to)
                    ? { ...link, customColor: null }
                    : link
            ));
        }
    }

    function getSnappedValue(percent) {
        for (const point of SNAP_POINTS) {
            if (Math.abs(percent - point) <= SNAP_THRESHOLD) {
                return point;
            }
        }
        return percent;
    }
    $: effectiveSplit = getSnappedValue(splitPercent);
    $: graphVisible = effectiveSplit > 0;
    $: reportVisible = effectiveSplit < 100;

    let mentionType = '';
    let mentionSearch = '';
    let mentionSuggestions = [];
    let mentionIndex = 0;
    let mentionPosition = 0;

    let notesTextarea;
    let notesMentionSearch = '';
    let notesMentionSuggestions = [];
    let notesMentionIndex = 0;
    let notesMentionPosition = 0;
    let showNotesMention = false;

    function insertAtCursor(text) {
        if (!reportTextarea) return;
        const start = reportTextarea.selectionStart;
        const end = reportTextarea.selectionEnd;
        const before = $notes.substring(0, start);
        const after = $notes.substring(end);
        notes.set(before + text + after);
        setTimeout(() => {
            reportTextarea.selectionStart = reportTextarea.selectionEnd = start + text.length;
            reportTextarea.focus();
        }, 0);
    }

    let showMarkdownDropdown = false;

    const markdownItems = [
        { label: 'Heading 1', prefix: '# ', suffix: '', placeholder: 'Heading', icon: 'H1' },
        { label: 'Heading 2', prefix: '## ', suffix: '', placeholder: 'Heading', icon: 'H2' },
        { label: 'Heading 3', prefix: '### ', suffix: '', placeholder: 'Heading', icon: 'H3' },
        { type: 'divider' },
        { label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text', icon: 'B' },
        { label: 'Italic', prefix: '*', suffix: '*', placeholder: 'italic text', icon: 'I' },
        { label: 'Strikethrough', prefix: '~~', suffix: '~~', placeholder: 'strikethrough', icon: 'S' },
        { type: 'divider' },
        { label: 'Bullet List', prefix: '- ', suffix: '', placeholder: 'list item', icon: '•' },
        { label: 'Numbered List', prefix: '1. ', suffix: '', placeholder: 'list item', icon: '1.' },
        { label: 'Checkbox', prefix: '- [ ] ', suffix: '', placeholder: 'task', icon: '☐' },
        { type: 'divider' },
        { label: 'Quote', prefix: '> ', suffix: '', placeholder: 'quote', icon: '"' },
        { label: 'Code', prefix: '`', suffix: '`', placeholder: 'code', icon: '</>' },
        { label: 'Code Block', prefix: '```\n', suffix: '\n```', placeholder: 'code block', icon: '{ }' },
        { type: 'divider' },
        { label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text', icon: '🔗' },
        { label: 'Image', prefix: '![', suffix: '](img:1)', placeholder: 'alt text', icon: '🖼' },
        { label: 'Table', prefix: '', suffix: '', template: '| Header | Header |\n|---|---|\n| Cell | Cell |', icon: '▦' },
        { label: 'Horizontal Rule', prefix: '', suffix: '', template: '\n---\n', icon: '—' },
        { label: 'Page Break', prefix: '', suffix: '', template: '\n---PAGEBREAK---\n', icon: '⊟' },
        { type: 'divider' },
        { label: 'Cover Page', prefix: '', suffix: '', action: 'coverPage', icon: '📄' },
        { label: 'Table of Contents', prefix: '', suffix: '', action: 'toc', icon: '📑' },
    ];

    function generateCoverPage() {
        const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        return `**Case Number:** ${$caseNumber || 'N/A'}

**Author:** ${$author || 'N/A'}

**Classification:** ${$classification}

**Date:** ${date}

---

---PAGEBREAK---

`;
    }

    function generateTableOfContents() {
        const headings = $notes.match(/^#{1,3}\s+.+$/gm) || [];
        if (headings.length === 0) {
            return '## Table of Contents\n\n*No headings found in the report.*\n\n---PAGEBREAK---\n\n';
        }

        let toc = '## Table of Contents\n\n';
        headings.forEach(heading => {
            const level = (heading.match(/^#+/) || [''])[0].length;
            const text = heading.replace(/^#+\s+/, '');
            const indent = '  '.repeat(level - 1);
            toc += `${indent}- ${text}\n`;
        });
        toc += '\n---PAGEBREAK---\n\n';
        return toc;
    }

    function insertMarkdown(item) {
        if (!reportTextarea) return;

        if (item.action === 'coverPage') {
            const coverPage = generateCoverPage();
            notes.set(coverPage + $notes);
            showMarkdownDropdown = false;
            return;
        }

        if (item.action === 'toc') {
            const toc = generateTableOfContents();
            const coverMatch = $notes.match(/^#\s+.+\n\n---[\s\S]*?---PAGEBREAK---\n\n/);
            if (coverMatch) {
                const afterCover = $notes.substring(coverMatch[0].length);
                notes.set(coverMatch[0] + toc + afterCover);
            } else {
                notes.set(toc + $notes);
            }
            showMarkdownDropdown = false;
            return;
        }

        const start = reportTextarea.selectionStart;
        const end = reportTextarea.selectionEnd;
        const selectedText = $notes.substring(start, end);
        const before = $notes.substring(0, start);
        const after = $notes.substring(end);

        let newText, cursorPos;

        if (item.template) {
            newText = before + item.template + after;
            cursorPos = start + item.template.length;
        } else if (selectedText) {
            newText = before + item.prefix + selectedText + item.suffix + after;
            cursorPos = start + item.prefix.length + selectedText.length + item.suffix.length;
        } else {
            const placeholder = item.placeholder || '';
            newText = before + item.prefix + placeholder + item.suffix + after;
            cursorPos = start + item.prefix.length;
            setTimeout(() => {
                reportTextarea.selectionStart = cursorPos;
                reportTextarea.selectionEnd = cursorPos + placeholder.length;
                reportTextarea.focus();
            }, 0);
            notes.set(newText);
            showMarkdownDropdown = false;
            return;
        }

        notes.set(newText);
        setTimeout(() => {
            reportTextarea.selectionStart = reportTextarea.selectionEnd = cursorPos;
            reportTextarea.focus();
        }, 0);
        showMarkdownDropdown = false;
    }

    function insertEntity(entity) {
        insertAtCursor(entity.content);
        showEntityPicker = false;
    }

    function handleReportInput(e) {
        const textarea = e.target;
        const start = textarea.selectionStart;
        const textBefore = $notes.substring(0, start);

        const lastAtPos = textBefore.lastIndexOf('@');
        const lastHashPos = textBefore.lastIndexOf('#');
        const lastSpacePos = Math.max(textBefore.lastIndexOf(' '), textBefore.lastIndexOf('\n'));

        if (lastAtPos > lastSpacePos && lastAtPos >= 0) {
            mentionType = '@';
            mentionPosition = lastAtPos;
            mentionSearch = textBefore.substring(lastAtPos + 1);
            mentionSuggestions = getMentionSuggestions();
            mentionIndex = 0;
        } else if (lastHashPos > lastSpacePos && lastHashPos >= 0) {
            mentionType = '#';
            mentionPosition = lastHashPos;
            mentionSearch = textBefore.substring(lastHashPos + 1);
            mentionSuggestions = getMentionSuggestions();
            mentionIndex = 0;
        } else {
            mentionType = '';
            mentionSuggestions = [];
        }
    }

    function getMentionSuggestions() {
        const search = mentionSearch.toLowerCase();
        if (mentionType === '@') {
            return $allItems.filter(item =>
                (item.content || item.title || '').toLowerCase().includes(search)
            ).slice(0, 8);
        }
        if (mentionType === '#') {
            return $allItems.filter(item => item.itemType === 'event')
                .filter(item => (item.title || item.content || '').toLowerCase().includes(search))
                .slice(0, 8);
        }
        return [];
    }

    const PAIRS = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`'
    };

    function handleReportPaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const newId = $imageIdCounter + 1;
                    imageIdCounter.set(newId);
                    images.update(imgs => ({
                        ...imgs,
                        [newId]: ev.target.result
                    }));
                    insertAtCursor(`![Image ${newId}](img:${newId})`);
                };
                reader.readAsDataURL(file);
                return;
            }
        }
    }

    function handleReportKeydown(e) {
        if (mentionType && mentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                mentionIndex = (mentionIndex + 1) % mentionSuggestions.length;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                mentionIndex = (mentionIndex - 1 + mentionSuggestions.length) % mentionSuggestions.length;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (mentionSuggestions[mentionIndex]) {
                    e.preventDefault();
                    insertMention(mentionSuggestions[mentionIndex]);
                }
            } else if (e.key === 'Escape') {
                mentionType = '';
                mentionSuggestions = [];
            }
            return;
        }

        if (PAIRS[e.key]) {
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = $notes.substring(start, end);

            if (selectedText) {
                e.preventDefault();
                const wrapped = e.key + selectedText + PAIRS[e.key];
                const before = $notes.substring(0, start);
                const after = $notes.substring(end);
                notes.set(before + wrapped + after);
                setTimeout(() => {
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = end + 1;
                }, 0);
            } else {
                e.preventDefault();
                const before = $notes.substring(0, start);
                const after = $notes.substring(end);
                notes.set(before + e.key + PAIRS[e.key] + after);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                }, 0);
            }
            return;
        }

        const closingChars = Object.values(PAIRS);
        if (closingChars.includes(e.key)) {
            const textarea = e.target;
            const start = textarea.selectionStart;
            const charAfter = $notes[start];
            if (charAfter === e.key) {
                e.preventDefault();
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            }
        }

        if (e.key === 'Backspace') {
            const textarea = e.target;
            const start = textarea.selectionStart;
            const charBefore = $notes[start - 1];
            const charAfter = $notes[start];
            if (PAIRS[charBefore] === charAfter) {
                e.preventDefault();
                const before = $notes.substring(0, start - 1);
                const after = $notes.substring(start + 1);
                notes.set(before + after);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start - 1;
                }, 0);
            }
        }
    }

    function insertMention(item) {
        const content = item.content || item.title;
        const before = $notes.substring(0, mentionPosition);
        const afterCursor = reportTextarea?.selectionStart || (mentionPosition + mentionSearch.length + 1);
        const after = $notes.substring(afterCursor);

        notes.set(before + content + ' ' + after);

        mentionType = '';
        mentionSuggestions = [];

        setTimeout(() => {
            if (reportTextarea) {
                const newPos = mentionPosition + content.length + 1;
                reportTextarea.selectionStart = reportTextarea.selectionEnd = newPos;
                reportTextarea.focus();
            }
        }, 0);
    }

    function handleNotesInput(e) {
        const textarea = e.target;
        const start = textarea.selectionStart;
        const textBefore = $quickNotes.substring(0, start);

        const lastAtPos = textBefore.lastIndexOf('@');
        const lastSpacePos = Math.max(textBefore.lastIndexOf(' '), textBefore.lastIndexOf('\n'));

        if (lastAtPos > lastSpacePos && lastAtPos >= 0) {
            notesMentionPosition = lastAtPos;
            notesMentionSearch = textBefore.substring(lastAtPos + 1).toLowerCase();
            notesMentionSuggestions = $allItems.filter(item =>
                (item.content || item.title || '').toLowerCase().includes(notesMentionSearch)
            ).slice(0, 8);
            notesMentionIndex = 0;
            showNotesMention = notesMentionSuggestions.length > 0;
        } else {
            showNotesMention = false;
            notesMentionSuggestions = [];
        }
    }

    function handleNotesKeydown(e) {
        if (showNotesMention && notesMentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                notesMentionIndex = (notesMentionIndex + 1) % notesMentionSuggestions.length;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                notesMentionIndex = (notesMentionIndex - 1 + notesMentionSuggestions.length) % notesMentionSuggestions.length;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (notesMentionSuggestions[notesMentionIndex]) {
                    e.preventDefault();
                    insertNotesMention(notesMentionSuggestions[notesMentionIndex]);
                }
            } else if (e.key === 'Escape') {
                showNotesMention = false;
                notesMentionSuggestions = [];
            }
        }
    }

    function insertNotesMention(item) {
        const content = item.content || item.title;
        const before = $quickNotes.substring(0, notesMentionPosition);
        const afterCursor = notesTextarea?.selectionStart || (notesMentionPosition + notesMentionSearch.length + 1);
        const after = $quickNotes.substring(afterCursor);

        quickNotes.set(before + content + ' ' + after);
        showNotesMention = false;
        notesMentionSuggestions = [];

        setTimeout(() => {
            if (notesTextarea) {
                const newPos = notesMentionPosition + content.length + 1;
                notesTextarea.selectionStart = notesTextarea.selectionEnd = newPos;
                notesTextarea.focus();
            }
        }, 0);
    }

    function startDrag(e) {
        isDragging = true;
        e.preventDefault();
    }

    function onDrag(e) {
        if (!isDragging) return;
        const container = document.querySelector('.split-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        splitPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));
    }

    function stopDrag() {
        isDragging = false;
    }

    function handleAddEntity(e) {
        pendingEntityPosition = { x: e.detail.x, y: e.detail.y };
        if (e.detail.prefill) {
            editingEntity = { _isNew: true, ...e.detail.prefill };
        } else {
            editingEntity = { _isNew: true };
        }
        showQuickAddModal = true;
    }

    function handleEditEntity(e) {
        editingEntity = e.detail;
        showQuickAddModal = true;
    }

    function handleModalClose() {
        showQuickAddModal = false;
        editingEntity = null;
        pendingEntityPosition = null;
    }

    function handleAddLink(e) {
        linkPrefillSource = e.detail.sourceId || null;
        linkPrefillTarget = e.detail.targetId || null;
        editingLink = null;
        showLinkModal = true;
    }

    function handleEditLink(e) {
        editingLink = e.detail;
        linkPrefillSource = null;
        linkPrefillTarget = null;
        showLinkModal = true;
    }

    function handleLinkModalClose() {
        showLinkModal = false;
        editingLink = null;
        linkPrefillSource = null;
        linkPrefillTarget = null;
    }

    function handleSearchSelect(e) {
        const item = e.detail;
        if (item?.id) {
            selectedNodes.set([item.id]);
            showPropertiesPanel = true;
        }
    }

    function handleNodeSelect(e) {
        const nodeId = e.detail?.id;
        if (nodeId) {
            selectedNodes.set([nodeId]);
            showPropertiesPanel = true;
        }
    }

    function handleLinkSelect(e) {
        showPropertiesPanel = true;
    }

    let activeFilters = { types: [], hasConnections: false };
    function handleFilterChange(e) {
        activeFilters = e.detail;
    }


    function openQuickAdd() {
        editingEntity = { _isNew: true };
        pendingEntityPosition = null;
        showQuickAddModal = true;
    }

    onMount(() => {
        try {
            const savedSetting = localStorage.getItem('watson-autosave-enabled');
            if (savedSetting !== null) {
                autoSaveEnabled.set(JSON.parse(savedSetting));
            }
        } catch (e) {
            console.warn('Failed to load auto-save setting:', e);
        }

        const savedData = loadAutoSave();
        if (savedData && $entities.length === 0 && !$notes) {
            const restore = confirm('Found auto-saved work. Would you like to restore it?');
            if (restore) {
                briefTitle.set(savedData.briefTitle || 'New Brief');
                caseNumber.set(savedData.caseNumber || '');
                author.set(savedData.author || '');
                classification.set(savedData.classification || 'UNCLASSIFIED');
                notes.set(savedData.report || '');
                quickNotes.set(savedData.quickNotes || '');
                entities.set(savedData.entities || []);
                links.set(savedData.links || []);
                events.set(savedData.events || []);
                nodePositions.set(savedData.nodePositions || {});
                images.set(savedData.images || {});
                canvasState.set(savedData.canvasState || { zoom: 1, panX: 0, panY: 0 });
                entityIdCounter.set(savedData.entityIdCounter || 0);
                imageIdCounter.set(savedData.imageIdCounter || 0);
                eventLinkColors.set(savedData.eventLinkColors || {});
                groups.set(savedData.groups || []);
                groupIdCounter.set(savedData.groupIdCounter || 0);
                canvasNotes.set(savedData.canvasNotes || []);
                canvasImages.set(savedData.canvasImages || []);
                canvasPins.set(savedData.canvasPins || []);
                canvasItemIdCounter.set(savedData.canvasItemIdCounter || 0);
                resources.set(savedData.resources || []);
                resourceIdCounter.set(savedData.resourceIdCounter || 0);
                lastSaved = new Date(savedData.timestamp);
            }
        }

        autoSaveInterval = setInterval(() => {
            if ($autoSaveEnabled && ($entities.length > 0 || $notes.length > 0)) {
                autoSave();
            }
        }, 30000);

        function handleKeydown(e) {
            if (e.shiftKey && e.key === 'Tab') {
                e.preventDefault();
                openQuickAdd();
                return;
            }

            if (e.key === 'Escape') {
                showQuickAddModal = false;
                showLinkModal = false;
                showPropertiesPanel = false;
                showTimelinePanel = false;
                showMapPanel = false;
                showIntelPanel = false;
                showAnalysisPanel = false;
                showNotesPanel = false;
                showResourcesPanel = false;
                showEntityPicker = false;
                editingEntity = null;
                editingLink = null;
            }
        }

        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            clearInterval(autoSaveInterval);
        };
    });
</script>

<svelte:window on:mousemove={onDrag} on:mouseup={stopDrag} />

<Header on:selectEntity={handleSearchSelect} on:filterChange={handleFilterChange} />

<div class="split-container">
    {#if graphVisible}
        <div class="graph-section" style="height: {effectiveSplit}%">
            <GraphCanvas
                on:addEntity={handleAddEntity}
                on:editEntity={handleEditEntity}
                on:addLink={handleAddLink}
                on:editLink={handleEditLink}
                on:nodeSelect={handleNodeSelect}
                on:linkSelect={handleLinkSelect}
            />
        </div>
    {/if}

    <div
        class="split-handle"
        on:mousedown={startDrag}
        role="separator"
        class:dragging={isDragging}
        class:at-edge={effectiveSplit === 0 || effectiveSplit === 100}
    >
        <div class="handle-grip"></div>
    </div>

    {#if reportVisible}
        <div class="report-section" style="height: {100 - effectiveSplit}%">
            <div class="report-header">
                <div class="report-meta">
                    <input type="text" bind:value={$briefTitle} placeholder="Brief Title" class="meta-input meta-title" />
                    <input type="text" bind:value={$caseNumber} placeholder="Case #" class="meta-input meta-case" />
                    <input type="text" bind:value={$author} placeholder="Author" class="meta-input meta-author" />
                    <input type="text" bind:value={$classification} placeholder="Classification" class="meta-input meta-class" />
                </div>

                <div class="report-toolbar">
                    <div class="toolbar-left">
                        <div class="view-toggle">
                            <button class="view-btn" class:active={reportView === 'editor'} on:click={() => reportView = 'editor'} title="Editor only">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="view-btn" class:active={reportView === 'split'} on:click={() => reportView = 'split'} title="Split view">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="18" rx="1" stroke-width="2"/>
                                    <rect x="14" y="3" width="7" height="18" rx="1" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="view-btn" class:active={reportView === 'preview'} on:click={() => reportView = 'preview'} title="Preview only">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </button>
                        </div>

                        <div class="toolbar-divider"></div>

                        <div class="markdown-dropdown-wrapper">
                            <button class="toolbar-btn" on:click={() => showMarkdownDropdown = !showMarkdownDropdown} title="Insert formatting">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"/>
                                </svg>
                                Format
                                <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            {#if showMarkdownDropdown}
                                <div class="markdown-dropdown">
                                    {#each markdownItems as item}
                                        {#if item.type === 'divider'}
                                            <div class="dropdown-divider"></div>
                                        {:else}
                                            <button class="md-dropdown-item" on:click={() => insertMarkdown(item)}>
                                                <span class="md-icon">{item.icon}</span>
                                                <span class="md-label">{item.label}</span>
                                            </button>
                                        {/if}
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <div class="entity-picker-wrapper">
                            <button class="toolbar-btn" on:click={() => showEntityPicker = !showEntityPicker} title="Insert entity reference">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            </button>
                            {#if showEntityPicker}
                                <div class="entity-dropdown">
                                    <div class="dropdown-header">Insert Entity</div>
                                    <div class="dropdown-list">
                                        {#each $allItems as item}
                                            <button class="dropdown-item" on:click={() => insertEntity(item)}>
                                                <span class="item-type">{item.type}</span>
                                                <span class="item-name">{item.content}</span>
                                            </button>
                                        {/each}
                                        {#if $allItems.length === 0}
                                            <div class="dropdown-empty">No entities yet</div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                        <button class="toolbar-btn" on:click={() => showImageManager = true} title="Manage images">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        </button>

                        <div class="toolbar-divider"></div>

                        <button class="export-btn" on:click={exportPDF}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Export
                        </button>
                        <label class="date-toggle">
                            <input type="checkbox" bind:checked={includeDate} />
                            <span>Date</span>
                        </label>
                    </div>

                    <div class="toolbar-right">
                        <span class="toolbar-stats">{wordCount} words • {entityCount} entities • {linkCount} links</span>
                    </div>
                </div>
            </div>

            <div class="report-content" class:split-view={reportView === 'split'}>
                {#if reportView === 'editor' || reportView === 'split'}
                    <div class="editor-pane" class:full-width={reportView === 'editor'}>
                        <div class="editor-wrapper">
                            <textarea
                                bind:this={reportTextarea}
                                bind:value={$notes}
                                on:input={handleReportInput}
                                on:keydown={handleReportKeydown}
                                on:paste={handleReportPaste}
                                on:scroll={handleEditorScroll}
                                placeholder="Begin writing your intelligence report...

Use the Format toolbar above to insert headings, lists, and other elements. Reference entities with @ and events with #.

Tip: Paste images directly into the editor."
                                class="report-editor"
                            ></textarea>

                            {#if mentionType && mentionSuggestions.length > 0}
                                <div class="autocomplete-dropdown">
                                    <div class="ac-header">{mentionType === '@' ? 'Entities' : 'Events'}</div>
                                    {#each mentionSuggestions as suggestion, i}
                                        <button
                                            class="ac-item"
                                            class:selected={i === mentionIndex}
                                            on:click={() => insertMention(suggestion)}
                                        >
                                            <span class="ac-type">{suggestion.type || 'event'}</span>
                                            <span class="ac-name">{suggestion.content || suggestion.title}</span>
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                {#if reportView === 'preview' || reportView === 'split'}
                    <div class="preview-pane" class:full-width={reportView === 'preview'}>
                        <div class="preview-wrapper" bind:this={previewPane}>
                            <div class="preview-page">
                                <header class="preview-header">
                                    <div class="preview-header-left">
                                        <div class="preview-title">{$briefTitle || 'Untitled Report'}</div>
                                        {#if $caseNumber}
                                            <div class="preview-case">Case: {$caseNumber}</div>
                                        {/if}
                                    </div>
                                    <div class="preview-header-right">
                                        {#if $author}
                                            <div class="preview-author">{$author}</div>
                                        {/if}
                                        {#if $classification}
                                            <div class="preview-classification">{$classification}</div>
                                        {/if}
                                    </div>
                                </header>
                                <main class="preview-content">
                                    {#if renderedHtml}
                                        {@html renderedHtml}
                                    {:else}
                                        <p class="preview-empty">Start typing to see preview...</p>
                                    {/if}
                                </main>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="markdown-hints-bar">
                <span class="hint-item"><code>#</code> <code>##</code> <code>###</code> headings</span>
                <span class="hint-item"><code>**bold**</code></span>
                <span class="hint-item"><code>*italic*</code></span>
                <span class="hint-item"><code>- list</code></span>
                <span class="hint-item"><code>1. numbered</code></span>
                <span class="hint-item"><code>> quote</code></span>
                <span class="hint-item"><code>`code`</code></span>
                <span class="hint-item"><code>```block```</code></span>
                <span class="hint-item"><code>| table |</code></span>
                <span class="hint-item"><code>![](img:1)</code> image</span>
                <span class="hint-item"><code>@</code> entity</span>
                <span class="hint-item"><code>---PAGEBREAK---</code></span>
                <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener noreferrer" class="markdown-guide-link">Full Guide ↗</a>
            </div>
        </div>
    {/if}
</div>

<div class="aux-buttons">
    <button class="aux-btn" class:active={showPropertiesPanel} on:click={() => showPropertiesPanel = !showPropertiesPanel} title="Properties">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
    </button>
    <button class="aux-btn" class:active={showTimelinePanel} on:click={() => showTimelinePanel = !showTimelinePanel} title="Timeline">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
    </button>
    <button class="aux-btn" class:active={showMapPanel} on:click={() => showMapPanel = !showMapPanel} title="Map">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
    </button>
    <button class="aux-btn" class:active={showIntelPanel} on:click={() => showIntelPanel = !showIntelPanel} title="Intel">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
    </button>
    <button class="aux-btn" class:active={showAnalysisPanel} on:click={() => showAnalysisPanel = !showAnalysisPanel} title="Analysis">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
    </button>
    <button class="aux-btn" class:active={showNotesPanel} on:click={() => showNotesPanel = !showNotesPanel} title="Quick Notes">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
    </button>
    <button class="aux-btn" class:active={showResourcesPanel} on:click={() => showResourcesPanel = !showResourcesPanel} title="Resources">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
    </button>
</div>

{#if showPropertiesPanel}
    <div class="overlay-panel right">
        <div class="overlay-header">
            <span>Properties</span>
            <button class="close-btn" on:click={() => showPropertiesPanel = false}>×</button>
        </div>
        <div class="overlay-content">
            {#if selectedLinkDetails}
                <div class="prop-type-badge link-badge" style="background: {selectedLinkDetails.customColor || LINK_TYPES[selectedLinkDetails.type]?.color || '#6B7280'}20; color: {selectedLinkDetails.customColor || LINK_TYPES[selectedLinkDetails.type]?.color || '#6B7280'}">
                    Connection
                </div>
                <h3 class="prop-name">{selectedLinkDetails.label || 'Link'}</h3>

                <div class="prop-field">
                    <label>Between</label>
                    <div class="link-between">
                        <span class="link-entity">{selectedLinkDetails.fromItem?.content || 'Unknown'}</span>
                        <span class="link-arrow">↔</span>
                        <span class="link-entity">{selectedLinkDetails.toItem?.content || 'Unknown'}</span>
                    </div>
                </div>

                <div class="prop-field">
                    <label>Type</label>
                    <p>{LINK_TYPES[selectedLinkDetails.type]?.label || selectedLinkDetails.type}</p>
                </div>

                <div class="prop-field">
                    <label>Highlight Color</label>
                    <div class="color-picker">
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#EF4444'} style="background: #EF4444" on:click={() => updateLinkColor(null, '#EF4444')} title="Red"></button>
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#F97316'} style="background: #F97316" on:click={() => updateLinkColor(null, '#F97316')} title="Orange"></button>
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#EAB308'} style="background: #EAB308" on:click={() => updateLinkColor(null, '#EAB308')} title="Yellow"></button>
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#22C55E'} style="background: #22C55E" on:click={() => updateLinkColor(null, '#22C55E')} title="Green"></button>
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#06B6D4'} style="background: #06B6D4" on:click={() => updateLinkColor(null, '#06B6D4')} title="Cyan"></button>
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#8B5CF6'} style="background: #8B5CF6" on:click={() => updateLinkColor(null, '#8B5CF6')} title="Purple"></button>
                        <button class="color-btn" class:active={selectedLinkDetails.customColor === '#EC4899'} style="background: #EC4899" on:click={() => updateLinkColor(null, '#EC4899')} title="Pink"></button>
                        {#if selectedLinkDetails.customColor}
                            <button class="color-btn clear-color" on:click={clearLinkColor} title="Clear">×</button>
                        {/if}
                    </div>
                    <p class="color-hint">Highlight important connections</p>
                </div>

                <button class="prop-edit-btn" on:click={() => { editingLink = selectedLinkDetails; showLinkModal = true; }}>
                    Edit Connection
                </button>
            {:else if selectedItem}
                <div class="prop-type-badge">{selectedItem.type}</div>
                <h3 class="prop-name">{selectedItem.content}</h3>
                <div class="prop-field">
                    <label>Description</label>
                    <p>{selectedItem.description || 'No description'}</p>
                </div>
                {#if selectedItem.metadata?.plate}
                    <div class="prop-field">
                        <label>License Plate</label>
                        <p>{selectedItem.metadata.plate}</p>
                    </div>
                {/if}
                {#if selectedItem.metadata?.lat}
                    <div class="prop-field">
                        <label>Coordinates</label>
                        <p>{selectedItem.metadata.lat.toFixed(6)}, {selectedItem.metadata.lng.toFixed(6)}</p>
                    </div>
                {/if}
                {#if selectedItem.metadata?.imageId && $images[selectedItem.metadata.imageId]}
                    <div class="prop-field">
                        <label>Image</label>
                        <img src={$images[selectedItem.metadata.imageId]} alt="Attached" class="prop-image" />
                    </div>
                {/if}

                {#if selectedItemLinks.length > 0}
                    <div class="prop-field">
                        <label>Connections ({selectedItemLinks.length})</label>
                        <div class="prop-links">
                            {#each selectedItemLinks as link}
                                <div class="prop-link" style="border-left-color: {link.customColor || LINK_TYPES[link.type]?.color || '#6B7280'}">
                                    <span class="link-direction">{link.direction === 'outgoing' ? '→' : '←'}</span>
                                    <span class="link-label" style="color: {link.customColor || LINK_TYPES[link.type]?.color || '#6B7280'}">{link.label}</span>
                                    <span class="link-target">{link.otherItem?.content || 'Unknown'}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if selectedItem.itemType !== 'event'}
                    <button class="prop-edit-btn" on:click={() => { editingEntity = selectedItem; showQuickAddModal = true; }}>
                        Edit Entity
                    </button>
                {/if}
            {:else}
                <p class="no-selection-msg">Select an entity or connection on the graph</p>
            {/if}
        </div>
    </div>
{/if}

{#if showTimelinePanel}
    <div class="overlay-panel right large">
        <div class="overlay-header">
            <span>Timeline</span>
            <button class="close-btn" on:click={() => showTimelinePanel = false}>×</button>
        </div>
        <div class="overlay-content">
            <TimelineView />
        </div>
    </div>
{/if}

{#if showMapPanel}
    <div class="overlay-panel right large">
        <div class="overlay-header">
            <span>Map</span>
            <button class="close-btn" on:click={() => showMapPanel = false}>×</button>
        </div>
        <div class="overlay-content">
            <MapView />
        </div>
    </div>
{/if}

{#if showIntelPanel}
    <div class="overlay-panel right large">
        <div class="overlay-header">
            <span>Intel</span>
            <button class="close-btn" on:click={() => showIntelPanel = false}>×</button>
        </div>
        <div class="overlay-content">
            <IntelView />
        </div>
    </div>
{/if}

{#if showAnalysisPanel}
    <div class="overlay-panel right large">
        <div class="overlay-header">
            <span>Analysis</span>
            <button class="close-btn" on:click={() => showAnalysisPanel = false}>×</button>
        </div>
        <div class="overlay-content">
            <AnalysisView />
        </div>
    </div>
{/if}

{#if showNotesPanel}
    <div class="overlay-panel right">
        <div class="overlay-header">
            <span>Quick Notes</span>
            <button class="close-btn" on:click={() => showNotesPanel = false}>×</button>
        </div>
        <div class="overlay-content notes-panel">
            <div class="notes-textarea-wrapper">
                <textarea
                    bind:this={notesTextarea}
                    bind:value={$quickNotes}
                    on:input={handleNotesInput}
                    on:keydown={handleNotesKeydown}
                    placeholder="Jot down quick notes, tasks, reminders..."
                    class="quick-notes-textarea"
                ></textarea>
                {#if showNotesMention && notesMentionSuggestions.length > 0}
                    <div class="notes-autocomplete">
                        <div class="ac-header">Entities</div>
                        {#each notesMentionSuggestions as suggestion, i}
                            <button
                                class="ac-item"
                                class:selected={i === notesMentionIndex}
                                on:click={() => insertNotesMention(suggestion)}
                            >
                                <span class="ac-type">{suggestion.type || 'item'}</span>
                                <span class="ac-name">{suggestion.content || suggestion.title}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
            <div class="notes-hint">
                <span>Type <code>@</code> to mention entities</span>
            </div>
        </div>
    </div>
{/if}

{#if showResourcesPanel}
    <div class="overlay-panel right">
        <div class="overlay-header">
            <span>Resources</span>
            <button class="close-btn" on:click={() => showResourcesPanel = false}>×</button>
        </div>
        <div class="overlay-content">
            <ResourcesView />
        </div>
    </div>
{/if}

{#if showQuickAddModal}
    <QuickAddModal
        editingEntity={editingEntity?._isNew ? null : editingEntity}
        pendingPosition={editingEntity?._isNew ? pendingEntityPosition : null}
        on:close={handleModalClose}
    />
{/if}

{#if showLinkModal}
    <LinkModal
        editingLink={editingLink}
        prefillSource={linkPrefillSource}
        prefillTarget={linkPrefillTarget}
        on:close={handleLinkModalClose}
        on:saved={handleLinkModalClose}
    />
{/if}

{#if showImageManager}
    <ImageManager on:close={() => showImageManager = false} />
{/if}

<div class="mobile-warning">
    <div class="mobile-warning-content">
        <svg class="mobile-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        <h2>Desktop Required</h2>
        <p>Watson is designed for desktop use and requires a larger screen for the best experience.</p>
        <p class="mobile-warning-hint">Please access this application from a computer with a screen width of at least 1024px.</p>
    </div>
</div>

<style>
    /* Mobile Warning - shown on small screens */
    .mobile-warning {
        display: none;
        position: fixed;
        inset: 0;
        background: #0a0f1a;
        z-index: 99999;
        justify-content: center;
        align-items: center;
        padding: 24px;
    }

    .mobile-warning-content {
        text-align: center;
        max-width: 400px;
    }

    .mobile-warning-icon {
        width: 64px;
        height: 64px;
        color: #22d3ee;
        margin-bottom: 24px;
    }

    .mobile-warning h2 {
        font-size: 24px;
        font-weight: 700;
        color: #22d3ee;
        margin-bottom: 16px;
    }

    .mobile-warning p {
        color: #9ca3af;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 12px;
    }

    .mobile-warning-hint {
        color: #6b7280;
        font-size: 12px;
    }

    /* Show warning and hide content on small screens */
    @media (max-width: 1023px) {
        .mobile-warning {
            display: flex;
        }

        .split-container,
        .aux-buttons,
        .overlay-panel {
            display: none !important;
        }
    }

    .split-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
    }

    .graph-section {
        min-height: 0;
        overflow: hidden;
        position: relative;
    }

    .report-section {
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: #0f172a;
        border-top: 1px solid rgba(34, 211, 238, 0.2);
    }

    .split-handle {
        height: 8px;
        background: #1f2937;
        cursor: row-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s;
    }

    .split-handle:hover,
    .split-handle.dragging {
        background: #22d3ee;
    }

    .handle-grip {
        width: 40px;
        height: 4px;
        background: #4b5563;
        border-radius: 2px;
    }

    .split-handle:hover .handle-grip,
    .split-handle.dragging .handle-grip {
        background: #0f172a;
    }

    .split-handle.at-edge {
        background: #374151;
        border-top: 1px solid rgba(34, 211, 238, 0.3);
        border-bottom: 1px solid rgba(34, 211, 238, 0.3);
    }

    .split-handle.at-edge .handle-grip {
        background: #22d3ee;
    }

    /* Report Header */
    .report-header {
        background: #111827;
        border-bottom: 1px solid #374151;
        flex-shrink: 0;
    }

    .report-meta {
        display: flex;
        gap: 12px;
        padding: 8px 16px;
        border-bottom: 1px solid #1f2937;
    }

    .meta-input {
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 4px;
        padding: 6px 10px;
        font-size: 13px;
        color: #e5e7eb;
    }

    .meta-input:focus {
        outline: none;
        border-color: #22d3ee;
    }

    .meta-title {
        flex: 1;
        max-width: 300px;
    }

    .meta-case {
        width: 100px;
    }

    .meta-author {
        width: 120px;
    }

    .meta-class {
        width: 130px;
        text-transform: uppercase;
    }

    .report-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.2);
    }

    .toolbar-left {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 5px 10px;
        background: transparent;
        border: 1px solid #374151;
        border-radius: 4px;
        color: #9ca3af;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .toolbar-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: #4b5563;
        color: #e5e7eb;
    }

    .toolbar-divider {
        width: 1px;
        height: 20px;
        background: #374151;
        margin: 0 4px;
    }

    .toolbar-stats {
        font-size: 11px;
        color: #6b7280;
        font-family: 'JetBrains Mono', monospace;
    }

    /* Entity Picker Dropdown */
    .entity-picker-wrapper {
        position: relative;
    }

    .entity-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        width: 280px;
        background: #1f2937;
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 100;
        overflow: hidden;
    }

    .dropdown-header {
        padding: 10px 12px;
        font-size: 11px;
        text-transform: uppercase;
        color: #6b7280;
        border-bottom: 1px solid #374151;
    }

    .dropdown-list {
        max-height: 250px;
        overflow-y: auto;
    }

    .dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background 0.1s;
    }

    .dropdown-item:hover {
        background: rgba(34, 211, 238, 0.1);
    }

    .item-type {
        padding: 2px 6px;
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
        font-size: 9px;
        text-transform: uppercase;
        border-radius: 3px;
    }

    .item-name {
        color: #e5e7eb;
        font-size: 13px;
    }

    .dropdown-empty {
        padding: 20px;
        text-align: center;
        color: #6b7280;
        font-size: 13px;
    }

    /* Markdown Dropdown */
    .markdown-dropdown-wrapper {
        position: relative;
    }

    .markdown-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        width: 200px;
        background: #1f2937;
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 100;
        overflow: hidden;
        max-height: 400px;
        overflow-y: auto;
    }

    .md-dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background 0.1s;
        color: #e5e7eb;
        font-size: 13px;
    }

    .md-dropdown-item:hover {
        background: rgba(34, 211, 238, 0.1);
    }

    .md-icon {
        width: 24px;
        text-align: center;
        font-family: monospace;
        font-size: 12px;
        color: #22d3ee;
        flex-shrink: 0;
    }

    .md-label {
        flex: 1;
    }

    .dropdown-divider {
        height: 1px;
        background: #374151;
        margin: 4px 0;
    }

    /* View Toggle */
    .view-toggle {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .view-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 26px;
        background: transparent;
        border: 1px solid #374151;
        border-radius: 4px;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s;
    }

    .view-btn:hover {
        color: #9ca3af;
        background: rgba(255, 255, 255, 0.05);
        border-color: #4b5563;
    }

    .view-btn.active {
        color: #22d3ee;
        background: rgba(34, 211, 238, 0.15);
        border-color: rgba(34, 211, 238, 0.4);
    }

    .export-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 4px;
        color: #22c55e;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
    }

    .export-btn:hover {
        background: rgba(34, 197, 94, 0.25);
        border-color: rgba(34, 197, 94, 0.6);
    }

    .date-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .date-toggle:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #e5e7eb;
    }

    .date-toggle input[type="checkbox"] {
        width: 14px;
        height: 14px;
        cursor: pointer;
        accent-color: #22c55e;
    }

    /* Report Content */
    .report-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .report-content.split-view {
        flex-direction: row;
    }

    /* Editor Pane */
    .editor-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
        border-right: 1px solid #374151;
    }

    .editor-pane.full-width {
        border-right: none;
    }

    .editor-wrapper {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .report-editor {
        flex: 1;
        width: 100%;
        background: #0a0f1a;
        border: none;
        color: #e5e7eb;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        padding: 20px;
        padding-bottom: 80px;
        resize: none;
        line-height: 1.8;
    }

    .report-editor:focus {
        outline: none;
    }

    .report-editor::placeholder {
        color: #4b5563;
        white-space: pre-wrap;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        font-size: 13px;
    }

    /* Preview Pane */
    .preview-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
        background: #1e293b;
    }

    .preview-pane.full-width {
        flex: 1;
    }

    .preview-wrapper {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
    }

    .preview-page {
        width: 100%;
        max-width: 816px; /* A4 width at 96dpi */
        min-height: min-content;
        height: auto;
        background: white;
        color: #1a1a1a;
        padding: 48px;
        margin-bottom: 24px;
        border-radius: 4px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
    }

    /* Ensure all preview content inherits the correct font */
    .preview-page * {
        font-family: inherit;
    }

    .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 16px;
        margin-bottom: 24px;
        border-bottom: 2px solid #1a1a1a;
    }

    .preview-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .preview-case {
        font-size: 12px;
        color: #666;
    }

    .preview-author {
        font-size: 12px;
        color: #666;
        text-align: right;
    }

    .preview-classification {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #c00;
        text-align: right;
        margin-top: 4px;
    }

    .preview-content {
        min-height: 200px;
    }

    .preview-empty {
        color: #9ca3af;
        font-style: italic;
    }

    /* Preview Content Styles - matches PDF output */
    .preview-content :global(h1) {
        font-size: 20px;
        font-weight: 700;
        margin: 24px 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #ddd;
    }

    .preview-content :global(h2) {
        font-size: 16px;
        font-weight: 600;
        margin: 20px 0 10px 0;
    }

    .preview-content :global(h3) {
        font-size: 14px;
        font-weight: 600;
        margin: 16px 0 8px 0;
    }

    .preview-content :global(h4) {
        font-size: 13px;
        font-weight: 600;
        margin: 14px 0 8px 0;
    }

    .preview-content :global(p) {
        margin: 0 0 12px 0;
    }

    .preview-content :global(ul),
    .preview-content :global(ol) {
        margin: 0 0 12px 0;
        padding-left: 24px;
    }

    .preview-content :global(ol) {
        list-style-type: decimal;
    }

    .preview-content :global(ul) {
        list-style-type: disc;
    }

    .preview-content :global(li) {
        margin-bottom: 4px;
    }

    .preview-content :global(pre),
    .preview-content :global(code) {
        font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }

    .preview-content :global(code) {
        background: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 13px;
    }

    .preview-content :global(pre) {
        background: #f4f4f4;
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 0 0 16px 0;
    }

    .preview-content :global(pre code) {
        background: none;
        padding: 0;
    }

    .preview-content :global(blockquote) {
        margin: 0 0 16px 0;
        padding: 12px 16px;
        border-left: 4px solid #ddd;
        background: #f9f9f9;
    }

    .preview-content :global(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 16px 0;
    }

    .preview-content :global(th),
    .preview-content :global(td) {
        border: 1px solid #ddd;
        padding: 8px 12px;
        text-align: left;
    }

    .preview-content :global(th) {
        background: #f4f4f4;
        font-weight: 600;
    }

    .preview-content :global(figure.report-image) {
        margin: 20px auto;
        padding: 12px;
        background: #fafafa;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        max-width: 500px;
        text-align: center;
    }

    .preview-content :global(figure.report-image img) {
        max-width: 100%;
        max-height: 300px;
        height: auto;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }

    .preview-content :global(figure.report-image figcaption) {
        font-size: 12px;
        color: #666;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #e5e5e5;
        font-style: italic;
    }

    .preview-content :global(.page-break) {
        border-top: 2px dashed #ddd;
        margin: 24px 0;
        padding-top: 8px;
        text-align: center;
        color: #999;
        font-size: 11px;
    }

    .preview-content :global(.page-break)::before {
        content: 'Page Break';
    }

    .preview-content :global(hr) {
        border: none;
        border-top: 1px solid #ddd;
        margin: 24px 0;
    }

    .preview-content :global(a) {
        color: #0066cc;
        text-decoration: underline;
    }

    .preview-content :global(strong) {
        font-weight: 600;
    }

    .preview-content :global(em) {
        font-style: italic;
    }

    .preview-content :global(del) {
        text-decoration: line-through;
        color: #888;
    }

    .preview-content :global(input[type="checkbox"]) {
        margin-right: 8px;
    }

    /* Autocomplete */
    .autocomplete-dropdown {
        position: absolute;
        top: 60px;
        left: 20px;
        width: 300px;
        background: rgba(17, 24, 39, 0.98);
        border: 1px solid rgba(34, 211, 238, 0.4);
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 100;
        overflow: hidden;
    }

    .ac-header {
        padding: 8px 12px;
        font-size: 10px;
        text-transform: uppercase;
        color: #6b7280;
        border-bottom: 1px solid #374151;
    }

    .ac-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
    }

    .ac-item:hover,
    .ac-item.selected {
        background: rgba(34, 211, 238, 0.15);
    }

    .ac-type {
        padding: 2px 6px;
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
        font-size: 9px;
        text-transform: uppercase;
        border-radius: 3px;
    }

    .ac-name {
        color: #e5e7eb;
        font-size: 13px;
    }

    /* Auxiliary Buttons */
    .aux-buttons {
        position: fixed;
        right: 16px;
        top: 140px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 50;
    }

    .aux-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 8px;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.2s;
    }

    .aux-btn:hover {
        background: #374151;
        color: #22d3ee;
        border-color: #22d3ee;
    }

    .aux-btn.active {
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
        border-color: #22d3ee;
    }

    /* Overlay Panels */
    .overlay-panel {
        position: fixed;
        top: 48px;
        bottom: 0;
        width: 320px;
        background: #0f172a;
        border-left: 1px solid rgba(34, 211, 238, 0.2);
        z-index: 60;
        display: flex;
        flex-direction: column;
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);
    }

    .overlay-panel.right {
        right: 0;
    }

    .overlay-panel.large {
        width: 400px;
    }

    .overlay-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #111827;
        border-bottom: 1px solid rgba(34, 211, 238, 0.2);
    }

    .overlay-header span {
        font-size: 14px;
        font-weight: 600;
        color: #22d3ee;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .close-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: #6b7280;
        font-size: 20px;
        cursor: pointer;
        border-radius: 4px;
    }

    .close-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
    }

    .overlay-content {
        flex: 1;
        overflow: auto;
        padding: 16px;
    }

    /* Properties Panel Styles */
    .prop-type-badge {
        display: inline-block;
        padding: 4px 10px;
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
        font-size: 11px;
        text-transform: uppercase;
        border-radius: 4px;
        margin-bottom: 8px;
    }

    .prop-name {
        color: #e5e7eb;
        font-size: 18px;
        margin: 0 0 16px;
    }

    .prop-field {
        margin-bottom: 16px;
    }

    .prop-field label {
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 4px;
        letter-spacing: 0.5px;
    }

    .prop-field p {
        color: #e5e7eb;
        font-size: 13px;
        margin: 0;
    }

    .prop-image {
        max-width: 100%;
        max-height: 150px;
        border-radius: 6px;
        border: 1px solid #374151;
    }

    .link-badge {
        border: 1px solid currentColor;
    }

    .link-between {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        margin-top: 4px;
    }

    .link-entity {
        color: #e5e7eb;
        font-size: 13px;
        flex: 1;
        text-align: center;
    }

    .link-arrow {
        color: #22d3ee;
        font-size: 16px;
    }

    .color-picker {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
    }

    .color-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
    }

    .color-btn:hover {
        transform: scale(1.1);
    }

    .color-btn.active {
        border-color: white;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
    }

    .color-btn.clear-color {
        background: #374151;
        color: #9ca3af;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .color-hint {
        font-size: 11px;
        color: #6b7280;
        margin-top: 6px;
        font-style: italic;
    }

    .prop-links {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
    }

    .prop-link {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        border-left: 3px solid #6B7280;
        font-size: 12px;
    }

    .link-direction {
        color: #6b7280;
        font-size: 14px;
    }

    .link-label {
        font-weight: 500;
        text-transform: uppercase;
        font-size: 10px;
    }

    .link-target {
        color: #e5e7eb;
        flex: 1;
    }

    .prop-edit-btn {
        width: 100%;
        padding: 10px;
        background: rgba(34, 211, 238, 0.1);
        border: 1px solid rgba(34, 211, 238, 0.3);
        color: #22d3ee;
        font-size: 13px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .prop-edit-btn:hover {
        background: rgba(34, 211, 238, 0.2);
    }

    .no-selection-msg {
        color: #6b7280;
        text-align: center;
        padding: 40px 0;
    }

    /* Markdown Hints Bar */
    .markdown-hints-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 14px;
        padding: 8px 16px;
        background: #111827;
        border-top: 1px solid #1f2937;
        flex-shrink: 0;
    }

    .hint-item {
        font-size: 11px;
        color: #6b7280;
        white-space: nowrap;
    }

    .hint-item code {
        background: #1f2937;
        padding: 2px 5px;
        border-radius: 3px;
        color: #22d3ee;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        margin-right: 2px;
    }

    /* Quick Notes Panel */
    .notes-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .notes-textarea-wrapper {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .quick-notes-textarea {
        flex: 1;
        width: 100%;
        background: #0a0f1a;
        border: 1px solid #374151;
        border-radius: 6px;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        padding: 12px;
        resize: none;
        line-height: 1.6;
    }

    .quick-notes-textarea:focus {
        outline: none;
        border-color: #22d3ee;
    }

    .quick-notes-textarea::placeholder {
        color: #4b5563;
    }

    .notes-autocomplete {
        position: absolute;
        top: 60px;
        left: 0;
        right: 0;
        background: rgba(17, 24, 39, 0.98);
        border: 1px solid rgba(34, 211, 238, 0.4);
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 100;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
    }

    .notes-hint {
        margin-top: 8px;
        font-size: 11px;
        color: #6b7280;
    }

    .notes-hint code {
        background: #1f2937;
        padding: 1px 4px;
        border-radius: 3px;
        color: #22d3ee;
        font-family: 'JetBrains Mono', monospace;
    }

    .notes-hint .hint-sep {
        color: #4b5563;
        margin: 0 6px;
    }

    .markdown-guide-link {
        color: #60a5fa;
        text-decoration: none;
        font-size: 11px;
    }

    .markdown-guide-link:hover {
        color: #93c5fd;
        text-decoration: underline;
    }

</style>
