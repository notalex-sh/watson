import { writable, derived } from 'svelte/store';

export const entities = writable([]);
export const links = writable([]);
export const notes = writable('');
export const entityIdCounter = writable(0);
export const events = writable([]);

export const allItems = derived([entities, events], ([$entities, $events]) => {
    const entityItems = $entities.map(e => ({ ...e, itemType: 'entity', label: e.content }));
    const eventItems = $events.map(ev => ({ ...ev, itemType: 'event', label: ev.title, content: ev.title, timestamp: ev.date }));
    return [...entityItems, ...eventItems].sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
});

export const allLinks = derived([links, events], ([$links, $events]) => {
    const entityLinks = $links;
    const eventLinks = [];
    $events.forEach(event => {
        event.linkedEntities.forEach(entityId => {
            eventLinks.push({ from: event.id, to: entityId });
        });
    });
    return [...entityLinks, ...eventLinks];
});


export const entityNames = derived(entities, $entities =>
  $entities.filter(e => e.type === 'text').map(e => e.content)
);

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

  const people = $allItems.filter(e => e.type === 'text').length;
  const contacts = $allItems.filter(e => e.type === 'email' || e.type === 'phone').length;
  const locations = $allItems.filter(e => e.type === 'location').length;
  const sources = $allItems.filter(e => e.type === 'url').length;
  const vehicles = $allItems.filter(e => e.type === 'vehicle').length;
  const objects = $allItems.filter(e => e.type === 'object').length;
  const eventsCount = $allItems.filter(e => e.itemType === 'event').length;

  return {
    total: $allItems.length,
    events: eventsCount,
    people,
    contacts,
    locations,
    sources,
    vehicles,
    objects,
    connections: $allLinks.length,
    mostConnected
  };
});