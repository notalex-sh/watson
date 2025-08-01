# Watson – Tactical Intel Tool

**Watson** is a lightweight, secure intelligence tool built by intelligence professionals for intelligence professionals.

It helps you keep track of people, places, vehicles, objects, and relationships while drafting structured intelligence notes — especially during fast-moving incidents, investigations, or early-stage analysis. Everything is designed for speed, clarity, and field-readiness.

> Intel. Fast. Field-Ready.

---

## Purpose

Watson is not a full intelligence platform. It's a disposable tactical workspace for capturing observations, entities, and context before transferring them to a long-term system.

Use it when:
- Responding to a live incident
- Writing an initial brief or report under time pressure
- Tracking entities and relationships before formal entry
- You need a fast, trusted tool that doesn't retain data

---

## Features

- **Three-column layout**: Notes editor, collapsible map view, and entity management
- **Enhanced entity types**: People, organisations, locations, vehicles, objects, documents, sources, and contacts
- **Advanced location search**: Search for locations like Google Maps with OpenStreetMap integration
- **Quick entity insert**: Press `/` in notes to quickly insert entity references
- **Save/Load projects**: Export and import Watson files (.wf format) locally
- **Edit entities**: Update existing entities and their relationships
- **Animated UI**: Subtle animations and proper z-index management for modals
- **Keyboard shortcuts**: Fast access to common actions (Ctrl+N, Ctrl+S, Ctrl+O, Ctrl+E, Ctrl+M)
- **Interactive network visualisation**: Pan and zoom entity relationship graphs
- **Map visualisation**: View all location entities on an interactive map
- **Real-time analysis**: Track statistics and identify most connected entities

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

## Open Source and Transparency

Watson is fully open source to ensure verifiable security and operational transparency.

- You can inspect the code to confirm that no data is sent or stored externally
- There are no hidden trackers, analytics, or background requests
- You are free to fork, audit, or self-host for complete control

---

## Keyboard Shortcuts

| Action              | Shortcut         |
|---------------------|------------------|
| New brief           | Ctrl + N         |
| Save project        | Ctrl + S         |
| Open project        | Ctrl + O         |
| Add entity          | Ctrl + E         |
| Toggle map          | Ctrl + M         |
| Quick insert entity | /                |
| View entity         | Click on entity  |
| Zoom graph          | Scroll wheel     |

---

## Entity Types

- **Person/Organisation**: Individuals and groups
- **Email**: Email addresses with mailto: links
- **Phone**: Phone numbers with tel: links
- **URL/Source**: Web sources and references
- **Image/Document**: Uploaded or pasted images
- **Location**: Places with optional coordinates and map display
- **Vehicle**: Vehicles with description and license plate
- **Object**: Physical items with categories (weapons, electronics, documents, etc.)

---

## Intended Users

- Intelligence professionals
- Investigative teams and analysts
- Incident responders
- Law enforcement personnel
- Security professionals
- Anyone needing a secure scratchpad for fast tactical documentation

---

## Project Status

Watson is under active development. Feedback, forks, and contributions are welcome.

## TODO

Future enhancements under consideration:

- [ ] Timeline view for temporal analysis
- [ ] Enhanced export formats (PDF, DOCX)
- [ ] Bulk entity import from CSV
- [ ] Entity tagging and categorisation
- [ ] Advanced filtering and search operators
- [ ] Offline map tile caching
- [ ] Custom entity types
- [ ] Entity merge and split operations