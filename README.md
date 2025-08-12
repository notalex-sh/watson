# Watson: Tactical Intelligence Platform

> Capture fast, visualize instantly, understand immediately.

![Watson Banner](./banner.png)

[Try Watson](https://watson-intel.vercel.app/)

**Watson** is a lightweight, browser-based intelligence platform designed for rapid data capture, visualization, and analysis in dynamic situations.

Built for investigators, journalists, and researchers, Watson provides a powerful, keyboard-first suite of tools to quickly make sense of complex information.

---

## Table of Contents

-   [Core Features](#core-features)
-   [Getting Started](#getting-started)
-   [Keyboard Shortcuts](#keyboard-shortcuts)
-   [Important Disclaimer](#important-disclaimer)
-   [About](#about)

---

## Core Features

-   **📝 Advanced Note-Taking:** A powerful, markdown-enabled editor serves as the core of your investigation.
    -   Use `/` for a **Quick Insert** menu to add entities directly from your notes.
    -   Type `/now` followed by a space to instantly insert the current formatted date and time.
-   **🔗 Dynamic Entity Management:** Seamlessly create and manage various entity types, including **People, Locations, Vehicles,** and **Intel**. The **Quick Add** modal (`Shift + Tab`) makes creating new items effortless.
-   **🧠 Intelligent Linking:**
    -   Build complex relationships between entities and timeline events directly from the "Add/Edit" modal.
    -   Use `@` to mention and automatically link entities within descriptions.
    -   Use `#` to mention and automatically link events within descriptions.
-   **👁️ Automated Visualization Suite:** Watson automatically generates and updates several views based on your data:
    -   **🗺️ Map View:** Instantly plots all `Location` entities on an interactive map.
    -   **🕸️ Network View:** Generates a dynamic, interactive graph to visualize the connections between all your entities and events.
    -   **⏳ Timeline View:** Organizes all `Event` and `Incident` items chronologically.
    -   **📁 Intel View:** A dedicated space to manage intelligence reports, documents, and other source materials.
-   **📊 Analysis Dashboard:** Get an at-a-glance overview of your project with statistics on total items, entity types, and connection density.
-   **🚀 Presentation Mode:** A full-screen, interactive view (`Ctrl/Cmd + P`) of your key visualizations, perfect for briefings and sharing your findings.
-   **💾 Data Persistence:** Save and load your entire project—notes, entities, links, and all—to a local `.wf` file.
-   **📄 PDF Export:** Generate a comprehensive, multi-page PDF report of your entire project, including all notes, entities, and visualizations.
-   **🔍 Global Search:** Instantly search across all items in your project with a powerful global search modal (`Shift + Space`).
-   **⌨️ Keyboard-First Design:** Packed with keyboard shortcuts to ensure you can capture and navigate information at lightning speed.

---

## Getting Started

1.  **Start Typing:** Use the main editor to begin capturing notes.
2.  **Add Entities:** Use the **Quick Add** modal (`Shift + Tab`) or the `+ Add` button.
3.  **Build Connections:** Link entities and events as you create them.
4.  **Explore Views:** Switch between the **Map, Timeline, Intel,** and **Network** views.
5.  **Save Your Work:** Use the `Save` button (`Ctrl/Cmd + S`) to export your project.

---

## Keyboard Shortcuts

| Shortcut                | Action                               |
| :---------------------- | :----------------------------------- |
| `Shift + Tab`           | Open Quick Add Modal                 |
| `Shift + Space`         | Open Global Search                   |
| `/` (in notes)          | Open Quick Insert menu               |
| `@` / `#` (in Quick Add)  | Mention an Entity / Event            |
| `/now` + `Space`        | Insert current date and time         |
| `Ctrl/Cmd + P`          | Enter Presentation Mode              |
| `Ctrl/Cmd + S`          | Save Project to `.wf` file           |
| `Ctrl/Cmd + O`          | Open a `.wf` project file            |
| `Ctrl/Cmd + N`          | Open a New Brief in a new tab        |
| `Ctrl/Cmd + M`          | Toggle the Left Visualization Panel  |
| `Ctrl/Cmd + 1`          | Switch to the **Entities** Tab       |
| `Ctrl/Cmd + 2`          | Switch to the **Network** View       |
| `Ctrl/Cmd + 3`          | Switch to the **Analysis** Tab       |
| `Ctrl/Cmd + 4`          | Switch to the **Map** View           |
| `Ctrl/Cmd + 5`          | Switch to the **Timeline** View      |
| `Ctrl/Cmd + 6`          | Switch to the **Intel** View         |

---

## ⚠️ Important Disclaimer

This application stores all data **locally in your browser session**. If you close the tab without saving, **your data will be lost**. Always use the **Save** button to export your project to a `.wf` file.

---

## About

Watson was created by [notalex.sh](https://www.notalex.sh) and is fully open source. View the source code and contribute on [GitHub](https://github.com/notalex-sh/watson).
