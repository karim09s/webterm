const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const pty = require('node-pty');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));

// Session management
const sessions = new Map();
const BUFFER_MAX_LINES = 1000; // Keep last 1000 lines per session

// Ensure uploads directory exists in home directory
const uploadsDir = path.join(os.homedir(), 'wt_upload');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    const safeName = name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    const finalName = safeName || 'file';
    cb(null, `${uniqueSuffix}-${finalName}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Session class
class TerminalSession {
  constructor(id, name = null) {
    this.id = id;
    this.name = name || `Session ${sessions.size + 1}`;
    this.createdAt = new Date();
    this.lastAccessedAt = new Date();
    this.buffer = [];
    this.currentSocket = null;
    this.ptyProcess = null;
    this.isActive = false;
    
    this.initPty();
  }
  
  initPty() {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: os.homedir(),  // Start in home directory
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      }
    });
    
    this.isActive = true;
    
    // Store output in buffer
    this.ptyProcess.onData((data) => {
      // Add to buffer
      this.buffer.push({
        data: data,
        timestamp: new Date()
      });
      
      // Limit buffer size
      if (this.buffer.length > BUFFER_MAX_LINES) {
        this.buffer = this.buffer.slice(-BUFFER_MAX_LINES);
      }
      
      // Send to connected client if any
      if (this.currentSocket) {
        this.currentSocket.emit('terminal-data', data);
      }
    });
    
    this.ptyProcess.onExit((exitCode) => {
      console.log(`Session ${this.id} PTY process exited with code: ${exitCode}`);
      this.isActive = false;
      if (this.currentSocket) {
        this.currentSocket.emit('terminal-exit', exitCode);
      }
    });
  }
  
  connect(socket) {
    // Disconnect previous socket if any
    if (this.currentSocket && this.currentSocket.id !== socket.id) {
      this.currentSocket.emit('session-taken', { sessionId: this.id });
      this.currentSocket = null;
    }
    
    this.currentSocket = socket;
    this.lastAccessedAt = new Date();
    
    // Send buffer history to new connection
    const recentBuffer = this.buffer.slice(-100); // Send last 100 entries
    socket.emit('buffer-history', recentBuffer.map(b => b.data).join(''));
  }
  
  disconnect() {
    this.currentSocket = null;
  }
  
  write(data) {
    if (this.ptyProcess && this.isActive) {
      this.ptyProcess.write(data);
      this.lastAccessedAt = new Date();
    }
  }
  
  resize(cols, rows) {
    if (this.ptyProcess && this.isActive) {
      this.ptyProcess.resize(cols, rows);
    }
  }
  
  rename(newName) {
    this.name = newName;
    this.lastAccessedAt = new Date();
  }
  
  terminate() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.isActive = false;
    }
    if (this.currentSocket) {
      this.currentSocket.emit('session-terminated', { sessionId: this.id });
    }
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      lastAccessedAt: this.lastAccessedAt,
      isActive: this.isActive,
      isConnected: !!this.currentSocket
    };
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // List all sessions
  socket.on('list-sessions', () => {
    const sessionList = Array.from(sessions.values()).map(s => s.toJSON());
    socket.emit('sessions-list', sessionList);
  });
  
  // Create new session
  socket.on('create-session', (data) => {
    const sessionId = uuidv4();
    const session = new TerminalSession(sessionId, data?.name);
    sessions.set(sessionId, session);
    
    session.connect(socket);
    
    socket.emit('session-created', {
      sessionId: sessionId,
      sessionInfo: session.toJSON()
    });
    
    // Broadcast to all clients that a new session was created
    io.emit('session-list-updated');
    
    console.log(`Created new session: ${sessionId} (${session.name})`);
  });
  
  // Disconnect from current session
  socket.on('disconnect-from-session', (sessionId) => {
    const session = sessions.get(sessionId);
    
    if (session && session.currentSocket && session.currentSocket.id === socket.id) {
      session.disconnect();
      console.log(`Client ${socket.id} disconnected from session ${sessionId}`);
    }
  });
  
  // Connect to existing session
  socket.on('connect-to-session', (sessionId) => {
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('session-not-found', { sessionId });
      return;
    }
    
    if (!session.isActive) {
      socket.emit('session-inactive', { sessionId });
      return;
    }
    
    session.connect(socket);
    socket.emit('session-connected', {
      sessionId: sessionId,
      sessionInfo: session.toJSON()
    });
    
    console.log(`Client ${socket.id} connected to session ${sessionId}`);
  });
  
  // Rename session
  socket.on('rename-session', ({ sessionId, newName }) => {
    const session = sessions.get(sessionId);
    
    if (session) {
      session.rename(newName);
      socket.emit('session-renamed', {
        sessionId: sessionId,
        newName: newName
      });
      
      // Broadcast to all clients
      io.emit('session-list-updated');
    }
  });
  
  // Terminal input
  socket.on('terminal-input', ({ sessionId, data }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.write(data);
    }
  });
  
  // Terminal paste - handle multiline input
  socket.on('terminal-paste', ({ sessionId, data }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.write(data);
    }
  });
  
  // Terminal resize
  socket.on('terminal-resize', ({ sessionId, cols, rows }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.resize(cols, rows);
    }
  });
  
  // Terminate session
  socket.on('terminate-session', (sessionId) => {
    const session = sessions.get(sessionId);
    
    if (session) {
      session.terminate();
      sessions.delete(sessionId);
      
      socket.emit('session-terminated', { sessionId });
      
      // Broadcast to all clients
      io.emit('session-list-updated');
      
      console.log(`Session terminated: ${sessionId}`);
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and disconnect from any active session
    for (const session of sessions.values()) {
      if (session.currentSocket && session.currentSocket.id === socket.id) {
        session.disconnect();
        break;
      }
    }
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return path as ~/wt_upload/filename
    const fileName = path.basename(req.file.path);
    const filePath = `~/wt_upload/${fileName}`;
    console.log(`File uploaded: ${req.file.originalname} -> ${filePath}`);
    
    res.json({
      success: true,
      path: filePath,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// List uploaded files
app.get('/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir).map(filename => {
      const filepath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filepath);
      return {
        name: filename,
        path: `~/wt_upload/${filename}`,
        size: stats.size,
        modified: stats.mtime
      };
    });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files: ' + error.message });
  }
});

// Delete uploaded file
app.delete('/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    fs.unlinkSync(filepath);
    console.log(`File deleted: ${filename}`);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file: ' + error.message });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Clean up inactive sessions periodically (optional)
setInterval(() => {
  const now = new Date();
  const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [id, session] of sessions.entries()) {
    if (!session.isActive && (now - session.lastAccessedAt) > maxInactiveTime) {
      sessions.delete(id);
      console.log(`Cleaned up inactive session: ${id}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

server.listen(PORT, () => {
  console.log(`WebTerm Server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ~/wt_upload/ (${uploadsDir})`);
  console.log('Features: Persistent sessions, Multi-session support, Session management');
});