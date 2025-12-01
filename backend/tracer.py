import sys
import io
import traceback
import types

class Tracer:
    def __init__(self):
        self.trace = []

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

        # Capture stack frames
        stack = []
        curr = frame
        while curr:
            if curr.f_code.co_filename == '<string>':
                locals_data = self.serialize_dict(curr.f_locals)
                
                # If this is the frame returning, add the return value
                if curr == frame and event == 'return':
                    locals_data['<return value>'] = self.serialize_value(arg)

                stack.append({
                    'func_name': curr.f_code.co_name,
                    'locals': locals_data,
                    'line': curr.f_lineno
                })
            curr = curr.f_back
        
        # Reverse stack so globals (module level) is at top/first
        stack.reverse()

        step = {
            'line': frame.f_lineno,
            'event': event,
            'func_name': frame.f_code.co_name,
            'stack': stack,
            'globals': self.serialize_dict(frame.f_globals),
            'stdout': self.capture_stdout.getvalue()
        }
        self.trace.append(step)
        return self.trace_lines

    def serialize_value(self, v):
        if isinstance(v, types.ModuleType): return "<module>"
        if isinstance(v, types.FunctionType): return f"<function {v.__name__}>"
        
        try:
            if isinstance(v, (int, float, str, bool, type(None))):
                return v
            elif isinstance(v, (list, tuple, set, dict)):
                return str(v)
            else:
                return repr(v)
        except:
            return "<error serializing>"

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
