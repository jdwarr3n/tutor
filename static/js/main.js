// Initialize Monaco Editor
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

let editor;
let traceData = [];
let currentStep = 0;
let currentDecorations = [];

// Pyodide Initialization
let pyodidePromise = (async () => {
    const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });

    // Load tracer module
    const response = await fetch('backend/tracer.py');
    const tracerCode = await response.text();
    pyodide.FS.writeFile('tracer.py', tracerCode);

    // Install any necessary packages (none for now as we use standard lib)
    return pyodide;
})();

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: [
            'x = [1, 2, 3]',
            'y = [x, x]',
            '',
            'x[1] = 4',
            '',
            'print(y)'
        ].join('\n'),
        language: 'python',
        minimap: { enabled: false },
        automaticLayout: true,
        glyphMargin: true
    });
});

// UI Elements
const fileInput = document.getElementById('fileInput');
const loadBtn = document.getElementById('loadBtn');
const visualizeBtn = document.getElementById('visualizeBtn');
const firstBtn = document.getElementById('firstBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const lastBtn = document.getElementById('lastBtn');
const stepDisplay = document.getElementById('stepDisplay');
const globalsView = document.getElementById('globals-view');
const localsView = document.getElementById('locals-view');
const stdoutView = document.getElementById('stdout-view');

// Event Listeners
loadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        editor.setValue(e.target.result);
        traceData = [];
        currentStep = 0;
        updateVisualization();
    };
    reader.readAsText(file);
});

visualizeBtn.addEventListener('click', async () => {
    const code = editor.getValue();
    visualizeBtn.disabled = true;
    visualizeBtn.textContent = 'Running...';

    try {
        const pyodide = await pyodidePromise;

        // Pass user code to Python
        pyodide.globals.set('user_code', code);

        // Run tracer and get JSON result
        const runScript = `
import tracer
import json
import importlib
importlib.reload(tracer) # Reload to ensure fresh state if needed

trace = tracer.trace_code(user_code)
json.dumps(trace)
`;
        const resultJson = await pyodide.runPythonAsync(runScript);
        traceData = JSON.parse(resultJson);

        currentStep = 0;
        updateVisualization();

    } catch (e) {
        console.error(e);
        alert('Failed to execute code: ' + e.message);
    } finally {
        visualizeBtn.disabled = false;
        visualizeBtn.textContent = 'Visualize Execution';
    }
});

firstBtn.addEventListener('click', () => {
    currentStep = 0;
    updateVisualization();
});

prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        updateVisualization();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentStep < traceData.length - 1) {
        currentStep++;
        updateVisualization();
    }
});

lastBtn.addEventListener('click', () => {
    currentStep = traceData.length - 1;
    updateVisualization();
});

function updateVisualization() {
    if (!traceData || traceData.length === 0) return;

    const step = traceData[currentStep];

    // Update controls
    firstBtn.disabled = currentStep === 0;
    prevBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === traceData.length - 1;
    lastBtn.disabled = currentStep === traceData.length - 1;
    stepDisplay.textContent = `Step ${currentStep + 1} of ${traceData.length}`;

    // Highlight line in editor
    // Monaco lines are 1-indexed
    currentDecorations = editor.deltaDecorations(currentDecorations, [
        {
            range: new monaco.Range(step.line, 1, step.line, 1),
            options: {
                isWholeLine: true,
                className: 'myLineDecoration',
                glyphMarginClassName: 'myGlyphMarginClass'
            }
        }
    ]);

    // Render Globals
    renderVariables(globalsView, step.globals);

    // Render Stack Frames
    localsView.innerHTML = ''; // Clear previous frames

    step.stack.forEach((frame, index) => {
        if (frame.func_name === '<module>') return;

        const frameDiv = document.createElement('div');
        frameDiv.className = 'stack-frame';

        const title = document.createElement('div');
        title.className = 'frame-title';
        title.textContent = frame.func_name;
        frameDiv.appendChild(title);

        const varsDiv = document.createElement('div');
        renderVariables(varsDiv, frame.locals);
        frameDiv.appendChild(varsDiv);

        localsView.appendChild(frameDiv);
    });

    // Render Heap
    renderHeap(step.heap);

    // Draw Arrows (after a slight delay to ensure DOM is ready)
    setTimeout(drawArrows, 50);

    // Render Stdout
    stdoutView.textContent = step.stdout || '';
}

