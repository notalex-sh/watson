# Watson 
## Tactical Intelligence Platform

> Intel. Fast. Field Ready.

![Watson Banner](./banner.png)

Watson is a lightweight, browser-based intelligence analysis tool designed for rapid data capture, visualization, and analysis. Built for investigators, journalists, and researchers, it provides a powerful suite of tools to quickly make sense of complex information during dynamic situations.

---

## Key Features

-   **Centralized Note-Taking:** A simple and powerful editor serves as the core of your investigation. It supports markdown-style shortcuts for lists and auto-pairing of brackets and quotes.
-   **Dynamic Entity Management:** Create and manage various types of entities, including People, Locations, Vehicles, and more. The **Quick Add** modal (`Shift + Tab`) makes creating new items effortless.
-   **Intelligent Linking:** Build relationships between entities and timeline events. Link items directly from the "Add/Edit" modal to establish connections.
-   **Automated Visualization:** Watson automatically generates and updates several views based on your data:
    -   **Map View:** Automatically plots all `Location` entities on an interactive map.
    -   **Network View:** Generates a dynamic, interactive graph to visualize the connections and relationships between all your entities and events.
    -   **Timeline View:** Organizes all `Event` and `Incident` items chronologically, providing a clear sequence of activities.
-   **Presentation Mode:** A full-screen, interactive view (`Ctrl/Cmd + P`) of your key visualizations, perfect for briefings, analysis, and sharing your findings.
-   **Data Persistence:** Save your entire project—notes, entities, links, views, and all—to a local `.wf` file. You can load projects back into the application at any time.
-   **Keyboard-First Design:** The application is packed with keyboard shortcuts to ensure you can capture and navigate information as quickly as possible.

---

## Getting Started

1.  **Start Typing:** Use the main editor on the left to begin capturing notes and intelligence.
2.  **Add Entities:** Use the **Quick Add** modal (`Shift + Tab`) or the `+ Add` button to create structured entities or events.
3.  **Build Connections:** While adding or editing an entity, use the "Link to Existing Entity" or "Link to Event" dropdowns to create relationships.
4.  **Explore the Views:** Switch between the **Map**, **Timeline**, and **Network** views on the left panel to see your data visualized automatically.
5.  **Analyze and Save:** Use the **Analysis** tab to see stats about your data. When you're done, use the `Save` button in the header to export your project to a file.

---

## Keyboard Shortcuts

| Shortcut           | Action                           |
| :----------------- | :------------------------------- |
| `Shift + Tab`      | Open Quick Add Modal             |
| `/` (in notes)     | Open Quick Insert menu           |
| `/now` + `Space`   | Insert current date and time     |
| `Ctrl/Cmd + P`     | Enter Presentation Mode          |
| `Ctrl/Cmd + S`     | Save Project to `.wf` file       |
| `Ctrl/Cmd + O`     | Open a `.wf` project file        |
| `Ctrl/Cmd + N`     | Open a New Brief in a new tab    |
| `Ctrl/Cmd + M`     | Toggle the Left Visualization Panel|
| `Ctrl/Cmd + 1`     | Switch to the **Entities** Tab   |
| `Ctrl/Cmd + 2`     | Switch to the **Network** View   |
| `Ctrl/Cmd + 3`     | Switch to the **Analysis** Tab   |
| `Ctrl/Cmd + 4`     | Switch to the **Map** View       |
| `Ctrl/Cmd + 5`     | Switch to the **Timeline** View  |

---

## Important Disclaimer

This application stores all data **locally in your browser session**. If you close the browser tab or shut down your computer without saving, **your data will be lost**.

Always use the **Save** button to export your project to a `.wf` file for backup and future use.

---

## About the Creator

Watson was created by [notalex.sh](https://www.notalex.sh) and is fully open source. You can view the source code and contribute to the project on [GitHub](https://github.com/notalex-sh/watson).
