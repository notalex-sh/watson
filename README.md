# Watson – Tactical Intel Tool

**Watson** is a lightweight, secure intelligence tool built by intelligence professionals for intelligence professionals.

It helps you keep track of people, places, vehicles, objects, and relationships while drafting structured intelligence notes, especially during fast-moving incidents, investigations, or early-stage analysis. Everything is designed for speed, clarity, and field-readiness.

> Intel. Fast. Field-Ready.

![banner](https://raw.githubusercontent.com/notalex-sh/watson/refs/heads/main/banner.png)

---

## Purpose

Watson is not a full intelligence platform. It's a disposable tactical workspace for capturing observations, entities, and context before transferring them to a long-term system.

Use it when:
- Responding to a live incident
- Writing an initial brief or report under time pressure
- Building a timeline of key events
- Tracking entities and relationships before formal entry
- You need a fast, trusted tool that doesn't retain data

---

## Features

- **Note Taking**: A clean, distraction-free editor for drafting intelligence reports. Use markdown for formatting.
- **Entity Tracking**: Log and manage key actors, locations, items, and other entities.
- **Network Graph**: Automatically visualize the relationships between your entities.
- **Timeline View**: Build a chronological view of events and link entities to them.
- **Interactive Map**: Plot any entities with coordinates on an interactive map.
- **Analysis Dashboard**: Get a quick overview of your collected intelligence.
- **Secure & Private**: 100% client-side. No data ever leaves your browser.
- **Save & Load**: Export your entire session to a local `.fw` (Watson File) file to resume later.

---

## Getting Started

1.  **Open the App**: Simply open the `index.html` file in your browser.
2.  **Start Writing**: Begin taking notes in the central editor panel.
3.  **Add Entities**: Use the right-hand panel to add new entities (people, places, etc.) or use the `Shift+Tab` shortcut to open the Quick Add modal.
4.  **Link Entities**: Once you've created entities, you can link them together to build a network of relationships.
5.  **Create Events**: Use the Quick Add modal (`Shift+Tab`) to create new events or incidents, which will appear in the timeline.
6.  **Visualize**: Switch between the different views (Network, Map, Analysis) to see your data in new ways.
7.  **Save Your Work**: Use `Ctrl+S` to save your project as a local `.wf` file. You can load it back into Watson at any time.

---

## Privacy and Security

Watson is designed for secure, short-term use in sensitive environments.

- 100% client-side, all data is stored in your browser tab only
- No server connection, sync, or cloud interaction
- No login, no tracking, no analytics
- Data persists only during the session unless explicitly saved
- All saved files are stored locally on your device

Nothing leaves your device. Watson is safe to use for pre-sanitised or sensitive information in disconnected, secure environments.

---

## Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| New brief | `Ctrl` + `N` |
| Save project | `Ctrl` + `S` |
| Open project | `Ctrl` + `O` |
| Quick Add Item | `Shift` + `Tab` |
| Toggle Left Panel | `Ctrl` + `M` |
| **Quick Insert** | |
| Open Quick Insert | `/` |
| Insert Current Time | `/now` + `Space` |
| **Navigation** | |
| Switch to Entities | `Ctrl` + `1` |
| Switch to Network | `Ctrl` + `2` |
| Switch to Analysis | `Ctrl` + `3` |
| Switch to Map | `Ctrl` + `4` |
| Switch to Timeline | `Ctrl` + `5` |

---

## Entity Types

- **Person/Organisation**: Individuals and groups
- **Email**: Email addresses
- **Phone**: Phone numbers
- **URL/Source**: Web sources and references
- **Location**: Places with optional coordinates
- **Vehicle**: Vehicles with description and license plate
- **Object**: Physical items with categories
- **Event**: A timestamped occurrence on the timeline.
- **Incident**: A more significant, timestamped event on the timeline, highlighted for emphasis.

---

## Future Features / To-Do

- **Image & Document Uploads**: Re-implement a robust and reliable system for uploading and managing images and documents as entities.
- **Advanced Search & Filtering**: Add more powerful search capabilities, including date ranges, regular expressions, and filtering by linked entities.
- **Customizable Themes**: Allow users to select different color themes to suit their preferences.
- **Data Import/Export**: Add options to import data from other formats (like CSV) and export to different formats (like PDF or markdown).
- **Graph Layout Options**: Provide different layout algorithms for the network graph to help with visualization.
