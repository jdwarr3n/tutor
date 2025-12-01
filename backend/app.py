from flask import Flask, request, jsonify, render_template
from tracer import trace_code
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/trace', methods=['POST'])
def trace():
    data = request.get_json()
    code = data.get('code', '')
    
    if not code:
        return jsonify({'error': 'No code provided'}), 400
        
    try:
        trace_data = trace_code(code)
        return jsonify({'trace': trace_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
