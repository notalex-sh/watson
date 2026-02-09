/**
 * Markdown renderer using marked with custom extensions for Watson.
 * Supports standard GFM plus custom img:ID syntax for embedded images.
 */
import { marked } from 'marked';
import { escapeHtml } from './utils.js';

marked.setOptions({
    gfm: true,
    breaks: true
});

/**
 * Custom extension for Watson image syntax: ![alt](img:ID) or ![alt](img:ID "caption")
 */
const watsonImageExtension = {
    name: 'watsonImage',
    level: 'inline',
    start(src) {
        return src.match(/!\[/)?.index;
    },
    tokenizer(src) {
        const match = src.match(/^!\[([^\]]*)\]\(img:(\d+)(?:\s+"([^"]*)")?\)/);
        if (match) {
            return {
                type: 'watsonImage',
                raw: match[0],
                alt: match[1],
                imageId: match[2],
                caption: match[3] || null
            };
        }
        return undefined;
    },
    renderer(token) {
        const captionHtml = token.caption
            ? `<figcaption>${escapeHtml(token.caption)}</figcaption>`
            : '';
        return `<figure class="report-image" data-image-id="${token.imageId}">
            <img src="" alt="${escapeHtml(token.alt)}" data-image-id="${token.imageId}" />
            ${captionHtml}
        </figure>`;
    }
};

/**
 * Custom extension for page breaks: ---PAGEBREAK--- or ---NEWPAGE---
 */
const pageBreakExtension = {
    name: 'pageBreak',
    level: 'block',
    start(src) {
        return src.match(/^---(?:PAGEBREAK|NEWPAGE)---/m)?.index;
    },
    tokenizer(src) {
        const match = src.match(/^---(?:PAGEBREAK|NEWPAGE)---\n?/);
        if (match) {
            return {
                type: 'pageBreak',
                raw: match[0]
            };
        }
        return undefined;
    },
    renderer() {
        return '<div class="page-break"></div>';
    }
};

marked.use({ extensions: [watsonImageExtension, pageBreakExtension] });

/**
 * Render markdown to HTML with image injection
 * @param {string} markdown - The markdown text to render
 * @param {Object} images - Map of image IDs to base64 data URLs
 * @returns {string} Rendered HTML
 */
export function renderMarkdown(markdown, images = {}) {
    if (!markdown) return '';

    let html = marked.parse(markdown);

    for (const [id, dataUrl] of Object.entries(images)) {
        html = html.replace(
            new RegExp(`<img src="" alt="([^"]*)" data-image-id="${id}"`, 'g'),
            `<img src="${dataUrl}" alt="$1" data-image-id="${id}"`
        );
    }

    return html;
}