let arrows = [];

function drawArrows() {
    // Remove existing arrows
    arrows.forEach(arrow => arrow.remove());
    arrows = [];

    // Find all references
    const refs = document.querySelectorAll('[data-ref-id]');
    refs.forEach(refEl => {
        const id = refEl.dataset.refId;
        const targetEl = document.getElementById(`heap-${id}`);

        if (targetEl) {
            try {
                const arrow = new LeaderLine(
                    refEl,
                    targetEl,
                    {
                        color: '#6c757d',
                        size: 2,
                        path: 'straight',
                        startSocket: 'right',
                        endSocket: 'left'
                    }
                );
                arrows.push(arrow);
            } catch (e) {
                console.error('Error drawing arrow:', e);
            }
        }
    });
}

function renderHeap(heap) {
    const heapView = document.getElementById('heap-view');
    heapView.innerHTML = '';

    if (!heap) return;

    // Heap is now an array of objects: [{id: '...', type: '...', value: ...}, ...]
    heap.forEach(obj => {
        const id = obj.id;

        const objDiv = document.createElement('div');
        objDiv.className = 'heap-object';
        objDiv.id = `heap-${id}`;

        const idDiv = document.createElement('div');
        idDiv.className = 'heap-id';
        // Shorten ID to last 4 digits
        idDiv.textContent = `id: ...${id.slice(-4)}`;
        objDiv.appendChild(idDiv);

        const valueDiv = document.createElement('div');
        valueDiv.className = 'heap-value';

        if (obj.type === 'list' || obj.type === 'tuple' || obj.type === 'set') {
            obj.value.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'heap-list-item';

                const indexDiv = document.createElement('div');
                indexDiv.className = 'heap-item-index';
                indexDiv.textContent = index;

                const valDiv = document.createElement('div');
                valDiv.className = 'heap-item-box';
                if (item && item.type === 'ref') {
                    valDiv.textContent = '•';
                    valDiv.dataset.refId = item.id;
                } else {
                    valDiv.textContent = item;
                }

                itemDiv.appendChild(indexDiv);
                itemDiv.appendChild(valDiv);
                valueDiv.appendChild(itemDiv);
            });
        } else if (obj.type === 'dict') {
            obj.value.forEach(([k, v]) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'heap-dict-item';

                const keyDiv = document.createElement('div');
                keyDiv.className = 'heap-dict-key';
                keyDiv.textContent = k;

                const valDiv = document.createElement('div');
                valDiv.className = 'heap-item-box';
                valDiv.textContent = v; // Simplified for now

                itemDiv.appendChild(keyDiv);
                itemDiv.appendChild(valDiv);
                valueDiv.appendChild(itemDiv);
            });
        } else {
            valueDiv.textContent = obj.value;
        }

        objDiv.appendChild(valueDiv);
        heapView.appendChild(objDiv);
    });
}

function renderVariables(container, variables) {
    container.innerHTML = '';

    if (!variables || Object.keys(variables).length === 0) {
        container.innerHTML = '<em>No variables</em>';
        return;
    }

    for (const [name, value] of Object.entries(variables)) {
        const row = document.createElement('div');
        row.className = 'variable-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'var-name';
        nameSpan.textContent = name;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'var-value';

        if (value && value.type === 'ref') {
            valueSpan.textContent = '•'; // Dot for reference
            valueSpan.dataset.refId = value.id;
        } else {
            valueSpan.textContent = value;
        }

        row.appendChild(nameSpan);
        row.appendChild(valueSpan);
        container.appendChild(row);
    }
}

window.addEventListener('resize', () => {
    drawArrows();
});
