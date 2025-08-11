<script>
    import { createEventDispatcher, tick } from 'svelte';
    import { briefTitle, caseNumber, notes, allItems, allLinks, exportRenderer } from '$lib/stores';
    import { formatDate } from '$lib/utils';
    import jsPDF from 'jspdf';
    import html2canvas from 'html2canvas';

    import MapView from './MapView.svelte';
    import NetworkView from './NetworkView.svelte';

    const dispatch = createEventDispatcher();
    let sections = [
        { id: 'notes', label: 'Notes', checked: true, component: null },
        { id: 'entities', label: 'Entity List', checked: true, component: null },
        { id: 'events', label: 'Timeline', checked: true, component: null },
        { id: 'map', label: 'Map View', checked: true, component: MapView },
        { id: 'network', label: 'Network Graph', checked: true, component: NetworkView },
        { id: 'intel', label: 'Intel', checked: true, component: null },
    ];
    let classification = 'UNCLASSIFIED';
    let author = '';
    let isExporting = false;
    let exportMessage = '';

    let dragStartIndex = -1;
    let dragoverIndex = -1;
    const THEME = {
        primary: '#00DDFF',
        secondary: '#c084fc',
        danger: '#ef4444',
        textLight: '#E5E7EB',
        textMuted: '#9ca3af',
        backgroundDark: '#030712',
        backgroundComponent: '#1f2937',
        backgroundCanvas: '#111827',  
        accentGreen: '#4ade80',
        accentOrange: '#fb923c',
        border: '#374151',
        margin: 15
    };

    function handleDrop() {
        if (dragStartIndex === -1 || dragoverIndex === -1 || dragStartIndex === dragoverIndex) return;
        const itemToMove = sections[dragStartIndex];
        sections.splice(dragStartIndex, 1);
        sections.splice(dragoverIndex, 0, itemToMove);
        sections = sections;
        dragStartIndex = -1;
        dragoverIndex = -1;
    }

    async function exportToPdf() {
        isExporting = true;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFont('courier', 'normal');

        const toc = [];
        let y;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - THEME.margin * 2;
        const pageBreakThreshold = pageHeight - THEME.margin;

        const addPage = (title, backgroundColor = THEME.backgroundDark) => {
            doc.addPage();
            doc.setFillColor(backgroundColor);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            y = THEME.margin;
            addHeader();
            if (title) addSectionHeader(title);
        };

        const checkY = (requiredHeight, sectionTitle) => {
            if (y + requiredHeight > pageBreakThreshold) {
                addPage(sectionTitle ? `${sectionTitle} (Continued)` : undefined);
                return true;
            }
            return false;
        };

        const addHeader = () => {
            doc.setFontSize(9);
            doc.setTextColor(THEME.danger);
            doc.text(classification.toUpperCase(), pageWidth / 2, 10, { align: 'center' });
        };

        const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(THEME.textMuted);
                doc.text(`Page ${i}`, pageWidth - THEME.margin, pageHeight - 10, { align: 'right' });
            }
        };

        const addSectionHeader = (title) => {
            checkY(20, title);
            doc.setFontSize(18);
            doc.setTextColor(THEME.primary);
            doc.text(title, THEME.margin, y);
            y += 8;
            doc.setDrawColor(THEME.primary);
            doc.line(THEME.margin, y, THEME.margin + contentWidth, y);
            y += 10;
        };
        
        const calculateTextHeight = (text, options) => {
            const { size = 10, indent = 0, width = contentWidth, lineHeightFactor = 1.6 } = options;
            doc.setFontSize(size);
            const lines = doc.splitTextToSize(text || '', width - indent);
            return (lines.length * size * 0.352778 * lineHeightFactor);
        };
        
        const writeText = (text, options = {}) => {
            const { size = 10, color = THEME.textLight, indent = 0, sectionTitle, lineHeightFactor = 1.6, x, customY, width = contentWidth } = options;
            let currentY = customY || y;
            doc.setFontSize(size);
            doc.setTextColor(color);
            const textWidth = x ? (width / 2) - 5 - indent : width - indent;
            const lines = doc.splitTextToSize(text || '', textWidth);
            const lineHeight = size * 0.352778 * lineHeightFactor;

            lines.forEach(line => {
                if (!customY && y + lineHeight > pageBreakThreshold) {
                    addPage(sectionTitle ? `${sectionTitle} (Continued)` : undefined);
                    currentY = y;
                }
                doc.text(line, (x || THEME.margin) + indent, currentY);
                currentY += lineHeight;
            });

            if (!customY) y = currentY;
            return currentY; 
        };

        addPage('Cover', THEME.backgroundDark);
        doc.deletePage(1);
        
        y = 60;
        writeText('WATSON INTELLIGENCE REPORT', { size: 12, color: THEME.textMuted });
        y += 15;
        writeText($briefTitle || 'Untitled Brief', { size: 32, color: THEME.textLight });
        y += 5;
        writeText($caseNumber || 'No Case Number', { size: 16, color: THEME.textMuted });
        y = 150;
        writeText(`Author: ${author || 'N/A'}`, { size: 12 });
        writeText(`Export Date: ${new Date().toLocaleString()}`, { size: 12 });

        addPage();
        const tocPage = doc.internal.getNumberOfPages();
        toc.push({ title: 'Cover Page', page: 1 });
        toc.push({ title: 'Table of Contents', page: tocPage });

        for (const section of sections) {
            if (!section.checked) continue;
            exportMessage = `Processing: ${section.label}...`;

            const pageColor = (section.id === 'map' || section.id === 'network') ? THEME.backgroundCanvas : THEME.backgroundDark;
            addPage(section.label, pageColor);
            const sectionPage = doc.internal.getNumberOfPages();
            toc.push({ title: section.label, page: sectionPage });

            if (section.id === 'map' || section.id === 'network') {
                exportRenderer.set({ component: section.component, props: {} });
                await tick();
                await new Promise(resolve => setTimeout(resolve, 1500));
                const element = document.getElementById('pdf-export-render-container');
                if (element) {
                    const canvas = await html2canvas(element, { allowTaint: true, useCORS: true, backgroundColor: THEME.backgroundCanvas });
                    const imgData = canvas.toDataURL('image/png');
                    const aspectRatio = canvas.width / canvas.height;
                    let pdfWidth = contentWidth;
                    let pdfHeight = pdfWidth / aspectRatio;
                    const availableHeight = pageBreakThreshold - y;

                    if (pdfHeight > availableHeight) {
                        pdfHeight = availableHeight;
                        pdfWidth = pdfHeight * aspectRatio;
                    }
                    
                    const xOffset = THEME.margin + (contentWidth - pdfWidth) / 2;
                    doc.addImage(imgData, 'PNG', xOffset, y, pdfWidth, pdfHeight);
                    y += pdfHeight + 5;

                    if (section.id === 'map') {
                        y += 5;
                        writeText('Map Key:', { size: 10, color: THEME.accentOrange });
                        const locations = $allItems.filter(i => i.type === 'location' && i.metadata.lat && i.metadata.lng);
                        locations.forEach(loc => {
                            const locationText = `• ${loc.content} (${loc.metadata.lat.toFixed(4)}, ${loc.metadata.lng.toFixed(4)})`;
                            writeText(locationText, { size: 8, indent: 5, sectionTitle: section.label });
                        });
                    }
                }
                exportRenderer.set(null);
            } else if (section.id === 'notes') {
                writeText($notes || 'No notes available.', { size: 9, sectionTitle: section.label, lineHeightFactor: 1.8 });
            } else if (section.id === 'entities') {
                const items = $allItems.filter(i => i.itemType === 'entity' && i.type !== 'intel');
                if (items.length === 0) { 
                    writeText('No items in this section.', {size: 9});
                } else {
                    const colWidth = (contentWidth - 5) / 2;
                    let rowY = y;
                    
                    for(let i=0; i < items.length; i+=2) {
                        const item1 = items[i];
                        const item2 = items[i+1];
                        
                        let h1 = calculateTextHeight(item1?.content, {size: 11, width: colWidth, indent: 10}) + calculateTextHeight(item1?.description, {size: 8, width: colWidth, indent: 10}) + 25;
                        let h2 = item2 ? calculateTextHeight(item2.content, {size: 11, width: colWidth, indent: 10}) + calculateTextHeight(item2.description, {size: 8, width: colWidth, indent: 10}) + 25 : 0;
                        const maxRowHeight = Math.max(h1, h2);

                        if (rowY + maxRowHeight > pageBreakThreshold) {
                            addPage(`${section.label} (Continued)`);
                            rowY = y;
                        }

                        if(item1) {
                            doc.setFillColor(THEME.backgroundComponent);
                            doc.setDrawColor(THEME.border);
                            doc.roundedRect(THEME.margin, rowY, colWidth, maxRowHeight, 3, 3, 'FD');
                            let innerY = rowY + 10;
                            innerY = writeText(item1.content, {size: 11, color: THEME.primary, customY: innerY, x: THEME.margin, indent: 5, width: colWidth});
                            writeText(item1.description || "No description.", {size: 8, customY: innerY + 2, x: THEME.margin, indent: 5, width: colWidth});
                        }
                        if(item2){
                            doc.setFillColor(THEME.backgroundComponent);
                            doc.setDrawColor(THEME.border);
                            doc.roundedRect(THEME.margin + colWidth + 5, rowY, colWidth, maxRowHeight, 3, 3, 'FD');
                             let innerY = rowY + 10;
                            innerY = writeText(item2.content, {size: 11, color: THEME.primary, customY: innerY, x: THEME.margin + colWidth + 5, indent: 5, width: colWidth});
                            writeText(item2.description || "No description.", {size: 8, customY: innerY + 2, x: THEME.margin + colWidth + 5, indent: 5, width: colWidth});
                        }
                        rowY += maxRowHeight + 10;
                    }
                    y = rowY;
                }
            } else if (section.id === 'events' || section.id === 'intel') {
                const isEvent = section.id === 'events';
                const items = $allItems.filter(i => (isEvent ? i.itemType === 'event' : i.type === 'intel')).sort((a, b) => new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp));
                
                if (items.length === 0) { 
                    writeText('No items in this section.', {size: 9});
                } else {
                    doc.setDrawColor(THEME.border);
                    doc.line(THEME.margin + 2, y, THEME.margin + 2, pageBreakThreshold + 10);
                }

                items.forEach((item) => {
                    const linkedItems = $allLinks.filter(l => l.from === item.id || l.to === item.id);
                    const descText = item.description || (linkedItems.length === 0 ? '' : 'No description.');
                    const linkedText = linkedItems.map(l => {
                        const linkedItem = $allItems.find(i => i.id === (l.from === item.id ? l.to : l.from));
                        return `• ${linkedItem?.content || 'Unknown'}`;
                    }).join('\n');
                    
                    const estimatedHeight = calculateTextHeight(descText, {}) + calculateTextHeight(linkedText, {}) + 30;
                    checkY(estimatedHeight, section.label);
                    
                    const startY = y;
                    let contentY = startY;
                    
                    const dateY = writeText(formatDate(item.date || item.timestamp), { size: 8, color: THEME.textMuted, customY: contentY, x: THEME.margin + 15, width: contentWidth - 10 });
                    
                    const titleApproxCenterY = dateY + (11 * 0.352778 * 1.6) / 2; 
                    doc.setFillColor(isEvent ? THEME.secondary : THEME.accentGreen);
                    doc.circle(THEME.margin + 2, titleApproxCenterY, 2, 'F');
                    doc.line(THEME.margin + 4, titleApproxCenterY, THEME.margin + 10, titleApproxCenterY);

                    const titleEndY = writeText(item.title || item.content, { size: 11, color: THEME.primary, customY: dateY, x: THEME.margin + 15, width: contentWidth - 10 });
                    
                    contentY = titleEndY;

                    if (descText) {
                         contentY = writeText(descText, { size: 9, customY: contentY, x: THEME.margin + 15, width: contentWidth - 10 });
                    }
                    if (linkedItems.length > 0) {
                        contentY = writeText('Linked Items:', { size: 8, color: THEME.textMuted, customY: contentY, x: THEME.margin + 15, width: contentWidth - 10 });
                        contentY = writeText(linkedText, { size: 8, customY: contentY, x: THEME.margin + 15, indent: 5, width: contentWidth - 10 });
                    }
                    
                    y = contentY + 20;
                });
            }
        }

        exportMessage = 'Generating Table of Contents...';
        doc.setPage(tocPage);
        addSectionHeader('Table of Contents');
        let tocY = y;
        toc.forEach(item => {
            if (tocY + 10 > pageBreakThreshold) {
                addPage("Table of Contents (Continued)");
                tocY = y;
            }
            doc.setFontSize(12);
            doc.setTextColor(THEME.textLight);
            const title = item.title;
            const pageNum = `${item.page}`;
            const titleWidth = doc.getTextWidth(title);
            const pageNumWidth = doc.getTextWidth(pageNum);
            const dotsWidth = contentWidth - titleWidth - pageNumWidth - 2;
            const dots = dotsWidth > 0 ? '.'.repeat(Math.floor(dotsWidth / doc.getTextWidth('.'))) : '';
            
            doc.textWithLink(title, THEME.margin, tocY, { pageNumber: item.page });
            doc.text(dots, THEME.margin + titleWidth + 1, tocY);
            doc.text(pageNum, pageWidth - THEME.margin, tocY, { align: 'right' });
            tocY += 10;
        });

        exportMessage = 'Finalizing PDF...';
        addFooter();
        doc.save(`${$briefTitle.replace(/\s/g, '_') || 'watson-report'}.pdf`);
        
        isExporting = false;
        exportMessage = '';
        dispatch('close');
    }
