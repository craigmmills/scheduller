#!/usr/bin/env python3
"""
Flask server with CORS support for local development
Install Flask first: pip install flask flask-cors
Run with: python flask_server.py
"""

from flask import Flask, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/')
def index():
    """Serve the main index.html file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_file(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return {'status': 'healthy', 'message': 'Server is running!'}

if __name__ == '__main__':
    import sys
    
    # Get port from command line argument or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    print(f"🚀 Flask server starting at http://localhost:{port}")
    print(f"📁 Serving files from: {os.getcwd()}")
    print("Press Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=port, debug=True) 