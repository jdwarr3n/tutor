# Python Tutor Clone Implementation Plan

## Goal Description
Create a web-based application similar to [Python Tutor](https://pythontutor.com/) that allows users to write Python code and visualize its execution line-by-line.
**Update**: The application has been migrated to a client-side architecture using Pyodide to enable secure, serverless hosting.

## User Review Required
> [!IMPORTANT]
> **Architecture Change**: The application now runs entirely in the browser using WebAssembly (Pyodide). There is no backend server. This improves security and allows for static hosting (e.g., GitHub Pages).

## Implemented Architecture

### Client-Side (Pyodide)
The Python runtime is loaded in the browser.
- **Tracer Module**: The original `tracer.py` logic is loaded into the Pyodide environment.
- **Execution**: JavaScript calls `pyodide.runPython()` to execute the tracer and user code.
- **Data Flow**: The tracer returns a JSON string which is parsed by JavaScript to render the visualization.

### Frontend (HTML/JS/CSS)
- **Tech Stack**:
    - HTML5 / CSS3 (Vanilla)
    - JavaScript (Vanilla)
    - Monaco Editor (via CDN)
    - Pyodide (via CDN)
    - LeaderLine (via CDN)
- **Structure**:
    - `index.html`: Main entry point. Loads Pyodide and scripts.
    - `static/js/main.js`: Handles UI, Pyodide initialization, and visualization logic.
    - `static/css/style.css`: Styling.

### Visualization Features
- **Stack & Globals**: Displays variables and stack frames.
- **Heap Visualization**:
    - Objects are separated from the stack.
    - **Grid Layout**: Heap objects are arranged in a responsive grid.
    - **Chronological Order**: Objects are sorted by creation time (oldest -> newest).
    - **Arrows**: `LeaderLine` draws straight arrows from references to objects.

## Verification Plan

### Manual Verification
1.  **Local Execution**:
    - Run `python -m http.server` in the project root.
    - Open `http://localhost:8000`.
2.  **Functional Testing**:
    - Load `Files/list_sum.py` (recursion).
    - Verify visualization steps, heap ordering, and arrows.
3.  **Deployment**:
    - Push to GitHub.
    - Enable GitHub Pages on the `client-side` branch.
    - Verify the live URL.
