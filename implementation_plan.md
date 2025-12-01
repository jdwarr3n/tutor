# Python Tutor Clone Implementation Plan

## Goal Description
Create a web-based application similar to [Python Tutor](https://pythontutor.com/) that allows users to write Python code and visualize its execution line-by-line.

## User Review Required
> [!IMPORTANT]
> **Security Warning**: The backend will execute arbitrary code submitted by the user. For a local tool, this is acceptable, but if deployed, strictly sandboxing (e.g., Docker, gVisor) is required. This plan assumes a **local development environment** where the user trusts their own code.

## Proposed Changes

### Backend (Python/Flask)
We will create a Flask server that exposes a `/trace` endpoint.
- **Tracer Module**: A custom class using `sys.settrace` to hook into every line execution.
    - It will capture: `line_number`, `function_name`, `locals`, `globals`.
    - It will handle basic types (int, str, list, dict) and object references.
    - It will produce a JSON-serializable list of "steps".
- **API**:
    - `POST /trace`: Accepts `{ code: "..." }`. Returns `{ trace: [...] }`.

#### [NEW] `backend/app.py`
Entry point for the Flask application.

#### [NEW] `backend/tracer.py`
Core logic for `sys.settrace` and state serialization.

### Frontend (HTML/JS/CSS)
Served directly by Flask templates.
- **Layout**: Split screen. Left: Code Editor. Right: Visualization. Bottom/Top: Controls.
- **Tech Stack**:
    - HTML5 / CSS3 (Vanilla)
    - JavaScript (Vanilla)
    - Monaco Editor (via CDN) for code editing.
- **Structure**:
    - `backend/templates/index.html`: Main application page.
    - `backend/static/js/main.js`: Core logic (fetching trace, rendering visualization).
    - `backend/static/css/style.css`: Styling.

#### [NEW] `backend/templates/index.html`
Main entry point. Loads Monaco Editor from CDN and our custom scripts.
-   **[NEW] File Input**: Hidden input and "Load File" button.

#### [NEW] `backend/static/js/main.js`
Handles:
- `POST /trace` calls.
- Storing the trace state.
- Rendering the current step (Stack/Heap).
- Handling "Next", "Prev" buttons.
- **[NEW] File Loading Logic**: `FileReader` to read uploaded files into the editor.

#### [NEW] `backend/static/css/style.css`
Basic layout and styling for the visualization.

### Experimental: Reference Diagrams (Heap Visualization)
-   **Backend**:
    -   Modify `Tracer` to track unique object IDs (`id(obj)`).
    -   Separate `heap` dictionary in trace step.
    -   Serialize mutable objects (lists, dicts) into `heap` and store `{type: 'ref', id: ...}` in stack.
-   **Frontend**:
    -   Add `leader-line` library via CDN.
    -   Create a "Heap" column in the visualization pane.
    -   Render Heap objects as boxes.
    -   Draw arrows from Stack variables to Heap objects using `LeaderLine`.

## Verification Plan

### Automated Tests
- **Backend Tests**:
    - Write unit tests for `tracer.py` with sample code snippets (e.g., simple loop, function call) and assert the generated trace contains expected steps and variable values.
    - Run using `pytest`.

### Manual Verification
- **End-to-End**:
    1. Start Backend (`python app.py`).
    2. Open Browser to `http://localhost:5000`
    3. Enter code:
       ```python
       x = 1
       y = 2
       z = x + y
       ```
    4. Click "Visualize".
    5. Step through and verify `x`, `y`, and `z` appear in the visualization correctly.
