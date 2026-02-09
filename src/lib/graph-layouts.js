/**
 * Graph layout algorithms for GraphCanvas
 * Each layout function takes nodes and links and returns position mappings
 */

export const GRAPH_CONFIG = {
    nodeWidth: 160,
    nodeHeight: 80,
    nodeSpacingX: 220,
    nodeSpacingY: 140,
    minNodePadding: 20,
    nodeColors: {
        'text': '#00BCD4',
        'email': '#9C27B0',
        'phone': '#9C27B0',
        'url': '#E91E63',
        'location': '#FF9800',
        'vehicle': '#2196F3',
        'object': '#FFEB3B',
        'event': '#2196F3',
        'incident': '#E91E63',
        'intel': '#4CAF50'
    },
    fitPadding: 100,
    minZoom: 0.1,
    maxZoom: 5,
    fitMaxZoom: 1.5
};

/**
 * Resolve overlapping nodes by pushing them apart
 * Uses simple collision detection and resolution
 */
export function resolveOverlaps(positions, config = GRAPH_CONFIG) {
    const { nodeWidth, nodeHeight, minNodePadding } = config;
    const ids = Array.from(positions.keys());
    const iterations = 10;

    for (let iter = 0; iter < iterations; iter++) {
        let hasOverlap = false;

        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const posA = positions.get(ids[i]);
                const posB = positions.get(ids[j]);

                if (!posA || !posB) continue;

                const requiredDistX = nodeWidth + minNodePadding;
                const requiredDistY = nodeHeight + minNodePadding;

                const dx = posB.x - posA.x;
                const dy = posB.y - posA.y;

                const overlapX = requiredDistX - Math.abs(dx);
                const overlapY = requiredDistY - Math.abs(dy);

                if (overlapX > 0 && overlapY > 0) {
                    hasOverlap = true;

                    if (overlapX < overlapY) {
                        const pushX = overlapX / 2 + 1;
                        if (dx >= 0) {
                            posA.x -= pushX;
                            posB.x += pushX;
                        } else {
                            posA.x += pushX;
                            posB.x -= pushX;
                        }
                    } else {
                        const pushY = overlapY / 2 + 1;
                        if (dy >= 0) {
                            posA.y -= pushY;
                            posB.y += pushY;
                        } else {
                            posA.y += pushY;
                            posB.y -= pushY;
                        }
                    }

                    positions.set(ids[i], posA);
                    positions.set(ids[j], posB);
                }
            }
        }

        if (!hasOverlap) break;
    }

    return positions;
}

/**
 * Hierarchy layout - tree structure with root at top
 */
export function hierarchyLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;

    const children = new Map();
    const hasParent = new Set();

    items.forEach(item => children.set(item.id, []));

    links.forEach(link => {
        if (children.has(link.from) && children.has(link.to)) {
            children.get(link.from).push(link.to);
            hasParent.add(link.to);
        }
    });

    const roots = items.filter(item => !hasParent.has(item.id));
    if (roots.length === 0 && items.length > 0) {
        roots.push(items[0]);
    }

    const visited = new Set();
    const levels = new Map();
    const levelNodes = new Map();

    function assignLevels(id, depth) {
        if (visited.has(id)) return;
        visited.add(id);

        levels.set(id, depth);
        if (!levelNodes.has(depth)) levelNodes.set(depth, []);
        levelNodes.get(depth).push(id);

        children.get(id)?.forEach(childId => assignLevels(childId, depth + 1));
    }

    roots.forEach(root => assignLevels(root.id, 0));

    items.forEach(item => {
        if (!visited.has(item.id)) {
            const maxDepth = Math.max(0, ...Array.from(levelNodes.keys()));
            if (!levelNodes.has(maxDepth + 1)) levelNodes.set(maxDepth + 1, []);
            levelNodes.get(maxDepth + 1).push(item.id);
            levels.set(item.id, maxDepth + 1);
        }
    });

    levelNodes.forEach((ids, depth) => {
        const totalWidth = (ids.length - 1) * nodeSpacingX;
        const startX = -totalWidth / 2;

        ids.forEach((id, index) => {
            positions.set(id, {
                x: startX + index * nodeSpacingX,
                y: depth * nodeSpacingY
            });
        });
    });

    return resolveOverlaps(positions, config);
}

/**
 * Circular layout - nodes arranged in a circle
 */
