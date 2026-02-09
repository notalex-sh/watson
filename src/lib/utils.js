/**
 * Utility functions for Watson application.
 * Includes date formatting, HTML escaping, and project import/export with optional encryption.
 */

import { FILE_VERSION } from './constants.js';

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Formats a date string to military-style format (DD/MMM/YYYY HH:MM hours).
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes} hours`;
}


import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from './crypto.js';

/**
 * Exports the current project to a Watson file (.wf) or encrypted file (.wfe).
 */
export async function exportProject(notes, entities, links, events, briefTitle, caseNumber, author = '', nodePositions = {}, images = {}, quickNotes = '', classification = 'UNCLASSIFIED', canvasState = null, entityIdCounter = 0, imageIdCounter = 0, eventLinkColors = {}, groups = [], groupIdCounter = 0, canvasNotes = [], canvasImages = [], canvasPins = [], canvasItemIdCounter = 0, resources = [], resourceIdCounter = 0, password = null) {
  const projectData = {
    version: FILE_VERSION,
    timestamp: new Date().toISOString(),
    briefTitle,
    caseNumber,
    author,
    classification,
    report: notes,
    quickNotes,
    entities,
    links,
    events,
    nodePositions,
    images,
    canvasState,
    entityIdCounter,
    imageIdCounter,
    eventLinkColors,
    groups,
    groupIdCounter,
    canvasNotes,
    canvasImages,
    canvasPins,
    canvasItemIdCounter,
    resources,
    resourceIdCounter
  };

  let dataBlob;
  let extension = '.wf';

  if (password) {
    const encrypted = await encrypt(projectData, password);
    const base64Data = arrayBufferToBase64(encrypted);
    const wrapper = {
      encrypted: true,
      version: '2.0',
      data: base64Data
    };
    dataBlob = new Blob([JSON.stringify(wrapper)], { type: 'application/json' });
    extension = '.wfe';
  } else {
    dataBlob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
  }

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `${briefTitle.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return true;
}

/**
 * Imports a Watson project file, handling both plain and encrypted formats.
 */
export async function importProject(file, callback, passwordCallback) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      let projectData;

      const parsed = JSON.parse(content);

      if (parsed.encrypted) {
        if (!passwordCallback) {
          throw new Error('File is encrypted but no password handler provided');
        }

        const password = await passwordCallback();
        if (!password) {
          throw new Error('Password required to open encrypted file');
        }

        const encryptedData = base64ToArrayBuffer(parsed.data);
        projectData = await decrypt(encryptedData, password);
      } else {
        projectData = parsed;
      }

      const reportContent = projectData.report !== undefined ? projectData.report : projectData.notes;
      if (!projectData.version || reportContent === undefined || !Array.isArray(projectData.entities) || !Array.isArray(projectData.links)) {
        throw new Error('Invalid Watson file format');
      }
      projectData.report = reportContent;

      callback(projectData);
    } catch (error) {
      console.error('Failed to import project:', error);
      if (error.name === 'DOMException' || error.message.includes('decrypt')) {
        alert('Incorrect password or corrupted file. If this is an unencrypted .wf file, it may be corrupted.');
      } else if (error.message.includes('JSON')) {
        alert('Invalid file format - not a valid Watson file.');
      } else {
        alert('Failed to import project: ' + error.message);
      }
    }
  };

  reader.readAsText(file);
}