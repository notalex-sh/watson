<!--
    Interactive graph canvas for visualizing entity relationships.
    Supports panning, zooming, node dragging, and link creation.
-->
<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { allItems, allLinks, nodePositions, selectedNodes, selectedLink, LINK_TYPES, ENTITY_TYPES, links, entities, events, canUndo, canRedo, undo, redo, saveUndoState, briefTitle, caseNumber, groups, groupIdCounter, canvasNotes, canvasImages, canvasPins, canvasItemIdCounter, images, imageIdCounter, canvasState } from '$lib/stores';
    import { GRAPH_CONFIG, getLayoutFunction, calculateFitParams } from '$lib/graph-layouts';
    import { ENTITY_ICONS } from '$lib/icons';
    import CanvasItemModals from './CanvasItemModals.svelte';

    const dispatch = createEventDispatcher();

    let svgElement;
    let containerElement;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    let isLinkingMode = false;
    let linkSourceId = null;
    let linkTargetPos = { x: 0, y: 0 };

    let contextMenu = null;

    let currentLayout = 'hierarchy';
    let layoutSpacing = 1.0;

    let selectedLinkId = null;

    let compactMode = false;
    let enableDragging = false;
    let showLinkFilter = false;
    let hiddenLinkTypes = new Set();
    let showMinimap = true;
    let useCurvedLinks = false;

    let searchQuery = '';
    let searchResults = [];
    let highlightedNodeId = null;

    let showGroupModal = false;
    let showGroupFilter = false;
    let editingGroup = null;
    let showPriorityFilter = false;
    let showHighPriority = true;
    let showLowPriority = true;
    let groupName = '';
    let groupColor = '#3B82F6';
    const GROUP_COLORS = [
        '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
        '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#6366F1'
    ];

    let showNoteModal = false;
    let showImageModal = false;
    let showPinModal = false;
    let editingNote = null;
    let editingImage = null;
    let editingPin = null;
    let noteText = '';
    let noteColor = '#FBBF24';
    let imageCaption = '';
    let pinLabel = '';
    let pinColor = '#EF4444';
    let pendingItemPosition = { x: 0, y: 0 };
    let fileInputRef;

    const NOTE_COLORS = [
        '#FBBF24', '#FCD34D', '#A3E635', '#34D399', '#22D3EE',
        '#818CF8', '#F472B6', '#FB923C', '#F87171', '#E5E7EB'
    ];

    const PIN_COLORS = [
        '#EF4444', '#F97316', '#FBBF24', '#22C55E', '#14B8A6',
        '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#1F2937'
    ];

    let isDraggingCanvasItem = false;
    let dragCanvasItemType = null;
    let dragCanvasItemId = null;
    let dragCanvasItemOffsetX = 0;
    let dragCanvasItemOffsetY = 0;

    let selectedCanvasItem = null;

    let isResizingImage = false;
    let resizingImageId = null;
    let resizeStartWidth = 0;
    let resizeStartX = 0;

    $: MIN_IMAGE_WIDTH = NODE_WIDTH * 0.5;
    $: MAX_IMAGE_WIDTH = NODE_WIDTH * 2;

    $: groupBounds = $groups.map(group => {
        const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        if (groupNodes.length === 0) return null;

        const padding = 20;
        const minX = Math.min(...groupNodes.map(n => n.x)) - padding;
        const minY = Math.min(...groupNodes.map(n => n.y)) - padding;
        const maxX = Math.max(...groupNodes.map(n => n.x + NODE_WIDTH)) + padding;
        const maxY = Math.max(...groupNodes.map(n => n.y + NODE_HEIGHT)) + padding;

        return {
            ...group,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }).filter(Boolean);

    /**
     * Opens the group edit modal with group data.
     */
    function editGroup(group) {
        groupName = group.name;
        groupColor = group.color;
        editingGroup = group;
        showGroupModal = true;
    }

    /**
     * Saves changes to the currently editing group.
     */
    function saveGroup() {
        if (!groupName.trim() || !editingGroup) return;

        saveUndoState();

        groups.update(g => g.map(grp =>
            grp.id === editingGroup.id
                ? { ...grp, name: groupName.trim(), color: groupColor }
                : grp
        ));

        showGroupModal = false;
        editingGroup = null;
    }

    /**
     * Deletes a group by ID.
     */
    function deleteGroup(groupId) {
        saveUndoState();
        groups.update(g => g.filter(grp => grp.id !== groupId));
    }

    /**
     * Toggles the collapsed state of a group.
     */
    function toggleGroupCollapsed(groupId) {
        groups.update(g => g.map(grp =>
            grp.id === groupId ? { ...grp, collapsed: !grp.collapsed } : grp
        ));
    }

    /**
     * Toggles the hidden state of a group.
     */
    function toggleGroupHidden(groupId) {
        groups.update(g => g.map(grp =>
            grp.id === groupId ? { ...grp, hidden: !grp.hidden } : grp
        ));
    }

    /**
     * Arranges groups in a grid layout with spacing.
     */
    function separateGroups() {
        if ($groups.length < 2) return;
        saveUndoState();

        const groupData = $groups.map(group => {
            const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
            if (groupNodes.length === 0) return null;
            const centerX = groupNodes.reduce((sum, n) => sum + n.x + NODE_WIDTH / 2, 0) / groupNodes.length;
            const centerY = groupNodes.reduce((sum, n) => sum + n.y + NODE_HEIGHT / 2, 0) / groupNodes.length;
            const width = Math.max(...groupNodes.map(n => n.x)) - Math.min(...groupNodes.map(n => n.x)) + NODE_WIDTH;
            const height = Math.max(...groupNodes.map(n => n.y)) - Math.min(...groupNodes.map(n => n.y)) + NODE_HEIGHT;
            return { group, centerX, centerY, width, height, nodes: groupNodes };
        }).filter(Boolean);

        const spacing = 100;
        const cols = Math.ceil(Math.sqrt(groupData.length));
        let maxWidth = 0, maxHeight = 0;
        groupData.forEach(g => {
            maxWidth = Math.max(maxWidth, g.width);
            maxHeight = Math.max(maxHeight, g.height);
        });

        const cellWidth = maxWidth + spacing;
        const cellHeight = maxHeight + spacing;

        groupData.forEach((g, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const targetX = col * cellWidth + cellWidth / 2;
            const targetY = row * cellHeight + cellHeight / 2;
            const offsetX = targetX - g.centerX;
            const offsetY = targetY - g.centerY;

            nodePositions.update(pos => {
                const newPos = { ...pos };
                g.nodes.forEach(node => {
                    if (newPos[node.id]) {
                        newPos[node.id] = {
                            x: newPos[node.id].x + offsetX,
                            y: newPos[node.id].y + offsetY
                        };
                    }
                });
                return newPos;
            });
        });
    }

    $: collapsedNodeIds = new Set(
        $groups
            .filter(g => g.collapsed)
            .flatMap(g => g.nodeIds)
    );

    /**
     * Removes specified nodes from a group.
     */
    function removeNodesFromGroup(groupId, nodeIds) {
        saveUndoState();
        groups.update(g => g.map(grp => {
            if (grp.id === groupId) {
                return { ...grp, nodeIds: grp.nodeIds.filter(id => !nodeIds.includes(id)) };
            }
            return grp;
        }));
    }

    /**
     * Opens the note creation modal at a position.
     */
    function openNoteModal(position) {
        pendingItemPosition = position;
        noteText = '';
        noteColor = NOTE_COLORS[0];
        editingNote = null;
        showNoteModal = true;
    }

    /**
     * Opens the image upload modal at a position.
     */
    function openImageModal(position) {
        pendingItemPosition = position;
        imageCaption = '';
        editingImage = null;
        showImageModal = true;
    }

    /**
     * Opens the pin creation modal at a position.
     */
    function openPinModal(position) {
        pendingItemPosition = position;
        pinLabel = '';
        pinColor = PIN_COLORS[0];
        editingPin = null;
        showPinModal = true;
    }

    /**
     * Opens the note edit modal with existing note data.
     */
    function editNote(note) {
        noteText = note.text;
        noteColor = note.color;
        editingNote = note;
        showNoteModal = true;
    }

    /**
     * Opens the image edit modal with existing image data.
     */
    function editImage(image) {
        imageCaption = image.caption || '';
        editingImage = image;
        showImageModal = true;
    }

    /**
     * Opens the pin edit modal with existing pin data.
     */
    function editPin(pin) {
        pinLabel = pin.label || '';
        pinColor = pin.color;
        editingPin = pin;
        showPinModal = true;
    }

    /**
     * Saves or creates a canvas note.
     */
    function saveNote() {
        if (!noteText.trim()) return;
        saveUndoState();

        if (editingNote) {
            canvasNotes.update(notes => notes.map(n =>
                n.id === editingNote.id
                    ? { ...n, text: noteText.trim(), color: noteColor }
                    : n
            ));
        } else {
            canvasItemIdCounter.update(n => n + 1);
            let newId;
            canvasItemIdCounter.subscribe(v => newId = v)();

            canvasNotes.update(notes => [...notes, {
                id: newId,
                x: pendingItemPosition.x,
                y: pendingItemPosition.y,
                width: 150,
                height: 100,
                text: noteText.trim(),
                color: noteColor
            }]);
        }

        showNoteModal = false;
        editingNote = null;
    }

    /**
     * Adds an image to the canvas at a position.
     */
    function addImageToCanvas(imageId, position) {
        saveUndoState();
        canvasItemIdCounter.update(n => n + 1);
        let newId;
        canvasItemIdCounter.subscribe(v => newId = v)();

        canvasImages.update(images => [...images, {
            id: newId,
            x: position.x,
            y: position.y,
            width: NODE_WIDTH,
            height: NODE_WIDTH * 0.75,
            imageId: imageId,
            caption: ''
        }]);
    }

    /**
     * Saves the caption for the currently editing image.
     */
    function saveImageCaption() {
        if (!editingImage) return;
        saveUndoState();
        canvasImages.update(images => images.map(img =>
            img.id === editingImage.id
                ? { ...img, caption: imageCaption.trim() }
                : img
        ));
        showImageModal = false;
        editingImage = null;
    }

    /**
     * Handles image file upload from input.
     */
    function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const imageData = ev.target.result;
            imageIdCounter.update(n => n + 1);
            let imgId;
            imageIdCounter.subscribe(v => imgId = v)();
            images.update(imgs => ({ ...imgs, [imgId]: imageData }));

            addImageToCanvas(imgId, pendingItemPosition);
            showImageModal = false;
        };
        reader.readAsDataURL(file);
        if (e.target) e.target.value = '';
    }

    /**
     * Saves or creates a canvas pin.
     */
    function savePin() {
        saveUndoState();

        if (editingPin) {
            canvasPins.update(pins => pins.map(p =>
                p.id === editingPin.id
                    ? { ...p, label: pinLabel.trim(), color: pinColor }
                    : p
            ));
        } else {
            canvasItemIdCounter.update(n => n + 1);
            let newId;
            canvasItemIdCounter.subscribe(v => newId = v)();

            canvasPins.update(pins => [...pins, {
                id: newId,
                x: pendingItemPosition.x,
                y: pendingItemPosition.y,
                color: pinColor,
                label: pinLabel.trim()
            }]);
        }

        showPinModal = false;
        editingPin = null;
    }

    /**
     * Deletes a canvas note by ID.
     */
    function deleteNote(noteId) {
        saveUndoState();
        canvasNotes.update(notes => notes.filter(n => n.id !== noteId));
    }

    /**
     * Deletes a canvas image by ID.
     */
    function deleteImage(imageId) {
        saveUndoState();
        canvasImages.update(images => images.filter(img => img.id !== imageId));
    }

    /**
     * Deletes a canvas pin by ID.
     */
    function deletePin(pinId) {
        saveUndoState();
        canvasPins.update(pins => pins.filter(p => p.id !== pinId));
    }

    /**
     * Handles mouse down on a canvas item for dragging.
     */
    function handleCanvasItemMouseDown(e, type, id, itemX, itemY) {
        e.stopPropagation();
        selectedCanvasItem = { type, id };
        selectedNodes.set([]);
        selectedLinkId = null;
        selectedLink.set(null);
        const worldPos = screenToWorld(e.clientX, e.clientY);
        dragCanvasItemOffsetX = worldPos.x - itemX;
        dragCanvasItemOffsetY = worldPos.y - itemY;
        saveUndoState();
        isDraggingCanvasItem = true;
        dragCanvasItemType = type;
        dragCanvasItemId = id;
    }

    /**
     * Selects a canvas item and clears other selections.
     */
    function selectCanvasItem(e, type, id) {
        e.stopPropagation();
        selectedCanvasItem = { type, id };
        selectedNodes.set([]);
        selectedLinkId = null;
        selectedLink.set(null);
    }

    /**
     * Deletes the currently selected canvas item.
     */
    function deleteSelectedCanvasItem() {
        if (!selectedCanvasItem) return;
        const { type, id } = selectedCanvasItem;
        if (type === 'note') {
            deleteNote(id);
        } else if (type === 'image') {
            deleteImage(id);
        } else if (type === 'pin') {
            deletePin(id);
        }
        selectedCanvasItem = null;
    }

    /**
     * Handles dragging of canvas items (notes, images, pins).
     */
    function handleCanvasItemDrag(e) {
        if (!isDraggingCanvasItem || !dragCanvasItemId) return;

        const worldPos = screenToWorld(e.clientX, e.clientY);
        const newX = worldPos.x - dragCanvasItemOffsetX;
        const newY = worldPos.y - dragCanvasItemOffsetY;

        if (dragCanvasItemType === 'note') {
            canvasNotes.update(notes => notes.map(n =>
                n.id === dragCanvasItemId
                    ? { ...n, x: newX, y: newY }
                    : n
            ));
        } else if (dragCanvasItemType === 'image') {
            canvasImages.update(images => images.map(img =>
                img.id === dragCanvasItemId
                    ? { ...img, x: newX, y: newY }
                    : img
            ));
        } else if (dragCanvasItemType === 'pin') {
            canvasPins.update(pins => pins.map(p =>
                p.id === dragCanvasItemId
                    ? { ...p, x: newX, y: newY }
                    : p
            ));
        }
    }

    function handleCanvasItemMouseUp() {
        isDraggingCanvasItem = false;
        dragCanvasItemType = null;
        dragCanvasItemId = null;
        isResizingImage = false;
        resizingImageId = null;
    }

    function handleImageResizeStart(e, imageId, currentWidth) {
        e.stopPropagation();
        isResizingImage = true;
        resizingImageId = imageId;
        resizeStartWidth = currentWidth;
        resizeStartX = e.clientX;
    }

    function handleImageResize(e) {
        if (!isResizingImage || !resizingImageId) return;

        const deltaX = (e.clientX - resizeStartX) / zoom;
        let newWidth = resizeStartWidth + deltaX;
        newWidth = Math.max(MIN_IMAGE_WIDTH, Math.min(MAX_IMAGE_WIDTH, newWidth));

        canvasImages.update(images => images.map(img => {
            if (img.id === resizingImageId) {
                const aspectRatio = img.height / img.width;
                return { ...img, width: newWidth, height: newWidth * aspectRatio };
            }
            return img;
        }));
    }

    /**
     * Gets the data URL for a stored image.
     */
    function getImageSrc(imageId) {
        let src = '';
        images.subscribe(imgs => src = imgs[imageId] || '')();
        return src;
    }

    /**
     * Gets image source for modal preview.
     */
    function getImageSrcForModal(image) {
        if (!image) return null;
        return image.imageId ? getImageSrc(image.imageId) : image.src;
    }

    let isDraggingNode = false;
    let dragNodeId = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let hasDraggedNode = false;
    let justFinishedDragging = false;

    $: NODE_WIDTH = compactMode ? 100 : 160;
    $: NODE_HEIGHT = compactMode ? 50 : 80;

    $: showLabels = zoom >= 0.4;
    $: showTypeLabels = zoom >= 0.6;
    $: showLinkLabels = zoom >= 0.5;
    $: showConnectionCounts = zoom >= 0.5;

    function getEntityType(type) {
        return ENTITY_TYPES[type] || ENTITY_TYPES['object'];
    }

    $: nodes = $allItems.map(item => {
        const pos = $nodePositions[item.id];
        return {
            ...item,
            x: pos?.x ?? 0,
            y: pos?.y ?? 0
        };
    });

    $: currentSelectedNodes = $selectedNodes;

    $: linksWithPaths = (() => {
        const selectedIds = new Set(currentSelectedNodes.map(id => String(id)));

        return $allLinks
            .filter(link => !hiddenLinkTypes.has(link.type || 'associate'))
            .map(link => {
                const fromPos = $nodePositions[link.from];
                const toPos = $nodePositions[link.to];

                const x1 = (fromPos?.x ?? 0) + NODE_WIDTH / 2;
                const y1 = (fromPos?.y ?? 0) + NODE_HEIGHT / 2;
                const x2 = (toPos?.x ?? 0) + NODE_WIDTH / 2;
                const y2 = (toPos?.y ?? 0) + NODE_HEIGHT / 2;

                const isConnectedToSelected = selectedIds.size > 0 &&
                    (selectedIds.has(String(link.from)) || selectedIds.has(String(link.to)));

            let path, midpoint;
            if (useCurvedLinks) {
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const baseMidX = (x1 + x2) / 2;
                const baseMidY = (y1 + y2) / 2;

                let closestDist = Infinity;
                let closestDir = { x: -dy / dist, y: dx / dist };

                for (const [nodeId, nodePos] of Object.entries($nodePositions)) {
                    if (nodeId === link.from || nodeId === link.to || !nodePos) continue;
                    const nodeCenterX = nodePos.x + NODE_WIDTH / 2;
                    const nodeCenterY = nodePos.y + NODE_HEIGHT / 2;
                    const toDist = Math.sqrt((nodeCenterX - baseMidX) ** 2 + (nodeCenterY - baseMidY) ** 2);
                    if (toDist < closestDist && toDist < dist) {
                        closestDist = toDist;
                        const awayX = baseMidX - nodeCenterX;
                        const awayY = baseMidY - nodeCenterY;
                        const awayLen = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
                        closestDir = { x: awayX / awayLen, y: awayY / awayLen };
                    }
                }

                const offset = Math.min(dist * 0.2, 50);
                const cx = baseMidX + closestDir.x * offset;
                const cy = baseMidY + closestDir.y * offset;
                path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
                midpoint = {
                    x: 0.25 * x1 + 0.5 * cx + 0.25 * x2,
                    y: 0.25 * y1 + 0.5 * cy + 0.25 * y2
                };
            } else {
                path = `M ${x1} ${y1} L ${x2} ${y2}`;
                midpoint = {
                    x: (x1 + x2) / 2,
                    y: (y1 + y2) / 2
                };
            }

                return {
                    ...link,
                    path,
                    midpoint,
                    valid: fromPos && toPos,
                    isConnectedToSelected
                };
            })
            .sort((a, b) => (a.isConnectedToSelected ? 1 : 0) - (b.isConnectedToSelected ? 1 : 0));
    })();

    function getNodeById(id) {
        return nodes.find(n => n.id === id);
    }

    function screenToWorld(screenX, screenY) {
        const rect = svgElement.getBoundingClientRect();
        return {
            x: (screenX - rect.left - panX) / zoom,
            y: (screenY - rect.top - panY) / zoom
        };
    }

    function handleWheel(e) {
        e.preventDefault();
        const rect = svgElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

        const worldX = (mouseX - panX) / zoom;
        const worldY = (mouseY - panY) / zoom;

        panX = mouseX - worldX * newZoom;
        panY = mouseY - worldY * newZoom;
        zoom = newZoom;
    }

    function handleMouseDown(e) {
        const target = e.target;
        const tagName = target.tagName?.toLowerCase();
        const isBackground = target === svgElement ||
            target.classList?.contains('canvas-bg') ||
            tagName === 'rect' ||
            tagName === 'pattern' ||
            tagName === 'svg';

        if (isBackground && e.button === 0) {
            isPanning = true;
            panStartX = e.clientX - panX;
            panStartY = e.clientY - panY;
            selectedNodes.set([]);
            selectedLinkId = null;
            contextMenu = null;
        }
    }

    function handleMouseMove(e) {
        if (isPanning) {
            panX = e.clientX - panStartX;
            panY = e.clientY - panStartY;
        } else if (isDraggingNode && dragNodeId) {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            nodePositions.update(pos => ({
                ...pos,
                [dragNodeId]: {
                    x: worldPos.x - dragStartX,
                    y: worldPos.y - dragStartY
                }
            }));
            hasDraggedNode = true;
        } else if (isDraggingCanvasItem && dragCanvasItemId) {
            handleCanvasItemDrag(e);
        } else if (isResizingImage && resizingImageId) {
            handleImageResize(e);
        } else if (isLinkingMode && linkSourceId) {
            linkTargetPos = screenToWorld(e.clientX, e.clientY);
        }
    }

    function handleMouseUp(e) {
        isPanning = false;
        if (isDraggingNode && hasDraggedNode) {
            justFinishedDragging = true;
            setTimeout(() => { justFinishedDragging = false; }, 50);
        }
        isDraggingNode = false;
        dragNodeId = null;
        hasDraggedNode = false;
        handleCanvasItemMouseUp();
    }

    function getLinkId(link) {
        return `${link.from}--${link.to}`;
    }

    function handleNodeMouseDown(e, node) {
        e.stopPropagation();

        if (enableDragging && !isLinkingMode && e.button === 0) {
            saveUndoState();
            isDraggingNode = true;
            dragNodeId = node.id;
            dragStartX = NODE_WIDTH / 2;
            dragStartY = NODE_HEIGHT / 2;
            selectedNodes.set([node.id]);
            selectedLinkId = null;
            selectedLink.set(null);
        }
    }

    function handleNodeClick(e, node) {
        e.stopPropagation();

        if (isDraggingNode || justFinishedDragging) return;

        if (isLinkingMode && linkSourceId && linkSourceId !== node.id) {
            dispatch('addLink', { sourceId: linkSourceId, targetId: node.id });
            isLinkingMode = false;
            linkSourceId = null;
        } else if (isLinkingMode && !linkSourceId) {
            linkSourceId = node.id;
            linkTargetPos = { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
        } else {
            selectedNodes.set([node.id]);
            selectedLinkId = null;
            selectedLink.set(null);
            dispatch('nodeSelect', { id: node.id });
        }
    }

    function handleNodeDblClick(e, node) {
        e.stopPropagation();
        dispatch('editEntity', node);
    }

    function handleContextMenu(e) {
        e.preventDefault();

        if (isLinkingMode) {
            isLinkingMode = false;
            linkSourceId = null;
            return;
        }

        const worldPos = screenToWorld(e.clientX, e.clientY);
        contextMenu = {
            x: e.clientX,
            y: e.clientY,
            type: 'canvas',
            worldPos: {
                x: worldPos.x - NODE_WIDTH / 2,
                y: worldPos.y - NODE_HEIGHT / 2
            }
        };
    }

    function handleNodeContextMenu(e, node) {
        e.preventDefault();
        e.stopPropagation();

        if (isLinkingMode) {
            isLinkingMode = false;
            linkSourceId = null;
            return;
        }

        selectedNodes.set([node.id]);
        contextMenu = {
            x: e.clientX,
            y: e.clientY,
            type: 'node',
            node
        };
    }

    function handleLinkClick(e, link) {
        e.stopPropagation();
        selectedLinkId = getLinkId(link);
        selectedNodes.set([]);
        selectedLink.set(link);
        dispatch('linkSelect', link);
    }

    function handleLinkContextMenu(e, link) {
        e.preventDefault();
        e.stopPropagation();
        contextMenu = {
            x: e.clientX,
            y: e.clientY,
            type: 'link',
            link
        };
    }

    function handleLinkDblClick(e, link) {
        e.stopPropagation();
        dispatch('editLink', { ...link });
    }

    function handleCanvasClick(e) {
        if (isLinkingMode) {
            isLinkingMode = false;
            linkSourceId = null;
        }
        contextMenu = null;
        selectedLinkId = null;
        selectedLink.set(null);
        selectedCanvasItem = null;
    }

    function startLinkMode() {
        isLinkingMode = true;
        linkSourceId = null;
        contextMenu = null;
    }

    function addEntityFromContext() {
        if (contextMenu?.worldPos) {
            dispatch('addEntity', {
                x: contextMenu.worldPos.x,
                y: contextMenu.worldPos.y
            });
        }
        contextMenu = null;
    }

    function deleteNode(node) {
        saveUndoState();
        const nodeId = node.id;
        links.update(l => l.filter(link => link.from !== nodeId && link.to !== nodeId));
        if (node.itemType === 'event') {
            const originalId = node.originalId;
            events.update(evs => evs.filter(e => e.id !== originalId));
        } else {
            entities.update(ents => ents.filter(e => e.id !== nodeId));
        }
        nodePositions.update(pos => {
            const newPos = { ...pos };
            delete newPos[nodeId];
            return newPos;
        });
    }

    function deleteSelectedNode() {
        if (contextMenu?.node) {
            deleteNode(contextMenu.node);
        }
        contextMenu = null;
    }

    function deleteLink() {
        if (contextMenu?.link) {
            saveUndoState();
            links.update(l => l.filter(link => !(link.from === contextMenu.link.from && link.to === contextMenu.link.to)));
        }
        contextMenu = null;
    }

    function editLinkFromContext() {
        if (contextMenu?.link) {
            dispatch('editLink', { ...contextMenu.link });
        }
        contextMenu = null;
    }

    function applyLayout() {
        if ($allItems.length === 0) return;

        saveUndoState();

        const customConfig = {
            ...GRAPH_CONFIG,
            nodeSpacingX: GRAPH_CONFIG.nodeSpacingX * layoutSpacing,
            nodeSpacingY: GRAPH_CONFIG.nodeSpacingY * layoutSpacing
        };

        const layoutFn = getLayoutFunction(currentLayout);
        const positions = layoutFn($allItems, $allLinks, customConfig);

        const newPositions = {};
        positions.forEach((pos, id) => {
            newPositions[id] = pos;
        });
        nodePositions.set(newPositions);

        setTimeout(fitToView, 50);
    }

    function fitToView() {
        if (nodes.length === 0 || !containerElement) return;

        const rect = containerElement.getBoundingClientRect();
        const positions = new Map();
        nodes.forEach(node => {
            positions.set(node.id, { x: node.x, y: node.y });
        });

        const fitParams = calculateFitParams(positions, rect.width, rect.height, GRAPH_CONFIG);
        zoom = fitParams.zoom;
        panX = fitParams.panX;
        panY = fitParams.panY;
    }

    function handleLayoutChange() {
        applyLayout();
    }

    function getStrokeDasharray(style) {
        switch (style) {
            case 'dashed': return '8,4';
            case 'dotted': return '2,4';
            default: return 'none';
        }
    }

    function handlePaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const imageData = ev.target.result;
                        imageIdCounter.update(n => n + 1);
                        let imgId;
                        imageIdCounter.subscribe(v => imgId = v)();
                        images.update(imgs => ({ ...imgs, [imgId]: imageData }));

                        const centerPos = screenToWorld(
                            containerElement?.clientWidth / 2 || 400,
                            containerElement?.clientHeight / 2 || 300
                        );

                        addImageToCanvas(imgId, {
                            x: centerPos.x - NODE_WIDTH / 2,
                            y: centerPos.y - NODE_WIDTH * 0.375
                        });
                    };
                    reader.readAsDataURL(file);
                }
                return;
            }

            if (item.type === 'text/plain') {
                item.getAsString((text) => {
                    const trimmed = text.trim();
                    const urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
                    if (urlPattern.test(trimmed)) {
                        e.preventDefault();
                        dispatch('addEntity', {
                            x: 0,
                            y: 0,
                            prefill: {
                                type: 'url',
                                content: trimmed
                            }
                        });
                    }
                });
            }
        }
    }

    onMount(() => {
        if ($canvasState.zoom !== 1 || $canvasState.panX !== 0 || $canvasState.panY !== 0) {
            zoom = $canvasState.zoom;
            panX = $canvasState.panX;
            panY = $canvasState.panY;
        } else if ($allItems.length > 0 && Object.keys($nodePositions).length === 0) {
            applyLayout();
        } else if ($allItems.length > 0) {
            setTimeout(fitToView, 50);
        }

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    });

    $: canvasState.set({ zoom, panX, panY });

    function exportGraphToHtml() {
        if (nodes.length === 0) {
            alert('No entities to export');
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + NODE_WIDTH);
            maxY = Math.max(maxY, node.y + NODE_HEIGHT);
        });
        const padding = 100;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        const width = maxX - minX;
        const height = maxY - minY;

        const neutralLinkColor = '#4b5563';
        const linksSvg = linksWithPaths.filter(l => l.valid).map(link => {
            const linkType = LINK_TYPES[link.type] || LINK_TYPES.associate;
            const dashArray = getStrokeDasharray(linkType.style);
            const linkColor = link.customColor || neutralLinkColor;
            const strokeWidth = link.customColor ? 3 : 2;
            return `
                <path d="${link.path}" stroke="${linkColor}" stroke-width="${strokeWidth}" fill="none" ${dashArray !== 'none' ? `stroke-dasharray="${dashArray}"` : ''}/>
                <text x="${link.midpoint.x}" y="${link.midpoint.y}" fill="${link.customColor || '#9ca3af'}" font-size="10" text-anchor="middle" font-family="sans-serif">${link.label || linkType.label}</text>
            `;
        }).join('\n');

        const nodesSvg = nodes.map(node => {
            const entityType = getEntityType(node.type);
            return `
                <g transform="translate(${node.x}, ${node.y})">
                    <rect width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="10" fill="${entityType.bg}" stroke="${entityType.color}" stroke-width="2"/>
                    <text x="${NODE_WIDTH / 2}" y="${NODE_HEIGHT / 2 + 5}" fill="#e5e7eb" font-size="12" text-anchor="middle" font-family="sans-serif" font-weight="600">${(node.content || '').substring(0, 20)}${(node.content || '').length > 20 ? '...' : ''}</text>
                    <text x="${NODE_WIDTH / 2}" y="${NODE_HEIGHT - 10}" fill="${entityType.color}" font-size="9" text-anchor="middle" font-family="sans-serif">${entityType.label}</text>
                </g>
            `;
        }).join('\n');

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Watson Graph Export</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #0a0f1a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        svg {
            width: 100%;
            height: 100%;
            cursor: grab;
        }
        svg:active {
            cursor: grabbing;
        }
        .controls {
            position: fixed;
            top: 10px;
            left: 10px;
            display: flex;
            gap: 8px;
            z-index: 100;
        }
        .controls button {
            padding: 8px 16px;
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 6px;
            color: #e5e7eb;
            font-size: 12px;
            cursor: pointer;
        }
        .controls button:hover {
            background: #374151;
            border-color: #22d3ee;
        }
        .info {
            position: fixed;
            bottom: 10px;
            left: 10px;
            color: #6b7280;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="controls">
        <button onclick="resetView()">Reset View</button>
        <button onclick="zoomIn()">Zoom In</button>
        <button onclick="zoomOut()">Zoom Out</button>
    </div>
    <div class="info">Pan: Click & drag • Zoom: Scroll or buttons • Exported from Watson</div>
    <svg id="graph" viewBox="${minX} ${minY} ${width} ${height}">
        <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#0a0f1a"/>
        <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1f2937" stroke-width="0.5"/>
            </pattern>
        </defs>
        <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#grid)"/>
        ${linksSvg}
        ${nodesSvg}
    </svg>
    <script>
        const svg = document.getElementById('graph');
        let viewBox = { x: ${minX}, y: ${minY}, w: ${width}, h: ${height} };
        let isPanning = false;
        let startPoint = { x: 0, y: 0 };
        let zoom = 1;

        function updateViewBox() {
            svg.setAttribute('viewBox', viewBox.x + ' ' + viewBox.y + ' ' + viewBox.w + ' ' + viewBox.h);
        }

        svg.addEventListener('mousedown', (e) => {
            isPanning = true;
            startPoint = { x: e.clientX, y: e.clientY };
        });

        svg.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            const dx = (e.clientX - startPoint.x) * (viewBox.w / svg.clientWidth);
            const dy = (e.clientY - startPoint.y) * (viewBox.h / svg.clientHeight);
            viewBox.x -= dx;
            viewBox.y -= dy;
            startPoint = { x: e.clientX, y: e.clientY };
            updateViewBox();
        });

        svg.addEventListener('mouseup', () => isPanning = false);
        svg.addEventListener('mouseleave', () => isPanning = false);

        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 1.1 : 0.9;
            const mouseX = e.clientX / svg.clientWidth * viewBox.w + viewBox.x;
            const mouseY = e.clientY / svg.clientHeight * viewBox.h + viewBox.y;
            viewBox.w *= factor;
            viewBox.h *= factor;
            viewBox.x = mouseX - (e.clientX / svg.clientWidth * viewBox.w);
            viewBox.y = mouseY - (e.clientY / svg.clientHeight * viewBox.h);
            zoom /= factor;
            updateViewBox();
        });

        function resetView() {
            viewBox = { x: ${minX}, y: ${minY}, w: ${width}, h: ${height} };
            zoom = 1;
            updateViewBox();
        }

        function zoomIn() {
            const cx = viewBox.x + viewBox.w / 2;
            const cy = viewBox.y + viewBox.h / 2;
            viewBox.w *= 0.8;
            viewBox.h *= 0.8;
            viewBox.x = cx - viewBox.w / 2;
            viewBox.y = cy - viewBox.h / 2;
            zoom *= 1.25;
            updateViewBox();
        }

        function zoomOut() {
            const cx = viewBox.x + viewBox.w / 2;
            const cy = viewBox.y + viewBox.h / 2;
            viewBox.w *= 1.25;
            viewBox.h *= 1.25;
            viewBox.x = cx - viewBox.w / 2;
            viewBox.y = cy - viewBox.h / 2;
            zoom *= 0.8;
            updateViewBox();
        }
    <\/script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        const baseName = ($briefTitle || $caseNumber || 'watson-graph').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-') || 'watson-graph';
        downloadLink.download = `${baseName}-graph.html`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
    }

    function toggleLinkType(type) {
        if (hiddenLinkTypes.has(type)) {
            hiddenLinkTypes.delete(type);
        } else {
            hiddenLinkTypes.add(type);
        }
        hiddenLinkTypes = hiddenLinkTypes;
    }

    $: {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            searchResults = nodes.filter(n =>
                n.content?.toLowerCase().includes(query) ||
                n.type?.toLowerCase().includes(query)
            );
            if (searchResults.length > 0 && !highlightedNodeId) {
                highlightedNodeId = searchResults[0].id;
            }
        } else {
            searchResults = [];
            highlightedNodeId = null;
        }
    }

    function selectSearchResult(node) {
        highlightedNodeId = node.id;
        selectedNodes.set([node.id]);
        dispatch('nodeSelect', { id: node.id });
        panToNode(node);
    }

    function panToNode(node) {
        if (!containerElement) return;
        const rect = containerElement.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        panX = centerX - (node.x + NODE_WIDTH / 2) * zoom;
        panY = centerY - (node.y + NODE_HEIGHT / 2) * zoom;
    }

    function clearSearch() {
        searchQuery = '';
        searchResults = [];
        highlightedNodeId = null;
    }

    function nextSearchResult() {
        if (searchResults.length === 0) return;
        const currentIndex = searchResults.findIndex(r => r.id === highlightedNodeId);
        const nextIndex = (currentIndex + 1) % Math.min(searchResults.length, 5);
        const node = searchResults[nextIndex];
        highlightedNodeId = node.id;
        panToNode(node);
    }

    function prevSearchResult() {
        if (searchResults.length === 0) return;
        const currentIndex = searchResults.findIndex(r => r.id === highlightedNodeId);
        const maxIndex = Math.min(searchResults.length, 5);
        const prevIndex = (currentIndex - 1 + maxIndex) % maxIndex;
        const node = searchResults[prevIndex];
        highlightedNodeId = node.id;
        panToNode(node);
    }

    $: minimapBounds = (() => {
        if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + NODE_WIDTH);
            maxY = Math.max(maxY, node.y + NODE_HEIGHT);
        });
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    })();

    $: minimapViewport = (() => {
        if (!containerElement) return { x: 0, y: 0, width: 100, height: 100 };
        const rect = containerElement?.getBoundingClientRect();
        const viewWidth = (rect?.width || 400) / zoom;
        const viewHeight = (rect?.height || 300) / zoom;
        const viewX = -panX / zoom;
        const viewY = -panY / zoom;
        return { x: viewX, y: viewY, width: viewWidth, height: viewHeight };
    })();

    function handleMinimapClick(e) {
        const minimapEl = e.currentTarget;
        const rect = minimapEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const minimapWidth = 150;
        const minimapHeight = 100;
        const worldX = minimapBounds.minX + (clickX / minimapWidth) * minimapBounds.width;
        const worldY = minimapBounds.minY + (clickY / minimapHeight) * minimapBounds.height;

        const containerRect = containerElement.getBoundingClientRect();
        panX = containerRect.width / 2 - worldX * zoom;
        panY = containerRect.height / 2 - worldY * zoom;
    }

    function deleteSelected() {
        if (selectedCanvasItem) {
            deleteSelectedCanvasItem();
            return;
        }

        if ($selectedLink) {
            saveUndoState();
            links.update(l => l.filter(link => !(link.from === $selectedLink.from && link.to === $selectedLink.to)));
            selectedLink.set(null);
            selectedLinkId = null;
            return;
        }

        if ($selectedNodes.length > 0) {
            const nodeId = $selectedNodes[0];
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                deleteNode(node);
                selectedNodes.set([]);
            }
        }
    }

    function handleKeydown(e) {
        if (e.target.classList?.contains('graph-search-input')) {
            if (e.key === 'ArrowDown' && searchResults.length > 0) {
                e.preventDefault();
                nextSearchResult();
                return;
            }
            if (e.key === 'ArrowUp' && searchResults.length > 0) {
                e.preventDefault();
                prevSearchResult();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedNodeId) {
                    const result = searchResults.find(r => r.id === highlightedNodeId);
                    if (result) {
                        selectSearchResult(result);
                    }
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                clearSearch();
                e.target.blur();
                return;
            }
            return;
        }

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        if (e.key === 'Escape') {
            contextMenu = null;
            if (isLinkingMode) {
                isLinkingMode = false;
                linkSourceId = null;
            }
            if (searchQuery) {
                clearSearch();
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
            e.preventDefault();
            redo();
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            deleteSelected();
        }

        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            dispatch('addEntity', { x: 0, y: 0 });
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="graph-canvas-container" bind:this={containerElement}>
    <div class="toolbar">
        <div class="toolbar-search-wrapper">
            <div class="toolbar-search-box">
                <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                    type="text"
                    class="graph-search-input"
                    placeholder="Search in graph..."
                    bind:value={searchQuery}
                />
                {#if searchQuery}
                    <button class="search-clear" on:click={clearSearch}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                {/if}
            </div>
            {#if searchResults.length > 0}
                <div class="search-results">
                    <div class="search-results-header">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        <span class="search-nav-hint">↑↓ nav • Enter select</span>
                    </div>
                    {#each searchResults.slice(0, 5) as result, i}
                        <button
                            class="search-result-item"
                            class:highlighted={highlightedNodeId === result.id}
                            on:click={() => selectSearchResult(result)}
                            on:mouseenter={() => { highlightedNodeId = result.id; panToNode(result); }}
                        >
                            <span class="result-type" style="color: {getEntityType(result.type).color}">{result.type}</span>
                            <span class="result-name">{result.content?.substring(0, 30)}{result.content?.length > 30 ? '...' : ''}</span>
                        </button>
                    {/each}
                    {#if searchResults.length > 5}
                        <div class="search-more">+{searchResults.length - 5} more</div>
                    {/if}
                </div>
            {/if}
        </div>

        <div class="toolbar-divider"></div>

        <div class="layout-selector">
            <label>Layout:</label>
            <select bind:value={currentLayout} on:change={handleLayoutChange}>
                <option value="hierarchy">Hierarchy</option>
                <option value="tree">Tree</option>
                <option value="circular">Circular</option>
                <option value="star">Star</option>
                <option value="peacock">Peacock</option>
                <option value="compactPeacock">Compact Peacock</option>
                <option value="grouped">Grouped</option>
                <option value="force">Force</option>
                <option value="timeline">Timeline</option>
                <option value="grid">Grid</option>
                <option value="spread">Spread</option>
            </select>
        </div>
        <div class="spacing-control">
            <label>Spacing:</label>
            <input
                type="range"
                min="0.5"
                max="5"
                step="0.25"
                bind:value={layoutSpacing}
                on:change={handleLayoutChange}
            />
            <span class="spacing-value">{layoutSpacing.toFixed(1)}x</span>
        </div>
        <button class="toolbar-btn" on:click={fitToView} title="Fit to View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
        </button>
        <button class="toolbar-btn" on:click={applyLayout} title="Re-arrange">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
        </button>
        <div class="toolbar-divider"></div>
        <button
            class="toolbar-btn"
            on:click={undo}
            disabled={!$canUndo}
            title="Undo (Ctrl+Z)"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
        </button>
        <button
            class="toolbar-btn"
            on:click={redo}
            disabled={!$canRedo}
            title="Redo (Ctrl+Shift+Z)"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/>
            </svg>
        </button>
        <div class="toolbar-divider"></div>
        <button
            class="toolbar-btn"
            class:active={compactMode}
            on:click={() => compactMode = !compactMode}
            title="Compact nodes"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
        </button>
        <button
            class="toolbar-btn"
            class:active={enableDragging}
            on:click={() => enableDragging = !enableDragging}
            title="Enable node dragging"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/>
            </svg>
        </button>
        <button
            class="toolbar-btn"
            class:active={useCurvedLinks}
            on:click={() => useCurvedLinks = !useCurvedLinks}
            title="Curved links"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16c4-4 8 4 12 0s4-4 4-8"/>
            </svg>
        </button>
        <button
            class="toolbar-btn"
            class:active={showMinimap}
            on:click={() => showMinimap = !showMinimap}
            title="Toggle minimap"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
        </button>
        <div class="toolbar-divider"></div>
        <button
            class="toolbar-btn"
            on:click={() => {
                const centerPos = screenToWorld(containerElement?.clientWidth / 2 || 400, containerElement?.clientHeight / 2 || 300);
                openNoteModal({ x: centerPos.x - 75, y: centerPos.y - 50 });
            }}
            title="Add Sticky Note"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
        </button>
        <button
            class="toolbar-btn"
            on:click={() => {
                const centerPos = screenToWorld(containerElement?.clientWidth / 2 || 400, containerElement?.clientHeight / 2 || 300);
                openImageModal({ x: centerPos.x - NODE_WIDTH / 2, y: centerPos.y - NODE_WIDTH * 0.375 });
            }}
            title="Add Image"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
        </button>
        <button
            class="toolbar-btn"
            on:click={() => {
                const centerPos = screenToWorld(containerElement?.clientWidth / 2 || 400, containerElement?.clientHeight / 2 || 300);
                openPinModal({ x: centerPos.x, y: centerPos.y });
            }}
            title="Add Pin"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
        </button>
        {#if $groups.length > 0}
            <div class="group-filter-wrapper">
                <button
                    class="toolbar-btn"
                    class:active={showGroupFilter}
                    on:click={() => showGroupFilter = !showGroupFilter}
                    title="Manage groups"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                </button>
                {#if showGroupFilter}
                    <div class="group-filter-dropdown">
                        <div class="filter-header">Groups</div>
                        {#each $groups as grp}
                            <div class="group-filter-item">
                                <span class="group-color-dot" style="background: {grp.color}"></span>
                                <span class="group-filter-name">{grp.name}</span>
                                <button
                                    class="group-filter-btn"
                                    class:active={!grp.hidden}
                                    on:click={() => toggleGroupHidden(grp.id)}
                                    title={grp.hidden ? 'Show group' : 'Hide group'}
                                >
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {#if grp.hidden}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                        {:else}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        {/if}
                                    </svg>
                                </button>
                                <button
                                    class="group-filter-btn"
                                    class:active={grp.collapsed}
                                    on:click={() => toggleGroupCollapsed(grp.id)}
                                    title={grp.collapsed ? 'Expand group' : 'Collapse group'}
                                >
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {#if grp.collapsed}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                        {:else}
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                                        {/if}
                                    </svg>
                                </button>
                            </div>
                        {/each}
                        <div class="filter-divider"></div>
                        <button class="group-action-btn" on:click={() => { separateGroups(); showGroupFilter = false; }}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                            </svg>
                            Separate Groups
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
        <div class="priority-filter-wrapper">
            <button
                class="toolbar-btn"
                class:active={showPriorityFilter}
                on:click={() => showPriorityFilter = !showPriorityFilter}
                title="Priority filter"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
                </svg>
            </button>
            {#if showPriorityFilter}
                <div class="group-filter-dropdown">
                    <div class="filter-header">Priority</div>
                    <div class="group-filter-item">
                        <span class="priority-indicator high"></span>
                        <span class="group-filter-name">High Priority</span>
                        <button
                            class="group-filter-btn"
                            class:active={showHighPriority}
                            on:click={() => showHighPriority = !showHighPriority}
                            title={showHighPriority ? 'Hide high priority' : 'Show high priority'}
                        >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {#if !showHighPriority}
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                {:else}
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                {/if}
                            </svg>
                        </button>
                    </div>
                    <div class="group-filter-item">
                        <span class="priority-indicator low"></span>
                        <span class="group-filter-name">Low Priority</span>
                        <button
                            class="group-filter-btn"
                            class:active={showLowPriority}
                            on:click={() => showLowPriority = !showLowPriority}
                            title={showLowPriority ? 'Hide low priority' : 'Show low priority'}
                        >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {#if !showLowPriority}
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                {:else}
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                {/if}
                            </svg>
                        </button>
                    </div>
                </div>
            {/if}
        </div>
        <div class="toolbar-divider"></div>
        <button
            class="toolbar-btn"
            class:active={isLinkingMode}
            on:click={startLinkMode}
            title="Draw Link"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
        </button>
        <div class="link-filter-wrapper">
            <button
                class="toolbar-btn"
                class:active={showLinkFilter}
                on:click={() => showLinkFilter = !showLinkFilter}
                title="Filter link types"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                </svg>
            </button>
            {#if showLinkFilter}
                <div class="link-filter-dropdown">
                    <div class="filter-header">Show Link Types</div>
                    {#each Object.entries(LINK_TYPES) as [type, config]}
                        <label class="filter-item">
                            <input
                                type="checkbox"
                                checked={!hiddenLinkTypes.has(type)}
                                on:change={() => toggleLinkType(type)}
                            />
                            <span class="filter-color" style="background: {config.color}"></span>
                            <span class="filter-label">{config.label}</span>
                        </label>
                    {/each}
                </div>
            {/if}
        </div>
        {#if isLinkingMode}
            <div class="toolbar-divider"></div>
            <span class="toolbar-hint">
                <span class="linking-hint">Click two nodes to link • ESC to cancel</span>
            </span>
        {/if}
        <div class="toolbar-spacer"></div>
        <button class="toolbar-btn export-btn" on:click={exportGraphToHtml} title="Export graph to HTML">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
        </button>
        <span class="zoom-indicator">{Math.round(zoom * 100)}%</span>
    </div>

    <svg
        bind:this={svgElement}
        class="graph-svg"
        on:wheel={handleWheel}
        on:mousedown={handleMouseDown}
        on:mousemove={handleMouseMove}
        on:mouseup={handleMouseUp}
        on:mouseleave={handleMouseUp}
        on:contextmenu={handleContextMenu}
        on:click={handleCanvasClick}
    >
        <rect class="canvas-bg" width="100%" height="100%" fill="#0a0f1a"/>

        {#if nodes.length === 0 && $canvasNotes.length === 0 && $canvasImages.length === 0 && $canvasPins.length === 0}
            <g class="empty-state">
                <text x="50%" y="45%" text-anchor="middle" class="empty-state-title">
                    Right-click to add your first entity
                </text>
                <text x="50%" y="52%" text-anchor="middle" class="empty-state-hint">
                    or press Shift+Tab anywhere
                </text>
                <text x="50%" y="62%" text-anchor="middle" class="empty-state-tips">
                    Scroll to zoom • Drag to pan • Delete to remove
                </text>
            </g>
        {/if}

        <g transform="translate({panX}, {panY}) scale({zoom})">
            <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1f2937" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)"/>

            {#each groupBounds as group}
                {#if !group.hidden}
                    <g class="node-group" on:dblclick={() => editGroup(group)}>
                        {#if group.collapsed}
                            <rect
                                x={group.x}
                                y={group.y}
                                width="160"
                                height="60"
                                fill={group.color}
                                fill-opacity="0.2"
                                stroke={group.color}
                                stroke-width="2"
                                rx="8"
                            />
                            <text
                                x={group.x + 12}
                                y={group.y + 24}
                                fill={group.color}
                                font-size="13"
                                font-weight="600"
                                class="group-label"
                            >{group.name}</text>
                            <text
                                x={group.x + 12}
                                y={group.y + 44}
                                fill={group.color}
                                fill-opacity="0.7"
                                font-size="11"
                                class="group-label"
                            >{group.nodeIds.length} nodes</text>
                            <g
                                class="group-toggle"
                                transform="translate({group.x + 130}, {group.y + 20})"
                                on:click|stopPropagation={() => toggleGroupCollapsed(group.id)}
                            >
                                <circle r="12" fill={group.color} fill-opacity="0.3"/>
                                <path d="M-4,-2 L0,4 L4,-2" stroke={group.color} stroke-width="2" fill="none"/>
                            </g>
                        {:else}
                            <rect
                                x={group.x}
                                y={group.y}
                                width={group.width}
                                height={group.height}
                                fill={group.color}
                                fill-opacity="0.1"
                                stroke={group.color}
                                stroke-width="2"
                                stroke-dasharray="8 4"
                                rx="12"
                            />
                            <text
                                x={group.x + 12}
                                y={group.y + 20}
                                fill={group.color}
                                font-size="12"
                                font-weight="600"
                                class="group-label"
                            >{group.name}</text>
                            <g
                                class="group-toggle"
                                transform="translate({group.x + group.width - 20}, {group.y + 20})"
                                on:click|stopPropagation={() => toggleGroupCollapsed(group.id)}
                            >
                                <circle r="12" fill={group.color} fill-opacity="0.3"/>
                                <path d="M-4,2 L0,-4 L4,2" stroke={group.color} stroke-width="2" fill="none"/>
                            </g>
                            <g
                                class="group-toggle"
                                transform="translate({group.x + group.width - 48}, {group.y + 20})"
                                on:click|stopPropagation={() => toggleGroupHidden(group.id)}
                            >
                                <circle r="12" fill={group.color} fill-opacity="0.3"/>
                                <path d="M-5,0 L5,0 M0,-5 L0,5" stroke={group.color} stroke-width="2" fill="none" transform="rotate(45)"/>
                            </g>
                        {/if}
                    </g>
                {/if}
            {/each}

            {#each linksWithPaths as link}
                {#if link.valid && !collapsedNodeIds.has(link.from) && !collapsedNodeIds.has(link.to)}
                    {@const linkType = LINK_TYPES[link.type] || LINK_TYPES.associate}
                    {@const isSelected = selectedLinkId === getLinkId(link)}
                    <g
                        class="link-group"
                        class:selected={isSelected}
                        on:click={(e) => handleLinkClick(e, link)}
                        on:dblclick={(e) => handleLinkDblClick(e, link)}
                        on:contextmenu={(e) => handleLinkContextMenu(e, link)}
                    >
                        <path
                            d={link.path}
                            stroke="transparent"
                            stroke-width="20"
                            fill="none"
                            class="link-hitarea"
                        />
                        <path
                            d={link.path}
                            stroke={isSelected ? '#22d3ee' : (link.isConnectedToSelected ? '#6ee7b7' : (link.customColor || linkType.color))}
                            stroke-width={isSelected ? 4 : (link.isConnectedToSelected ? 3 : (link.customColor ? 3 : 2))}
                            stroke-dasharray={getStrokeDasharray(linkType.style)}
                            fill="none"
                            class="link-path"
                            class:highlighted={link.isConnectedToSelected}
                        />
                        {#if showLinkLabels}
                            <rect
                                x={link.midpoint.x - 50}
                                y={link.midpoint.y - 20}
                                width="100"
                                height="24"
                                rx="4"
                                fill="rgba(17, 24, 39, 0.9)"
                                class="link-label-bg"
                            />
                            <text
                                x={link.midpoint.x}
                                y={link.midpoint.y - 4}
                                class="link-label"
                                fill={isSelected ? '#22d3ee' : (link.customColor || linkType.color)}
                            >
                                {link.label || linkType.label}
                            </text>
                            {#if link.description}
                                <text
                                    x={link.midpoint.x}
                                    y={link.midpoint.y + 16}
                                    class="link-description"
                                    fill="#9ca3af"
                                >
                                    {link.description.substring(0, 25)}{link.description.length > 25 ? '...' : ''}
                                </text>
                            {/if}
                        {/if}
                    </g>
                {/if}
            {/each}

            {#if isLinkingMode && linkSourceId}
                {@const sourceNode = getNodeById(linkSourceId)}
                {#if sourceNode}
                    <line
                        x1={sourceNode.x + NODE_WIDTH / 2}
                        y1={sourceNode.y + NODE_HEIGHT / 2}
                        x2={linkTargetPos.x}
                        y2={linkTargetPos.y}
                        stroke="#22d3ee"
                        stroke-width="2"
                        stroke-dasharray="5,5"
                        class="creating-link"
                    />
                {/if}
            {/if}

            {#each nodes.filter(n => {
                if (collapsedNodeIds.has(n.id)) return false;
                const priority = n.priority || 'none';
                if (priority === 'high' && !showHighPriority) return false;
                if (priority === 'low' && !showLowPriority) return false;
                return true;
            }) as node (node.id)}
                {@const entityType = getEntityType(node.type)}
                {@const isSelected = $selectedNodes.includes(node.id)}
                {@const isLinkSource = isLinkingMode && linkSourceId === node.id}
                {@const canBeTarget = isLinkingMode && linkSourceId && linkSourceId !== node.id}
                {@const isDragging = isDraggingNode && dragNodeId === node.id}
                {@const connectionCount = $allLinks.filter(l => l.from === node.id || l.to === node.id).length}
                {@const isSearchHighlight = highlightedNodeId === node.id}
                {@const nodePriority = node.priority || 'none'}
                {@const isHighPriority = nodePriority === 'high'}
                {@const isLowPriority = nodePriority === 'low'}
                <g
                    class="node-group"
                    class:linking-mode={canBeTarget}
                    class:link-source={isLinkSource}
                    class:draggable={enableDragging && !isLinkingMode}
                    class:dragging={isDragging}
                    class:high-priority={isHighPriority}
                    class:low-priority={isLowPriority}
                    transform="translate({node.x}, {node.y})"
                    on:mousedown={(e) => handleNodeMouseDown(e, node)}
                    on:click={(e) => handleNodeClick(e, node)}
                    on:dblclick={(e) => handleNodeDblClick(e, node)}
                    on:contextmenu={(e) => handleNodeContextMenu(e, node)}
                >
                    {#if isHighPriority}
                        <rect
                            x="-6"
                            y="-6"
                            width={NODE_WIDTH + 12}
                            height={NODE_HEIGHT + 12}
                            rx={compactMode ? 10 : 14}
                            fill="none"
                            stroke="#ef4444"
                            stroke-width="2"
                            class="priority-glow high"
                        />
                    {/if}

                    {#if isSelected || isLinkSource || isSearchHighlight}
                        <rect
                            x="-4"
                            y="-4"
                            width={NODE_WIDTH + 8}
                            height={NODE_HEIGHT + 8}
                            rx={compactMode ? 8 : 12}
                            fill="none"
                            stroke={isLinkSource ? "#f59e0b" : (isSearchHighlight ? "#f59e0b" : "#22d3ee")}
                            stroke-width={isSearchHighlight ? 3 : 2}
                            class="selection-glow"
                            class:search-highlight={isSearchHighlight}
                        />
                    {/if}

                    <rect
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx={compactMode ? 6 : 10}
                        fill={entityType.bg}
                        stroke={entityType.color}
                        stroke-width="2"
                        class="node-bg"
                    />

                    {#if compactMode}
                        {@const icon = ENTITY_ICONS[node.type] || ENTITY_ICONS['object']}
                        <g transform="translate(8, {NODE_HEIGHT / 2 - 8})">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                {#if icon.fill}
                                    <path d={icon.path} fill={entityType.color} stroke="none"/>
                                {:else}
                                    <path d={icon.path} fill="none" stroke={entityType.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                {/if}
                            </svg>
                        </g>
                        {#if showLabels}
                            <text x="28" y={NODE_HEIGHT / 2 + 4} class="node-title compact" fill="#e5e7eb" text-anchor="start">
                                {node.content?.substring(0, 8)}{node.content?.length > 8 ? '…' : ''}
                            </text>
                        {/if}
                    {:else}
                        <circle
                            cx={NODE_WIDTH / 2}
                            cy="28"
                            r="20"
                            fill="rgba(0,0,0,0.3)"
                        />

                        {@const nodeImage = node.metadata?.imageId ? $images[node.metadata.imageId] : null}
                        {#if nodeImage}
                            <clipPath id="clip-{node.id}">
                                <circle cx={NODE_WIDTH / 2} cy="28" r="18" />
                            </clipPath>
                            <image
                                x={NODE_WIDTH / 2 - 18}
                                y="10"
                                width="36"
                                height="36"
                                href={nodeImage}
                                preserveAspectRatio="xMidYMid slice"
                                clip-path="url(#clip-{node.id})"
                            />
                        {:else}
                            {@const icon = ENTITY_ICONS[node.type] || ENTITY_ICONS['object']}
                            <g transform="translate({NODE_WIDTH / 2 - 14}, 14)">
                                <svg width="28" height="28" viewBox="0 0 24 24">
                                    {#if icon.fill}
                                        <path d={icon.path} fill={entityType.color} stroke="none"/>
                                    {:else}
                                        <path d={icon.path} fill="none" stroke={entityType.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    {/if}
                                </svg>
                            </g>
                        {/if}

                        {#if showLabels}
                            <text x={NODE_WIDTH / 2} y="62" class="node-title" fill="#e5e7eb" text-anchor="middle">
                                {node.content?.substring(0, 18)}{node.content?.length > 18 ? '…' : ''}
                            </text>
                        {/if}

                        {#if showTypeLabels}
                            <text x={NODE_WIDTH / 2} y="74" class="node-type-label" fill={entityType.color} text-anchor="middle">
                                {entityType.label}
                            </text>
                        {/if}
                    {/if}

                    {#if showConnectionCounts && connectionCount > 0}
                        <circle cx={NODE_WIDTH - 8} cy="8" r={compactMode ? 8 : 10} fill="#1f2937" stroke={entityType.color} stroke-width="1"/>
                        <text x={NODE_WIDTH - 8} y={compactMode ? 11 : 12} class="connection-count" fill={entityType.color}>
                            {connectionCount}
                        </text>
                    {/if}

                </g>
            {/each}

            {#each $canvasNotes as note (note.id)}
                <g
                    class="canvas-note"
                    class:selected={selectedCanvasItem?.type === 'note' && selectedCanvasItem?.id === note.id}
                    transform="translate({note.x}, {note.y})"
                    on:click|stopPropagation={(e) => selectCanvasItem(e, 'note', note.id)}
                    on:dblclick={() => editNote(note)}
                    on:contextmenu|preventDefault|stopPropagation={(e) => {
                        selectCanvasItem(e, 'note', note.id);
                        contextMenu = { x: e.clientX, y: e.clientY, type: 'note', note };
                    }}
                >
                    {#if selectedCanvasItem?.type === 'note' && selectedCanvasItem?.id === note.id}
                        <rect x="-3" y="-3" width={note.width + 6} height={note.height + 6} fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="4,2" rx="6"/>
                    {/if}
                    <rect
                        x="3"
                        y="3"
                        width={note.width}
                        height={note.height}
                        fill="rgba(0,0,0,0.3)"
                        rx="4"
                    />
                    <rect
                        width={note.width}
                        height={note.height}
                        fill={note.color}
                        rx="4"
                    />
                    <rect
                        x="0"
                        y="0"
                        width={note.width}
                        height="20"
                        fill="rgba(0,0,0,0.15)"
                        rx="4"
                        class="note-drag-handle"
                        on:mousedown={(e) => handleCanvasItemMouseDown(e, 'note', note.id, note.x, note.y)}
                    />
                    <g transform="translate({note.width / 2}, 10)">
                        <circle cx="-8" cy="0" r="2" fill="rgba(0,0,0,0.3)"/>
                        <circle cx="0" cy="0" r="2" fill="rgba(0,0,0,0.3)"/>
                        <circle cx="8" cy="0" r="2" fill="rgba(0,0,0,0.3)"/>
                    </g>
                    <path
                        d="M {note.width - 20} 0 L {note.width} 20 L {note.width - 20} 20 Z"
                        fill="rgba(0,0,0,0.1)"
                    />
                    <foreignObject x="8" y="24" width={note.width - 16} height={note.height - 32}>
                        <div class="note-text" xmlns="http://www.w3.org/1999/xhtml">
                            {note.text}
                        </div>
                    </foreignObject>
                </g>
            {/each}

            {#each $canvasImages as image (image.id)}
                {@const imageSrc = image.imageId ? getImageSrc(image.imageId) : image.src}
                <g
                    class="canvas-image"
                    class:selected={selectedCanvasItem?.type === 'image' && selectedCanvasItem?.id === image.id}
                    transform="translate({image.x}, {image.y})"
                    on:click|stopPropagation={(e) => selectCanvasItem(e, 'image', image.id)}
                    on:dblclick={() => editImage(image)}
                    on:contextmenu|preventDefault|stopPropagation={(e) => {
                        selectCanvasItem(e, 'image', image.id);
                        contextMenu = { x: e.clientX, y: e.clientY, type: 'image', image };
                    }}
                >
                    {#if selectedCanvasItem?.type === 'image' && selectedCanvasItem?.id === image.id}
                        <rect x="-7" y="-24" width={image.width + 14} height={image.height + (image.caption ? 52 : 32)} fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="4,2" rx="6"/>
                    {/if}
                    <rect
                        x="-4"
                        y="-20"
                        width={image.width + 8}
                        height="16"
                        fill="#374151"
                        rx="4"
                        class="image-drag-handle"
                        on:mousedown={(e) => handleCanvasItemMouseDown(e, 'image', image.id, image.x, image.y)}
                    />
                    <g transform="translate({image.width / 2}, -12)">
                        <circle cx="-12" cy="0" r="2" fill="#6b7280"/>
                        <circle cx="-4" cy="0" r="2" fill="#6b7280"/>
                        <circle cx="4" cy="0" r="2" fill="#6b7280"/>
                        <circle cx="12" cy="0" r="2" fill="#6b7280"/>
                    </g>
                    <rect
                        x="-4"
                        y="-4"
                        width={image.width + 8}
                        height={image.height + (image.caption ? 28 : 8)}
                        fill="#1f2937"
                        stroke="#374151"
                        stroke-width="2"
                        rx="4"
                    />
                    {#if imageSrc}
                        <image
                            href={imageSrc}
                            width={image.width}
                            height={image.height}
                            preserveAspectRatio="xMidYMid slice"
                        />
                    {:else}
                        <rect width={image.width} height={image.height} fill="#374151"/>
                        <text x={image.width/2} y={image.height/2} fill="#6b7280" font-size="12" text-anchor="middle">No image</text>
                    {/if}
                    <rect
                        x={image.width - 8}
                        y={image.height - 8}
                        width="12"
                        height="12"
                        fill="#22d3ee"
                        rx="2"
                        class="resize-handle"
                        on:mousedown={(e) => handleImageResizeStart(e, image.id, image.width)}
                    />
                    {#if image.caption}
                        <text
                            x={image.width / 2}
                            y={image.height + 16}
                            fill="#9ca3af"
                            font-size="11"
                            text-anchor="middle"
                            class="image-caption"
                        >
                            {image.caption.substring(0, 30)}{image.caption.length > 30 ? '...' : ''}
                        </text>
                    {/if}
                </g>
            {/each}

            {#each $canvasPins as pin (pin.id)}
                <g
                    class="canvas-pin"
                    class:selected={selectedCanvasItem?.type === 'pin' && selectedCanvasItem?.id === pin.id}
                    transform="translate({pin.x}, {pin.y})"
                    on:click|stopPropagation={(e) => selectCanvasItem(e, 'pin', pin.id)}
                    on:mousedown={(e) => handleCanvasItemMouseDown(e, 'pin', pin.id, pin.x, pin.y)}
                    on:dblclick={() => editPin(pin)}
                    on:contextmenu|preventDefault|stopPropagation={(e) => {
                        selectCanvasItem(e, 'pin', pin.id);
                        contextMenu = { x: e.clientX, y: e.clientY, type: 'pin', pin };
                    }}
                >
                    {#if selectedCanvasItem?.type === 'pin' && selectedCanvasItem?.id === pin.id}
                        <circle cx="0" cy="-12" r="14" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="3,2"/>
                    {/if}
                    <ellipse cx="2" cy="2" rx="8" ry="4" fill="rgba(0,0,0,0.3)"/>
                    <circle cx="0" cy="-12" r="10" fill={pin.color} stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                    <path d="M 0 -2 L 0 8" stroke={pin.color} stroke-width="3" stroke-linecap="round"/>
                    <path d="M 0 -2 L 0 8" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
                    {#if pin.label}
                        <text
                            x="0"
                            y="-28"
                            fill="#e5e7eb"
                            font-size="11"
                            text-anchor="middle"
                            class="pin-label"
                        >
                            {pin.label.substring(0, 15)}{pin.label.length > 15 ? '...' : ''}
                        </text>
                    {/if}
                </g>
            {/each}
        </g>
    </svg>

    <input
        type="file"
        accept="image/*"
        class="hidden"
        bind:this={fileInputRef}
        on:change={handleImageUpload}
    />

    {#if contextMenu}
        <div class="context-menu" style="left: {contextMenu.x}px; top: {contextMenu.y}px;">
            {#if contextMenu.type === 'canvas'}
                <button class="context-menu-item" on:click={addEntityFromContext}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Entity
                </button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item" on:click={() => { openNoteModal(contextMenu.worldPos); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Add Sticky Note
                </button>
                <button class="context-menu-item" on:click={() => { openImageModal(contextMenu.worldPos); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Add Image
                </button>
                <button class="context-menu-item" on:click={() => { openPinModal(contextMenu.worldPos); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Add Pin
                </button>
            {:else if contextMenu.type === 'pin'}
                <div class="context-menu-header">Pin</div>
                <button class="context-menu-item" on:click={() => { editPin(contextMenu.pin); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit
                </button>
                <button class="context-menu-item danger" on:click={() => { deletePin(contextMenu.pin.id); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                </button>
            {:else if contextMenu.type === 'note'}
                <div class="context-menu-header">Sticky Note</div>
                <button class="context-menu-item" on:click={() => { editNote(contextMenu.note); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit
                </button>
                <button class="context-menu-item danger" on:click={() => { deleteNote(contextMenu.note.id); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                </button>
            {:else if contextMenu.type === 'image'}
                <div class="context-menu-header">Image</div>
                <button class="context-menu-item" on:click={() => { editImage(contextMenu.image); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit
                </button>
                <button class="context-menu-item danger" on:click={() => { deleteImage(contextMenu.image.id); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                </button>
            {:else if contextMenu.type === 'node'}
                <div class="context-menu-header">{contextMenu.node.content?.substring(0, 20)}</div>
                <button class="context-menu-item" on:click={() => { dispatch('editEntity', contextMenu.node); contextMenu = null; }}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit
                </button>
                <div class="context-menu-divider"></div>
                <button class="context-menu-item danger" on:click={deleteSelectedNode}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                </button>
            {:else if contextMenu.type === 'link'}
                <div class="context-menu-header">Link: {contextMenu.link.label || 'Connection'}</div>
                <button class="context-menu-item" on:click={editLinkFromContext}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit Connection
                </button>
                <button class="context-menu-item danger" on:click={deleteLink}>
                    <svg class="ctx-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete Connection
                </button>
            {/if}
        </div>
    {/if}

    <CanvasItemModals
        bind:showNoteModal
        bind:showImageModal
        bind:showPinModal
        bind:showGroupModal
        bind:noteText
        bind:noteColor
        bind:imageCaption
        bind:pinLabel
        bind:pinColor
        bind:groupName
        bind:groupColor
        {editingNote}
        {editingImage}
        {editingPin}
        {editingGroup}
        getImageSrc={getImageSrcForModal}
        on:closeNote={() => showNoteModal = false}
        on:closeImage={() => showImageModal = false}
        on:closePin={() => showPinModal = false}
        on:closeGroup={() => showGroupModal = false}
        on:saveNote={saveNote}
        on:deleteNote={(e) => deleteNote(e.detail)}
        on:saveImageCaption={saveImageCaption}
        on:deleteImage={(e) => deleteImage(e.detail)}
        on:uploadImage={(e) => handleImageUpload(e.detail)}
        on:savePin={savePin}
        on:deletePin={(e) => deletePin(e.detail)}
        on:saveGroup={saveGroup}
        on:deleteGroup={(e) => deleteGroup(e.detail)}
        on:updateNoteColor={(e) => noteColor = e.detail}
        on:updatePinColor={(e) => pinColor = e.detail}
        on:updateGroupColor={(e) => groupColor = e.detail}
    />

    {#if showMinimap && nodes.length > 0}
        <div class="minimap" on:click={handleMinimapClick}>
            <svg viewBox="{minimapBounds.minX} {minimapBounds.minY} {minimapBounds.width} {minimapBounds.height}" preserveAspectRatio="xMidYMid meet">
                {#each linksWithPaths as link}
                    {#if link.valid}
                        <path
                            d={link.path}
                            stroke="#374151"
                            stroke-width="2"
                            fill="none"
                        />
                    {/if}
                {/each}
                {#each nodes as node}
                    {@const isHighlighted = highlightedNodeId === node.id}
                    <rect
                        x={node.x}
                        y={node.y}
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        fill={isHighlighted ? '#f59e0b' : getEntityType(node.type).color}
                        rx="4"
                        opacity={isHighlighted ? 1 : 0.7}
                    />
                {/each}
                <rect
                    x={minimapViewport.x}
                    y={minimapViewport.y}
                    width={minimapViewport.width}
                    height={minimapViewport.height}
                    fill="none"
                    stroke="#22d3ee"
                    stroke-width="4"
                    rx="4"
                />
            </svg>
        </div>
    {/if}

</div>

<style>
    .graph-canvas-container {
        width: 100%;
        height: 100%;
        position: relative;
        background: #0a0f1a;
        overflow: hidden;
    }

    /* Empty state styling */
    .empty-state-title {
        fill: #6b7280;
        font-size: 14px;
        font-weight: 500;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    }

    .empty-state-hint {
        fill: #4b5563;
        font-size: 12px;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    }

    .empty-state-tips {
        fill: #374151;
        font-size: 11px;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    }

    .toolbar {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(17, 24, 39, 0.9);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        z-index: 10;
    }

    .layout-selector {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .layout-selector label {
        font-size: 12px;
        color: #9ca3af;
    }

    .layout-selector select {
        padding: 4px 8px;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 4px;
        color: #e5e7eb;
        font-size: 12px;
        cursor: pointer;
    }

    .layout-selector select:hover {
        border-color: #22d3ee;
    }

    .spacing-control {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .spacing-control label {
        font-size: 12px;
        color: #9ca3af;
    }

    .spacing-control input[type="range"] {
        width: 60px;
        height: 4px;
        accent-color: #22d3ee;
        cursor: pointer;
    }

    .spacing-value {
        font-size: 11px;
        color: #22d3ee;
        font-family: 'JetBrains Mono', monospace;
        min-width: 32px;
    }

    .toolbar-btn {
        padding: 6px;
        background: transparent;
        border: 1px solid #374151;
        border-radius: 4px;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.2s;
    }

    .toolbar-btn:hover {
        background: rgba(34, 211, 238, 0.1);
        border-color: #22d3ee;
        color: #22d3ee;
    }

    .toolbar-btn.active {
        background: rgba(245, 158, 11, 0.2);
        border-color: #f59e0b;
        color: #f59e0b;
    }

    .toolbar-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .toolbar-btn:disabled:hover {
        background: transparent;
        border-color: #374151;
        color: #9ca3af;
    }

    .toolbar-btn.export-btn {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: #22c55e;
    }

    .toolbar-btn.export-btn:hover {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.5);
    }

    .toolbar-divider {
        width: 1px;
        height: 20px;
        background: #374151;
    }

    .toolbar-hint {
        font-size: 11px;
        color: #6b7280;
    }

    .linking-hint {
        color: #f59e0b;
        font-weight: 500;
    }

    .toolbar-spacer {
        flex: 1;
    }

    .zoom-indicator {
        font-size: 12px;
        color: #22d3ee;
        font-family: 'JetBrains Mono', monospace;
    }

    .graph-svg {
        width: 100%;
        height: 100%;
        cursor: grab;
    }

    .graph-svg:active {
        cursor: grabbing;
    }

    .node-group {
        cursor: pointer;
    }

    .node-group.linking-mode {
        cursor: crosshair;
    }

    .node-group.linking-mode:hover .node-bg {
        filter: brightness(1.4);
    }

    .node-group.link-source {
        cursor: not-allowed;
    }

    .node-group.low-priority {
        opacity: 0.5;
    }

    .node-group.low-priority:hover {
        opacity: 0.8;
    }

    .priority-glow.high {
        animation: priority-pulse 1.5s infinite;
        filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
    }

    @keyframes priority-pulse {
        0%, 100% { opacity: 1; stroke-width: 2; }
        50% { opacity: 0.6; stroke-width: 3; }
    }

    .node-bg {
        transition: filter 0.2s;
    }

    .node-group:hover .node-bg {
        filter: brightness(1.2);
    }

    .node-title {
        font-size: 12px;
        font-weight: 600;
        font-family: 'JetBrains Mono', monospace;
    }

    .node-type-label {
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
        text-transform: capitalize;
    }

    .connection-count {
        font-size: 10px;
        text-anchor: middle;
        font-family: 'JetBrains Mono', monospace;
    }

    .selection-glow {
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .link-hitarea {
        cursor: pointer;
    }

    .link-path {
        cursor: pointer;
        transition: stroke-width 0.2s;
    }

    .link-group:hover .link-path {
        stroke-width: 4;
    }

    .link-group.selected .link-path {
        stroke-width: 4;
    }

    .link-label-bg {
        pointer-events: none;
    }

    .link-label {
        font-size: 10px;
        text-anchor: middle;
        font-family: 'JetBrains Mono', monospace;
        pointer-events: none;
        font-weight: 600;
    }

    .link-description {
        font-size: 9px;
        text-anchor: middle;
        font-family: 'JetBrains Mono', monospace;
        pointer-events: none;
    }

    .creating-link {
        pointer-events: none;
        animation: dash 0.5s linear infinite;
    }

    @keyframes dash {
        to { stroke-dashoffset: -10; }
    }

    .context-menu {
        position: fixed;
        background: rgba(17, 24, 39, 0.95);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        padding: 4px;
        min-width: 180px;
        z-index: 1000;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .context-menu-header {
        padding: 8px 12px;
        font-size: 11px;
        color: #6b7280;
        text-transform: uppercase;
        border-bottom: 1px solid #374151;
        margin-bottom: 4px;
    }

    .context-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        background: none;
        border: none;
        color: #e5e7eb;
        font-size: 13px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
    }

    .context-menu-item:hover {
        background: rgba(34, 211, 238, 0.1);
    }

    .context-menu-item.danger:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
    }

    .context-menu-divider {
        height: 1px;
        background: #374151;
        margin: 4px 0;
    }

    .ctx-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }

    .group-color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    /* Group Label */
    .group-label {
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: none;
    }

    .node-group {
        cursor: pointer;
    }

    /* Link Filter Dropdown */
    .link-filter-wrapper {
        position: relative;
    }

    .link-filter-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background: rgba(17, 24, 39, 0.95);
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        padding: 8px;
        min-width: 180px;
        z-index: 100;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .filter-header {
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #374151;
    }

    .filter-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        cursor: pointer;
        font-size: 12px;
        color: #e5e7eb;
    }

    .filter-item:hover {
        color: #22d3ee;
    }

    .filter-item input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: #22d3ee;
    }

    .filter-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
    }

    .filter-label {
        flex: 1;
    }

    .filter-divider {
        height: 1px;
        background: #374151;
        margin: 8px 0;
    }

    /* Group Filter Dropdown */
    .group-filter-wrapper,
    .priority-filter-wrapper {
        position: relative;
    }

    .priority-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .priority-indicator.high {
        background: #ef4444;
        box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
    }

    .priority-indicator.low {
        background: #6b7280;
        opacity: 0.6;
    }

    .group-filter-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background: rgba(17, 24, 39, 0.95);
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        padding: 8px;
        min-width: 220px;
        z-index: 100;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .group-filter-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 4px;
    }

    .group-filter-name {
        flex: 1;
        color: #e5e7eb;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .group-filter-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: 1px solid #374151;
        border-radius: 4px;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s;
    }

    .group-filter-btn:hover {
        border-color: #22d3ee;
        color: #22d3ee;
    }

    .group-filter-btn.active {
        background: rgba(34, 211, 238, 0.2);
        border-color: #22d3ee;
        color: #22d3ee;
    }

    .group-action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px;
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s;
    }

    .group-action-btn:hover {
        background: rgba(34, 211, 238, 0.1);
        color: #22d3ee;
    }

    .group-toggle {
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.15s;
    }

    .group-toggle:hover {
        opacity: 1;
    }

    /* Draggable node styles */
    .node-group.draggable {
        cursor: grab;
    }

    .node-group.draggable:active,
    .node-group.dragging {
        cursor: grabbing;
    }

    .node-group.dragging .node-bg {
        filter: brightness(1.3);
    }

    /* Compact mode node title */
    .node-title.compact {
        font-size: 11px;
    }

    /* Search box styles - integrated into toolbar */
    .toolbar-search-wrapper {
        position: relative;
    }

    .toolbar-search-box {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 4px;
        width: 180px;
    }

    .toolbar-search-box:focus-within {
        border-color: #22d3ee;
        box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.2);
    }

    .search-icon {
        width: 14px;
        height: 14px;
        color: #6b7280;
        flex-shrink: 0;
    }

    .graph-search-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: #e5e7eb;
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
        min-width: 0;
    }

    .graph-search-input::placeholder {
        color: #6b7280;
    }

    .search-clear {
        padding: 2px;
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .search-clear:hover {
        color: #ef4444;
    }

    .search-clear svg {
        width: 12px;
        height: 12px;
    }

    .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background: rgba(17, 24, 39, 0.98);
        border: 1px solid #374151;
        border-radius: 6px;
        overflow: hidden;
        min-width: 200px;
        z-index: 100;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .search-results-header {
        padding: 6px 10px;
        font-size: 10px;
        color: #6b7280;
        border-bottom: 1px solid #374151;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .search-nav-hint {
        color: #4b5563;
        font-size: 9px;
    }

    .search-result-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 6px 10px;
        background: none;
        border: none;
        color: #e5e7eb;
        font-size: 11px;
        cursor: pointer;
        text-align: left;
    }

    .search-result-item:hover {
        background: rgba(34, 211, 238, 0.1);
    }

    .search-result-item.highlighted {
        background: rgba(245, 158, 11, 0.2);
        border-left: 2px solid #f59e0b;
    }

    .result-type {
        font-size: 9px;
        text-transform: uppercase;
        font-weight: 600;
        min-width: 50px;
    }

    .result-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .search-more {
        padding: 4px 10px;
        font-size: 10px;
        color: #6b7280;
        border-top: 1px solid #374151;
        text-align: center;
    }

    /* Search highlight animation */
    .selection-glow.search-highlight {
        animation: searchPulse 1.5s ease-in-out infinite;
    }

    @keyframes searchPulse {
        0%, 100% { stroke-opacity: 1; }
        50% { stroke-opacity: 0.4; }
    }

    /* Minimap styles */
    .minimap {
        position: absolute;
        bottom: 12px;
        left: 12px;
        width: 150px;
        height: 100px;
        background: rgba(17, 24, 39, 0.9);
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        z-index: 20;
    }

    .minimap:hover {
        border-color: rgba(34, 211, 238, 0.6);
    }

    .minimap svg {
        width: 100%;
        height: 100%;
    }

    /* Canvas sticky notes */
    .canvas-note {
        cursor: default;
        transition: filter 0.15s;
    }

    .canvas-note.draggable {
        cursor: grab;
    }

    .canvas-note.draggable:active {
        cursor: grabbing;
    }

    .canvas-note:hover {
        filter: brightness(1.1);
    }

    .note-text {
        color: #1f2937;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        word-wrap: break-word;
        overflow: hidden;
        line-height: 1.4;
    }

    /* Canvas images */
    .canvas-image {
        cursor: default;
        transition: filter 0.15s;
    }

    .canvas-image.draggable {
        cursor: grab;
    }

    .canvas-image.draggable:active {
        cursor: grabbing;
    }

    .canvas-image:hover {
        filter: brightness(1.05);
    }

    .image-caption {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Note drag handle */
    .note-drag-handle {
        cursor: grab;
        transition: fill 0.15s;
    }

    .note-drag-handle:hover {
        fill: rgba(0,0,0,0.25);
    }

    .note-drag-handle:active {
        cursor: grabbing;
    }

    /* Image frame */
    .image-frame {
        pointer-events: none;
    }

    /* Image drag handle */
    .image-drag-handle {
        cursor: grab;
        transition: fill 0.15s;
    }

    .image-drag-handle:hover {
        fill: #4b5563;
    }

    .image-drag-handle:active {
        cursor: grabbing;
    }

    /* Resize handle */
    .resize-handle {
        cursor: se-resize;
        opacity: 0.7;
        transition: opacity 0.15s;
    }

    .resize-handle:hover {
        opacity: 1;
    }

    /* Canvas pins */
    .canvas-pin {
        cursor: grab;
    }

    .canvas-pin:hover circle {
        filter: brightness(1.2);
    }

    .canvas-pin:active {
        cursor: grabbing;
    }

    .canvas-pin.selected circle {
        stroke: #22d3ee;
        stroke-width: 3;
    }

    .pin-label {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    }
</style>