export function circularLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const spacingFactor = (nodeSpacingX + nodeSpacingY) / 2 / 180;

    const count = items.length;
    const baseRadius = Math.max(200, (count * 80) / (2 * Math.PI));
    const radius = baseRadius * spacingFactor;

    items.forEach((item, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        positions.set(item.id, {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
        });
    });

    return resolveOverlaps(positions, config);
}

/**
 * Grouped layout - clusters nodes by type
 */
export function groupedLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const spacingFactor = (nodeSpacingX + nodeSpacingY) / 2 / 180;

    const groups = new Map();
    items.forEach(item => {
        const type = item.type || 'other';
        if (!groups.has(type)) groups.set(type, []);
        groups.get(type).push(item);
    });

    const groupArray = Array.from(groups.entries());
    const numGroups = groupArray.length;
    const groupRadius = Math.max(400, numGroups * 120) * spacingFactor;

    groupArray.forEach(([type, groupItems], groupIndex) => {
        const groupAngle = (groupIndex / numGroups) * 2 * Math.PI - Math.PI / 2;
        const groupCenterX = groupRadius * Math.cos(groupAngle);
        const groupCenterY = groupRadius * Math.sin(groupAngle);

        const count = groupItems.length;
        if (count === 1) {
            positions.set(groupItems[0].id, { x: groupCenterX, y: groupCenterY });
        } else {
            const innerRadius = Math.max(100, (count * 60) / (2 * Math.PI)) * spacingFactor;
            groupItems.forEach((item, i) => {
                const angle = (i / count) * 2 * Math.PI;
                positions.set(item.id, {
                    x: groupCenterX + innerRadius * Math.cos(angle),
                    y: groupCenterY + innerRadius * Math.sin(angle)
                });
            });
        }
    });

    return resolveOverlaps(positions, config);
}

/**
 * Peacock layout - central node with others radiating out
 */
export function peacockLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const spacingFactor = (nodeSpacingX + nodeSpacingY) / 2 / 180;

    const connectionCount = new Map();
    items.forEach(item => connectionCount.set(item.id, 0));

    links.forEach(link => {
        if (connectionCount.has(link.from)) {
            connectionCount.set(link.from, connectionCount.get(link.from) + 1);
        }
        if (connectionCount.has(link.to)) {
            connectionCount.set(link.to, connectionCount.get(link.to) + 1);
        }
    });

    let centerItem = items[0];
    let maxConnections = 0;
    items.forEach(item => {
        const count = connectionCount.get(item.id) || 0;
        if (count > maxConnections) {
            maxConnections = count;
            centerItem = item;
        }
    });

    positions.set(centerItem.id, { x: 0, y: 0 });

    const directlyConnected = new Set();
    links.forEach(link => {
        if (link.from === centerItem.id) directlyConnected.add(link.to);
        if (link.to === centerItem.id) directlyConnected.add(link.from);
    });

    const innerNodes = items.filter(item => item.id !== centerItem.id && directlyConnected.has(item.id));
    const outerNodes = items.filter(item => item.id !== centerItem.id && !directlyConnected.has(item.id));

    const innerRadius = 250 * spacingFactor;
    const outerRadius = 450 * spacingFactor;

    innerNodes.forEach((item, i) => {
        const angle = (i / innerNodes.length) * 2 * Math.PI - Math.PI / 2;
        positions.set(item.id, {
            x: innerRadius * Math.cos(angle),
            y: innerRadius * Math.sin(angle)
        });
    });

    outerNodes.forEach((item, i) => {
        const angle = (i / Math.max(1, outerNodes.length)) * 2 * Math.PI - Math.PI / 2;
        positions.set(item.id, {
            x: outerRadius * Math.cos(angle),
            y: outerRadius * Math.sin(angle)
        });
    });

    return resolveOverlaps(positions, config);
}

/**
 * Compact Peacock layout - tighter arrangement with better link crossing minimization
 * Inspired by i2 Analyst's Notebook Peacock layout
 */
