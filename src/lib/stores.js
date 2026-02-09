/**
 * Svelte stores for Watson application state.
 * Contains entity data, links, events, UI state, and type definitions.
 */
import { writable, derived } from 'svelte/store';

export const briefTitle = writable('New Brief');
export const caseNumber = writable('');
export const author = writable('');
export const classification = writable('UNCLASSIFIED');
export const entities = writable([]);
export const links = writable([]);
export const notes = writable('');
export const quickNotes = writable('');
export const entityIdCounter = writable(0);
export const events = writable([]);
export const nodePositions = writable({});
export const images = writable({});
export const imageIdCounter = writable(0);
export const eventLinkColors = writable({});
export const groups = writable([]);
export const groupIdCounter = writable(0);

export const canvasNotes = writable([]);
export const canvasImages = writable([]);
export const canvasPins = writable([]);
export const canvasItemIdCounter = writable(0);

export const autoSaveEnabled = writable(false);
export const resources = writable([]);
export const resourceIdCounter = writable(0);

export const ENTITY_TYPES = {
    'person': { label: 'Person', color: '#22D3EE', bg: '#164E63' },
    'organization': { label: 'Organization', color: '#22D3EE', bg: '#164E63' },
    'alias': { label: 'Alias/Nickname', color: '#A78BFA', bg: '#4C1D95' },
    'phone': { label: 'Phone Number', color: '#A855F7', bg: '#581C87' },
    'email': { label: 'Email Address', color: '#A855F7', bg: '#581C87' },
    'social': { label: 'Social Media', color: '#60A5FA', bg: '#1E3A8A' },
    'username': { label: 'Username/Handle', color: '#60A5FA', bg: '#1E3A8A' },
    'location': { label: 'Location/Address', color: '#FB923C', bg: '#7C2D12' },
    'building': { label: 'Building/Property', color: '#FB923C', bg: '#7C2D12' },
    'country': { label: 'Country/Region', color: '#FB923C', bg: '#7C2D12' },
    'vehicle': { label: 'Vehicle', color: '#3B82F6', bg: '#1E3A8A' },
    'aircraft': { label: 'Aircraft', color: '#3B82F6', bg: '#1E3A8A' },
    'vessel': { label: 'Vessel/Boat', color: '#3B82F6', bg: '#1E3A8A' },
    'bank': { label: 'Bank Account', color: '#34D399', bg: '#064E3B' },
    'crypto': { label: 'Crypto Wallet', color: '#FBBF24', bg: '#78350F' },
    'money': { label: 'Currency/Funds', color: '#34D399', bg: '#064E3B' },
    'document': { label: 'Document', color: '#F472B6', bg: '#831843' },
    'id': { label: 'ID/Passport', color: '#F472B6', bg: '#831843' },
    'license': { label: 'License/Permit', color: '#F472B6', bg: '#831843' },
    'website': { label: 'Website/URL', color: '#EC4899', bg: '#831843' },
    'ip': { label: 'IP Address', color: '#EC4899', bg: '#831843' },
    'domain': { label: 'Domain', color: '#EC4899', bg: '#831843' },
    'weapon': { label: 'Weapon', color: '#EF4444', bg: '#7F1D1D' },
    'drug': { label: 'Drug/Substance', color: '#EF4444', bg: '#7F1D1D' },
    'evidence': { label: 'Evidence', color: '#FACC15', bg: '#713F12' },
    'object': { label: 'Object/Item', color: '#FACC15', bg: '#713F12' },
    'event': { label: 'Event', color: '#A78BFA', bg: '#5B21B6' },
    'incident': { label: 'Incident', color: '#EF4444', bg: '#7F1D1D' },
    'intel': { label: 'Intelligence', color: '#22C55E', bg: '#14532D' },
    'other': { label: 'Other', color: '#9CA3AF', bg: '#374151' }
};

export const LINK_TYPES = {
    'associate': { label: 'Associate', color: '#64748B', style: 'solid' },
    'ownership': { label: 'Ownership', color: '#4B7B6B', style: 'solid' },
    'communicated': { label: 'Communicated With', color: '#5B7BA8', style: 'dashed' },
    'witnessed': { label: 'Witnessed', color: '#8B7B5B', style: 'dotted' },
    'location': { label: 'Location', color: '#8B6B5B', style: 'solid' },
    'traveled': { label: 'Traveled To', color: '#6B5B8B', style: 'dashed' },
    'financial': { label: 'Financial Link', color: '#8B5B7B', style: 'solid' },
    'family': { label: 'Family/Relative', color: '#8B5B5B', style: 'solid' },
    'employer': { label: 'Employer/Employee', color: '#4B8B8B', style: 'solid' },
    'linked': { label: 'Linked', color: '#7B6B8B', style: 'solid' }
};

export const selectedNodes = writable([]);
export const selectedLink = writable(null);

export const canvasState = writable({
    zoom: 1,
    panX: 0,
    panY: 0
});

/**
 * Combines entities and events into a single sorted list for graph display.
 */
export const allItems = derived([entities, events], ([$entities, $events]) => {
    const entityItems = $entities.map(e => ({ ...e, itemType: 'entity', label: e.content }));
    const eventItems = $events.map(ev => ({
        ...ev,
        id: `event-${ev.id}`,
        originalId: ev.id,
        itemType: 'event',
        type: ev.type || 'event',
        label: ev.title,
        content: ev.title,
        timestamp: ev.date
    }));
    return [...entityItems, ...eventItems].sort((a, b) =>
        new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    );
});

/**
 * Combines entity links and event-entity links into a single list.
 */
