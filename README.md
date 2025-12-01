# Python Tutor Clone (Client-Side)

This version runs entirely in the browser using [Pyodide](https://pyodide.org/). No backend server is required.

## How to Run

1.  **Start a local HTTP server**:
    Browsers block local file access (CORS) for Pyodide, so you must serve the files via HTTP.
    ```bash
    python -m http.server
    ```

2.  **Open in Browser**:
    Go to [http://localhost:8000](http://localhost:8000)

## Deployment

You can deploy this folder directly to **GitHub Pages**, Vercel, or any static file host.
