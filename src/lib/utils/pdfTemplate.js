/**
 * PDF export template generator using Paged.js.
 * Creates print-ready HTML document with running headers and proper styling.
 */

import { escapeHtml } from '../utils.js';

const PDF_STYLES = `
.running-header {
    position: running(runningHeader);
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #c00;
}

@page {
    size: A4;
    margin: 72pt 72pt 72pt 72pt;

    @top-center {
        content: element(runningHeader);
    }
}

@page:first {
    margin-top: 72pt;
}

* {
    box-sizing: border-box;
}

html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: white;
}

.print-document {}

.print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    margin-bottom: 24px;
    border-bottom: 2px solid #1a1a1a;
}

.header-title {
    font-size: 18pt;
    font-weight: 700;
    margin-bottom: 4px;
}

.header-case {
    font-size: 10pt;
    color: #666;
}

.header-author {
    font-size: 10pt;
    color: #666;
    text-align: right;
}

.header-classification {
    font-size: 10pt;
    font-weight: 600;
    text-transform: uppercase;
    color: #c00;
    text-align: right;
    margin-top: 4px;
}

.print-content h1 {
    font-size: 18pt;
    font-weight: 700;
    margin: 24px 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #ddd;
}

.print-content h2 {
    font-size: 14pt;
    font-weight: 600;
    margin: 20px 0 10px 0;
}

.print-content h3 {
    font-size: 12pt;
    font-weight: 600;
    margin: 16px 0 8px 0;
}

.print-content p {
    margin: 0 0 12px 0;
}

.print-content ul, .print-content ol {
    margin: 0 0 12px 0;
    padding-left: 24px;
}

.print-content li {
    margin-bottom: 4px;
}

.print-content pre, .print-content code {
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.print-content code {
    background: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10pt;
}

.print-content pre {
    background: #f4f4f4;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0 0 16px 0;
}

.print-content pre code {
    background: none;
    padding: 0;
}

.print-content blockquote {
    margin: 0 0 16px 0;
    padding: 12px 16px;
    border-left: 4px solid #ddd;
    background: #f9f9f9;
}

.print-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 16px 0;
}

.print-content th, .print-content td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
}

.print-content th {
    background: #f4f4f4;
    font-weight: 600;
}

.print-content figure.report-image {
    margin: 20px auto;
    padding: 12px;
    background: #fafafa;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    max-width: 500px;
    text-align: center;
}

.print-content figure.report-image img {
    max-width: 100%;
    max-height: 300px;
    height: auto;
    object-fit: contain;
    display: block;
    margin: 0 auto;
}

.print-content figure.report-image figcaption {
    font-size: 10pt;
    color: #666;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #e5e5e5;
    font-style: italic;
}

.print-content .page-break {
    page-break-after: always;
    break-after: page;
}

.print-content hr {
    border: none;
    border-top: 1px solid #ddd;
    margin: 24px 0;
}

.print-content input[type="checkbox"] {
    margin-right: 8px;
}

.pagedjs_page {
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

@media print {
    html, body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
}
`;

/**
 * Generates a complete PDF-ready HTML document.
 */
export function generatePDFDocument(options) {
    const {
        title,
        caseNumber,
        author,
        classification,
        content,
        includeDate = true
    } = options;

    const dateStr = includeDate
        ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    return `<!DOCTYPE html>
<html>
<head>
    <title>${escapeHtml(title || 'Report')}</title>
    <script>
        window.PagedConfig = {
            auto: true,
            after: function() {
                setTimeout(function() { window.print(); }, 300);
            }
        };
    <\/script>
    <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"><\/script>
    <style>${PDF_STYLES}</style>
</head>
<body>
    ${classification ? '<div class="running-header">' + escapeHtml(classification) + '</div>' : ''}

    <div class="print-document">
        <header class="print-header">
            <div class="header-left">
                <div class="header-title">${escapeHtml(title || 'Untitled Report')}</div>
                ${caseNumber ? '<div class="header-case">Case: ' + escapeHtml(caseNumber) + '</div>' : ''}
            </div>
            <div class="header-right">
                ${author ? '<div class="header-author">' + escapeHtml(author) + '</div>' : ''}
                ${dateStr ? '<div class="header-date">' + dateStr + '</div>' : ''}
                ${classification ? '<div class="header-classification">' + escapeHtml(classification) + '</div>' : ''}
            </div>
        </header>
        <main class="print-content">
            ${content}
        </main>
    </div>
</body>
</html>`;
}

/**
 * Opens PDF export in new window.
 */
export function openPDFExport(options) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to export PDF');
        return false;
    }

    const htmlContent = generatePDFDocument(options);
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return true;
}
