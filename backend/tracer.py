import sys
import io
import traceback
import types

class Tracer:
    def __init__(self):
        self.trace = []
        self.object_registry = {} # id -> creation_index
        self.next_object_index = 0

    def trace_calls(self, frame, event, arg):
        if event != 'call':
            return
        return self.trace_lines

    def trace_lines(self, frame, event, arg):
        if event not in ['line', 'return', 'call']:
            return self.trace_lines

        # Filter out system files
        if frame.f_code.co_filename.startswith('<') and frame.f_code.co_filename != '<string>':
             return self.trace_lines
        
        # We only care about the user's code which is executed as <string>
        if frame.f_code.co_filename != '<string>':
            return self.trace_lines

        # Reset heap for this step (snapshot)
        self.current_heap = {}

        # Capture stack frames
        frames = []
        curr = frame
        while curr:
            if curr.f_code.co_filename == '<string>':
                frames.append(curr)
            curr = curr.f_back
        
        # Process frames Shallow -> Deep (Globals first)
        frames.reverse()
        
        stack = []
        for f in frames:
            locals_data = self.serialize_dict(f.f_locals)
            
            # If this is the frame returning, add the return value
            if f == frame and event == 'return':
                locals_data['<return value>'] = self.serialize_value(arg)

            stack.append({
                'func_name': f.f_code.co_name,
                'locals': locals_data,
                'line': f.f_lineno
            })

        # Sort heap by creation index
        sorted_heap = []
        # Filter current_heap keys that are in registry (should be all) and sort by index
        sorted_keys = sorted(self.current_heap.keys(), key=lambda k: self.object_registry.get(k, float('inf')))
        for k in sorted_keys:
            obj_data = self.current_heap[k]
            obj_data['id'] = k
            sorted_heap.append(obj_data)

        step = {
            'line': frame.f_lineno,
            'event': event,
            'func_name': frame.f_code.co_name,
            'stack': stack,
            'globals': self.serialize_dict(frame.f_globals),
            'heap': sorted_heap, # Snapshot of the heap, sorted list
            'stdout': self.capture_stdout.getvalue()
        }
        self.trace.append(step)
        return self.trace_lines

    def serialize_value(self, v):
        if isinstance(v, types.ModuleType): return "<module>"
        if isinstance(v, types.FunctionType): return f"<function {v.__name__}>"
        
        try:
            # Immutable types (pass by value in visualization)
            if isinstance(v, (int, float, str, bool, type(None))):
                return v
            
            # Mutable types (pass by reference)
            # We use id(v) as the unique identifier
            obj_id = str(id(v))
            
            # If not already in heap, add it
            if obj_id not in self.current_heap:
                # Register creation order if new
                if obj_id not in self.object_registry:
                    self.object_registry[obj_id] = self.next_object_index
                    self.next_object_index += 1

                if isinstance(v, (list, tuple, set)):
                    # Recursively serialize items
                    self.current_heap[obj_id] = {
                        'type': type(v).__name__,
                        'value': [self.serialize_value(item) for item in v]
                    }
                elif isinstance(v, dict):
                    self.current_heap[obj_id] = {
                        'type': 'dict',
                        'value': [[self.serialize_value(k), self.serialize_value(val)] for k, val in v.items()]
                    }
                else:
                     self.current_heap[obj_id] = {
                        'type': 'object',
                        'value': repr(v)
                    }
            
            # Return a reference object
            return {'type': 'ref', 'id': obj_id}
            
        except Exception as e:
            return f"<error serializing: {str(e)}>"

    def serialize_dict(self, d):
        result = {}
        for k, v in d.items():
            if k.startswith('__'): continue # Skip internal vars
            result[k] = self.serialize_value(v)
        return result

    def run(self, code):
        self.trace = []
        self.capture_stdout = io.StringIO()
        original_stdout = sys.stdout
        sys.stdout = self.capture_stdout

        try:
            # Compile first to catch syntax errors
            compiled_code = compile(code, '<string>', 'exec')
            
            sys.settrace(self.trace_calls)
            exec(compiled_code, {})
            sys.settrace(None)
            
        except Exception:
            sys.settrace(None)
            # Add the error to the trace
            self.trace.append({
                'event': 'exception',
                'exception': traceback.format_exc(),
                'stdout': self.capture_stdout.getvalue()
            })
        finally:
            sys.stdout = original_stdout
            
        return self.trace

def trace_code(code):
    tracer = Tracer()
    return tracer.run(code)