export const allLinks = derived([links, events, eventLinkColors], ([$links, $events, $eventLinkColors]) => {
    const entityLinks = $links.map(l => ({
        ...l,
        type: l.type || 'associate',
        label: l.label || LINK_TYPES[l.type || 'associate']?.label || 'Associated',
        customColor: l.customColor || null,
        isEventLink: false
    }));
    const eventLinks = [];
    $events.forEach(event => {
        if (event.linkedEntities && Array.isArray(event.linkedEntities)) {
            event.linkedEntities.forEach(entityId => {
                const linkId = `event-${event.id}--${entityId}`;
                eventLinks.push({
                    from: `event-${event.id}`,
                    to: entityId,
                    type: 'linked',
                    label: 'Event Link',
                    customColor: $eventLinkColors[linkId] || null,
                    isEventLink: true
                });
            });
        }
    });
    return [...entityLinks, ...eventLinks];
});

/**
 * Computes statistics about entities and connections for dashboard display.
 */
export const stats = derived([allItems, allLinks], ([$allItems, $allLinks]) => {
    const connectionCounts = {};
    $allLinks.forEach(link => {
        connectionCounts[link.from] = (connectionCounts[link.from] || 0) + 1;
        connectionCounts[link.to] = (connectionCounts[link.to] || 0) + 1;
    });

    let mostConnected = { name: '-', count: 0 };
    for (const id in connectionCounts) {
        if (connectionCounts[id] > mostConnected.count) {
            const item = $allItems.find(e => e.id == id);
            if (item) {
                mostConnected = {
                    name: item.content.substring(0, 20) + (item.content.length > 20 ? '...' : ''),
                    count: connectionCounts[id]
                };
            }
        }
    }

    const people = $allItems.filter(e => e.type === 'person').length;
    const contacts = $allItems.filter(e => e.type === 'email' || e.type === 'phone').length;
    const locations = $allItems.filter(e => e.type === 'location').length;
    const sources = $allItems.filter(e => e.type === 'website').length;
    const vehicles = $allItems.filter(e => e.type === 'vehicle').length;
    const objects = $allItems.filter(e => e.type === 'object').length;
    const eventsCount = $allItems.filter(e => e.itemType === 'event').length;
    const intelCount = $allItems.filter(e => e.type === 'intel').length;

    return {
        total: $allItems.length,
        events: eventsCount,
        people,
        contacts,
        locations,
        sources,
        vehicles,
        objects,
        intel: intelCount,
        connections: $allLinks.length,
        mostConnected
    };
});

const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
let isUndoRedoOperation = false;

export const canUndo = writable(false);
export const canRedo = writable(false);

/**
 * Captures the current state for undo/redo.
 */
function captureState() {
    let entitiesVal, linksVal, eventsVal, nodePositionsVal, eventLinkColorsVal, groupsVal, canvasNotesVal, canvasImagesVal, canvasPinsVal;
    entities.subscribe(v => entitiesVal = v)();
    links.subscribe(v => linksVal = v)();
    events.subscribe(v => eventsVal = v)();
    nodePositions.subscribe(v => nodePositionsVal = v)();
    eventLinkColors.subscribe(v => eventLinkColorsVal = v)();
    groups.subscribe(v => groupsVal = v)();
    canvasNotes.subscribe(v => canvasNotesVal = v)();
    canvasImages.subscribe(v => canvasImagesVal = v)();
    canvasPins.subscribe(v => canvasPinsVal = v)();

    return {
        entities: JSON.parse(JSON.stringify(entitiesVal)),
        links: JSON.parse(JSON.stringify(linksVal)),
        events: JSON.parse(JSON.stringify(eventsVal)),
        nodePositions: JSON.parse(JSON.stringify(nodePositionsVal)),
        eventLinkColors: JSON.parse(JSON.stringify(eventLinkColorsVal)),
        groups: JSON.parse(JSON.stringify(groupsVal)),
        canvasNotes: JSON.parse(JSON.stringify(canvasNotesVal)),
        canvasImages: JSON.parse(JSON.stringify(canvasImagesVal)),
        canvasPins: JSON.parse(JSON.stringify(canvasPinsVal))
    };
}

/**
 * Restores a captured state.
 */
function restoreState(state) {
    isUndoRedoOperation = true;
    entities.set(state.entities);
    links.set(state.links);
    events.set(state.events);
    nodePositions.set(state.nodePositions);
    if (state.eventLinkColors) {
        eventLinkColors.set(state.eventLinkColors);
    }
    if (state.groups) {
        groups.set(state.groups);
    }
    if (state.canvasNotes) {
        canvasNotes.set(state.canvasNotes);
    }
    if (state.canvasImages) {
        canvasImages.set(state.canvasImages);
    }
    if (state.canvasPins) {
        canvasPins.set(state.canvasPins);
    }
    isUndoRedoOperation = false;
}

/**
 * Saves current state to undo stack. Call before making changes.
 */
export function saveUndoState() {
    if (isUndoRedoOperation) return;

    undoStack.push(captureState());
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }
    redoStack = [];
    canUndo.set(undoStack.length > 0);
    canRedo.set(false);
}

/**
 * Undoes the last action.
 */
export function undo() {
    if (undoStack.length === 0) return;

    redoStack.push(captureState());
    const prevState = undoStack.pop();
    restoreState(prevState);

    canUndo.set(undoStack.length > 0);
    canRedo.set(redoStack.length > 0);
}

/**
 * Redoes the last undone action.
 */
export function redo() {
    if (redoStack.length === 0) return;

    undoStack.push(captureState());
    const nextState = redoStack.pop();
    restoreState(nextState);

    canUndo.set(undoStack.length > 0);
    canRedo.set(redoStack.length > 0);
}