export function compactPeacockLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const spacingFactor = (nodeSpacingX + nodeSpacingY) / 2 / 180;

    const connectionCount = new Map();
    const connections = new Map();
    items.forEach(item => {
        connectionCount.set(item.id, 0);
        connections.set(item.id, new Set());
    });

    links.forEach(link => {
        if (connectionCount.has(link.from)) {
            connectionCount.set(link.from, connectionCount.get(link.from) + 1);
            connections.get(link.from).add(link.to);
        }
        if (connectionCount.has(link.to)) {
            connectionCount.set(link.to, connectionCount.get(link.to) + 1);
            connections.get(link.to).add(link.from);
        }
    });

    const sortedItems = [...items].sort((a, b) =>
        (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
    );

    const centerItem = sortedItems[0];
    positions.set(centerItem.id, { x: 0, y: 0 });

    const placed = new Set([centerItem.id]);
    const tiers = [new Set([centerItem.id])];

    while (placed.size < items.length) {
        const currentTier = new Set();
        const lastTier = tiers[tiers.length - 1];

        lastTier.forEach(nodeId => {
            connections.get(nodeId)?.forEach(connectedId => {
                if (!placed.has(connectedId)) {
                    currentTier.add(connectedId);
                    placed.add(connectedId);
                }
            });
        });

        if (currentTier.size === 0) {
            items.forEach(item => {
                if (!placed.has(item.id)) {
                    currentTier.add(item.id);
                    placed.add(item.id);
                }
            });
        }

        if (currentTier.size > 0) {
            tiers.push(currentTier);
        }
    }

    for (let tierIndex = 1; tierIndex < tiers.length; tierIndex++) {
        const tier = Array.from(tiers[tierIndex]);
        const radius = (120 + tierIndex * 100) * spacingFactor;
        const angleStep = (2 * Math.PI) / Math.max(tier.length, 1);

        tier.sort((a, b) => {
            const aConns = connections.get(a);
            const bConns = connections.get(b);
            const prevTier = tiers[tierIndex - 1];
            const aConnToPrev = [...aConns].filter(id => prevTier.has(id)).length;
            const bConnToPrev = [...bConns].filter(id => prevTier.has(id)).length;
            return bConnToPrev - aConnToPrev;
        });

        tier.forEach((nodeId, i) => {
            const angle = i * angleStep - Math.PI / 2;
            positions.set(nodeId, {
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle)
            });
        });
    }

    return resolveOverlaps(positions, config);
}

/**
 * Grid layout - simple grid arrangement
 */
export function gridLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const cols = Math.ceil(Math.sqrt(items.length));

    items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.set(item.id, {
            x: col * nodeSpacingX - ((cols - 1) * nodeSpacingX) / 2,
            y: row * nodeSpacingY
        });
    });

    return resolveOverlaps(positions, config);
}

/**
 * Force-directed layout - simulates physics for natural positioning
 */
export function forceLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const spacingFactor = (nodeSpacingX + nodeSpacingY) / 2 / 180;

    const initialRadius = 200 * spacingFactor;
    items.forEach((item, i) => {
        const angle = (i / items.length) * 2 * Math.PI;
        positions.set(item.id, {
            x: initialRadius * Math.cos(angle) + (Math.random() - 0.5) * 50,
            y: initialRadius * Math.sin(angle) + (Math.random() - 0.5) * 50
        });
    });

    const adjacency = new Map();
    items.forEach(item => adjacency.set(item.id, []));
    links.forEach(link => {
        if (adjacency.has(link.from) && adjacency.has(link.to)) {
            adjacency.get(link.from).push(link.to);
            adjacency.get(link.to).push(link.from);
        }
    });

    const iterations = 50;
    const repulsionStrength = 5000 * spacingFactor * spacingFactor;
    const attractionStrength = 0.1;
    const damping = 0.9;

    const velocities = new Map();
    items.forEach(item => velocities.set(item.id, { x: 0, y: 0 }));

    for (let iter = 0; iter < iterations; iter++) {
        items.forEach(item => {
            const pos = positions.get(item.id);
            let fx = 0, fy = 0;

            items.forEach(other => {
                if (other.id === item.id) return;
                const otherPos = positions.get(other.id);
                const dx = pos.x - otherPos.x;
                const dy = pos.y - otherPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = repulsionStrength / (dist * dist);
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            });

            adjacency.get(item.id).forEach(connectedId => {
                const connectedPos = positions.get(connectedId);
                if (!connectedPos) return;
                const dx = connectedPos.x - pos.x;
                const dy = connectedPos.y - pos.y;
                fx += dx * attractionStrength;
                fy += dy * attractionStrength;
            });

            const vel = velocities.get(item.id);
            vel.x = (vel.x + fx) * damping;
            vel.y = (vel.y + fy) * damping;
        });

        items.forEach(item => {
            const pos = positions.get(item.id);
            const vel = velocities.get(item.id);
            pos.x += vel.x;
            pos.y += vel.y;
        });
    }

    return resolveOverlaps(positions, config);
}

