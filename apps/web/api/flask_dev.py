#!/usr/bin/env python3
"""Flask development server for local testing of Vercel Functions."""

import sys
import importlib.util
from pathlib import Path
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from io import BytesIO

PORT = 5328
API_DIR = Path(__file__).parent

app = Flask(__name__)
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
CORS(app)

@app.after_request
def remove_server_header(response):
    response.headers.pop('Server', None)
    response.headers.pop('Date', None)
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({'error': str(e), 'statusCode': 500}), 500


def load_function(function_name):
    """Load Vercel function and return handler class."""
    function_path = API_DIR / f"{function_name}.py"
    if not function_path.exists() or function_path.name == 'flask_dev.py':
        return None
    
    spec = importlib.util.spec_from_file_location(function_name, function_path)
    if not spec or not spec.loader:
        return None
    
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(API_DIR))
    spec.loader.exec_module(module)
    return getattr(module, 'handler', None)


class ResponseBuffer:
    """Captures handler output."""
    def __init__(self):
        self.status = 200
        self.headers = {}
        self.body = b''
        self.headers_sent = False
    
    def send_response(self, code):
        self.status = code
    
    def send_header(self, key, value):
        self.headers[key] = value
    
    def end_headers(self):
        self.headers_sent = True
    
    def write(self, data):
        data_bytes = data if isinstance(data, bytes) else data.encode('utf-8')
        data_str = data_bytes.decode('utf-8', errors='ignore').strip()
        
        if data_str.startswith('HTTP/'):
            return
        
        if ':' in data_str and not data_str.startswith(('{', '[')):
            return
        
        if data_bytes.strip() in (b'', b'\r\n', b'\n', b'\r'):
            return
        
        if data_str.startswith(('{', '[')) or self.headers_sent:
            self.body += data_bytes


def execute_handler(handler_class, method, flask_request):
    """Execute Vercel handler with Flask request."""
    buffer = ResponseBuffer()
    
    handler = handler_class.__new__(handler_class)
    handler.command = method
    handler.path = flask_request.path
    handler.request_version = 'HTTP/1.1'
    handler.requestline = f"{method} {flask_request.path} HTTP/1.1"
    handler.raw_requestline = handler.requestline.encode()
    handler.headers = flask_request.headers
    handler.client_address = ('127.0.0.1', 0)
    handler.rfile = BytesIO(flask_request.get_data())
    handler.wfile = buffer
    handler.server = None
    handler.close_connection = True
    handler.request = None
    handler.sys_version = ""
    handler.server_version = ""
    handler.log_message = lambda *args: None
    
    try:
        method_func = getattr(handler, f'do_{method}', None)
        if not method_func:
            return jsonify({'error': f'Method {method} not allowed'}), 405
        
        method_func()
        
        body = buffer.body.decode('utf-8', errors='ignore').strip()
        import re
        json_match = re.search(r'\{.*\}', body, re.DOTALL)
        clean_body = (json_match.group(0) if json_match else body or '{}').encode('utf-8')
        
        return Response(
            clean_body,
            status=buffer.status,
            headers={'Content-Type': buffer.headers.get('Content-Type', 'application/json')},
            content_type='application/json'
        )
    except Exception as e:
        return jsonify({'error': str(e), 'statusCode': 500}), 500


@app.route('/api/<function_name>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@app.route('/api/<function_name>/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def handle_api(function_name, subpath=None):
    """Route requests to Vercel functions."""
    handler_class = load_function(function_name)
    if not handler_class:
        return jsonify({'error': f'Function "{function_name}" not found', 'statusCode': 404}), 404
    
    result = execute_handler(handler_class, request.method, request)
    if not isinstance(result, Response):
        return jsonify({'error': 'Invalid response', 'statusCode': 500}), 500
    
    return result


@app.route('/api', methods=['GET'])
def api_root():
    """List available functions."""
    functions = [
        f.stem for f in API_DIR.glob('*.py')
        if f.name != 'flask_dev.py' and f.stem != '__init__'
    ]
    return jsonify({'message': 'MomentoVino API', 'status': 'running', 'functions': functions})


if __name__ == '__main__':
    print(f"""
╔═══════════════════════════════════════════════════════════╗
║  Flask Development Server                                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server: http://localhost:{PORT:<43}║
║  API:    http://localhost:{PORT}/api/health                ║
╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(host='127.0.0.1', port=PORT, debug=False)
