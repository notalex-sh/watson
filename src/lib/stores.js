import { writable, derived } from 'svelte/store';

// i know this dosnt need to be a store but i set it up like this when i was first working on it

export const entities = writable([]);
export const links = writable([]);
export const notes = writable('');
export const entityIdCounter = writable(0);

export const entityNames = derived(entities, $entities => 
  $entities.filter(e => e.type === 'text').map(e => e.content)
);

export const stats = derived([entities, links], ([$entities, $links]) => {
  const connectionCounts = {};
  $links.forEach(link => {
    connectionCounts[link.from] = (connectionCounts[link.from] || 0) + 1;
    connectionCounts[link.to] = (connectionCounts[link.to] || 0) + 1;
  });
  
  let mostConnected = { name: '-', count: 0 };
  for (const [id, count] of Object.entries(connectionCounts)) {
    if (count > mostConnected.count) {
      const entity = $entities.find(e => e.id === parseInt(id));
      if (entity) {
        mostConnected = { 
          name: entity.content.substring(0, 20) + (entity.content.length > 20 ? '...' : ''),
          count 
        };
      }
    }
  }
  
  return {
    total: $entities.length,
    people: $entities.filter(e => e.type === 'text').length,
    locations: $entities.filter(e => e.type === 'location').length,
    sources: $entities.filter(e => e.type === 'url').length,
    documents: $entities.filter(e => e.type === 'image').length,
    connections: $links.length,
    mostConnected
  };
});