/**
 * Timeline layout - horizontal arrangement by time/sequence
 */
export function timelineLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;

    const sortedItems = [...items].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : a.id;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : b.id;
        return dateA - dateB;
    });

    sortedItems.forEach((item, i) => {
        positions.set(item.id, {
            x: i * nodeSpacingX,
            y: (i % 3) * (nodeSpacingY * 0.5)
        });
    });

    return resolveOverlaps(positions, config);
}

/**
 * Star layout - one central node with all others radiating out equally
 */
export function starLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;
    const spacingFactor = (nodeSpacingX + nodeSpacingY) / 2 / 180;

    const centerItem = items[0];
    positions.set(centerItem.id, { x: 0, y: 0 });

    const radius = 300 * spacingFactor;
    const outerItems = items.slice(1);

    outerItems.forEach((item, i) => {
        const angle = (i / outerItems.length) * 2 * Math.PI - Math.PI / 2;
        positions.set(item.id, {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
        });
    });

    return resolveOverlaps(positions, config);
}

/**
 * Tree layout - hierarchical tree structure
 */
export function treeLayout(items, links, config = GRAPH_CONFIG) {
    const positions = new Map();
    if (items.length === 0) return positions;

    const { nodeSpacingX, nodeSpacingY } = config;

    const children = new Map();
    const hasParent = new Set();

    items.forEach(item => children.set(item.id, []));

    links.forEach(link => {
        if (children.has(link.from) && children.has(link.to)) {
            children.get(link.from).push(link.to);
            hasParent.add(link.to);
        }
    });

    let roots = items.filter(item => !hasParent.has(item.id));
    if (roots.length === 0) roots = [items[0]];

    const visited = new Set();
    let currentX = 0;

    function layoutSubtree(nodeId, depth) {
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const nodeChildren = children.get(nodeId) || [];
        const unvisitedChildren = nodeChildren.filter(id => !visited.has(id));

        if (unvisitedChildren.length === 0) {
            positions.set(nodeId, { x: currentX, y: depth * nodeSpacingY });
            currentX += nodeSpacingX;
            return currentX - nodeSpacingX;
        }

        const childXPositions = unvisitedChildren.map(childId => layoutSubtree(childId, depth + 1));
        const avgX = childXPositions.reduce((a, b) => a + b, 0) / childXPositions.length;
        positions.set(nodeId, { x: avgX, y: depth * nodeSpacingY });
        return avgX;
    }

    roots.forEach(root => layoutSubtree(root.id, 0));

    items.forEach(item => {
        if (!visited.has(item.id)) {
            positions.set(item.id, { x: currentX, y: 0 });
            currentX += nodeSpacingX;
        }
    });

    return resolveOverlaps(positions, config);
}

/**
 * Spread layout - extra wide spacing for clarity
 */
export function spreadLayout(items, links, config = GRAPH_CONFIG) {
    const spreadConfig = {
        ...config,
        nodeSpacingX: config.nodeSpacingX * 2,
        nodeSpacingY: config.nodeSpacingY * 2
    };
    return hierarchyLayout(items, links, spreadConfig);
}

/**
 * Get layout function by name
 */
export function getLayoutFunction(layoutName) {
    const layouts = {
        'hierarchy': hierarchyLayout,
        'circular': circularLayout,
        'grouped': groupedLayout,
        'peacock': peacockLayout,
        'compactPeacock': compactPeacockLayout,
        'grid': gridLayout,
        'force': forceLayout,
        'timeline': timelineLayout,
        'star': starLayout,
        'tree': treeLayout,
        'spread': spreadLayout
    };
    return layouts[layoutName] || hierarchyLayout;
}

/**
 * Calculate fit and center parameters for the graph
 */
export function calculateFitParams(positions, containerWidth, containerHeight, config = GRAPH_CONFIG) {
    if (positions.size === 0) return { zoom: 1, panX: 0, panY: 0 };

    const { nodeWidth, nodeHeight, fitPadding, minZoom, fitMaxZoom } = config;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    positions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x + nodeWidth);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y + nodeHeight);
    });

    const contentWidth = (maxX - minX) + fitPadding * 2;
    const contentHeight = (maxY - minY) + fitPadding * 2;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const zoom = Math.max(minZoom, Math.min(scaleX, scaleY, fitMaxZoom));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const panX = containerWidth / 2 - centerX * zoom;
    const panY = containerHeight / 2 - centerY * zoom;

    return { zoom, panX, panY };
}
