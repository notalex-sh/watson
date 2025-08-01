export const pairs = {
  '"': '"',
  "'": "'",
  '(': ')',
  '[': ']',
  '{': '}',
  '`': '`'
};

export function handleAutoPairs(e, textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  if (pairs[e.key]) {
    e.preventDefault();
    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);

    textarea.value = before + e.key + selected + pairs[e.key] + after;
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    return true;
  }

  if (e.key === 'Backspace' && start === end && start > 0) {
    const prevChar = value[start - 1];
    const nextChar = value[start];

    if (pairs[prevChar] === nextChar) {
      e.preventDefault();
      textarea.value = value.substring(0, start - 1) + value.substring(start + 1);
      textarea.selectionStart = textarea.selectionEnd = start - 1;
      return true;
    }
  }

  if (e.key === 'Enter') {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const currentLine = value.substring(lineStart, start);
    const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s+/);

    if (listMatch) {
      e.preventDefault();
      const indent = listMatch[1];
      let marker = listMatch[2];

      if (/\d+\./.test(marker)) {
        const num = parseInt(marker);
        marker = (num + 1) + '.';
      }

      const newLine = '\n' + indent + marker + ' ';
      textarea.value = value.substring(0, start) + newLine + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + newLine.length;
      return true;
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const spaces = '    ';
    textarea.value = value.substring(0, start) + spaces + value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
    return true;
  }

  return false;
}

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}


export function exportProject(notes, entities, links, events) {
  const projectData = {
    version: '1.2',
    timestamp: new Date().toISOString(),
    notes,
    entities,
    links,
    events // Ensure events are included in the saved object
  };

  const dataStr = JSON.stringify(projectData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `watson-brief-${new Date().toISOString().split('T')[0]}.wf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function importProject(file, callback) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const projectData = JSON.parse(e.target.result);

      if (!projectData.version || projectData.notes === undefined || !Array.isArray(projectData.entities) || !Array.isArray(projectData.links)) {
        throw new Error('Invalid Watson file format');
      }

      // Pass the whole data object to the callback
      callback(projectData);
    } catch (error) {
      console.error('Failed to import project:', error);
      alert('Failed to import project. Please ensure the file is a valid Watson file (.wf)');
    }
  };

  reader.readAsText(file);
}