</script>

<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" on:click={() => !isExporting && dispatch('close')}>
    <div class="bg-gray-950/95 backdrop-blur-md border border-cyan-400 rounded-lg max-w-2xl w-full shadow-2xl shadow-cyan-500/30 flex flex-col max-h-[90vh]" on:click|stopPropagation>
        <div class="p-6 border-b border-cyan-600/30">
            <h2 class="text-xl font-bold text-cyan-300">Export Report to PDF</h2>
        </div>
        <div class="p-6 space-y-4 flex-1 overflow-y-auto">
            {#if isExporting}
                <div class="text-center p-8">
                    <svg class="animate-spin mx-auto h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="mt-4 text-cyan-300">Generating PDF, please wait...</p>
                    <p class="text-sm text-gray-500 mt-2">{exportMessage}</p>
                </div>
            {:else}
                <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1">Classification</label>
                    <input type="text" bind:value={classification} class="input"/>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1">Author</label>
                    <input type="text" bind:value={author} class="input"/>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-gray-400 mb-2">Sections to Include & Order</h3>
                    <p class="text-xs text-gray-500 mb-2">Drag and drop to reorder sections.</p>
                    <div class="space-y-2">
                        {#each sections as section, i (section.id)}
                            <div 
                                class="flex items-center gap-3 p-2 bg-gray-900 rounded cursor-grab transition-colors"
                                draggable="true"
                                on:dragstart={() => dragStartIndex = i}
                                on:dragover|preventDefault={(e) => {
                                    dragoverIndex = i;
                                    e.dataTransfer.dropEffect = 'move';
                                }}
                                on:drop|preventDefault={handleDrop}
                                class:bg-cyan-900={dragoverIndex === i}
                            >
                                <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
                                <input type="checkbox" bind:checked={section.checked} class="h-4 w-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500"/>
                                <span class="text-gray-300 flex-1">{section.label}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
        <div class="p-6 border-t border-cyan-600/30 flex justify-end gap-2">
            <button class="btn" on:click={() => dispatch('close')} disabled={isExporting}>
                {isExporting ? 'Please Wait' : 'Cancel'}
            </button>
            <button class="btn btn-primary" on:click={exportToPdf} disabled={isExporting}>
                Export PDF
            </button>
        </div>
    </div>
</div>