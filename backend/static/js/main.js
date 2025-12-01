// Initialize Monaco Editor
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

let editor;
let traceData = [];
let currentStep = 0;

let currentDecorations = [];

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: [
            'def factorial(n):',
            '    if n == 0:',
            '        return 1',
            '    else:',
            '        return n * factorial(n-1)',
            '',
            'x = factorial(3)',
            'print(x)'
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
        // Reset visualization when new code is loaded
        traceData = [];
        currentStep = 0;
        updateVisualization();
    };
    reader.readAsText(file);
});

visualizeBtn.addEventListener('click', async () => {
    const code = editor.getValue();

    try {
        visualizeBtn.disabled = true;
        visualizeBtn.textContent = 'Running...';

        const response = await fetch('/trace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }

        traceData = data.trace;
        currentStep = 0;
        updateVisualization();

    } catch (e) {
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

    // Reverse stack for display if needed, but Python Tutor usually shows 
    // Top-level (Globals) -> Function Calls -> Current Frame (Bottom)
    // Our stack is already ordered [Module, Func1, Func2...] from the backend

    step.stack.forEach((frame, index) => {
        // Skip module level frame if it's just globals (optional, but cleaner)
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

    // Render Stdout
    stdoutView.textContent = step.stdout || '';
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
        valueSpan.textContent = value;

        row.appendChild(nameSpan);
        row.appendChild(valueSpan);
        container.appendChild(row);
    }
}
