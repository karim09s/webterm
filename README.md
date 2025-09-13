# WebTerm

A web-based terminal emulator with persistent session management, multi-session support, and seamless file handling.

## Features

### Persistent Sessions
- Terminal sessions remain active even after closing the browser
- Reconnect to previous sessions with full history preserved
- Output buffer retention (last 1000 lines per session)
- Sessions auto-cleanup after 24 hours of inactivity

### Multi-Session Management
- Create and manage multiple independent terminal sessions
- Quick session switching via sidebar menu
- Rename sessions for better organization
- Visual indicators for active sessions and last access time

### File and Image Handling
- **Drag & Drop Support**: Drop files directly into the terminal
  - Files are uploaded to `~/wt_upload/` directory
  - File path automatically inserted at cursor position
  - Maximum file size: 100MB
- **Image Preview**: Dropped images are displayed inline in the terminal before upload
- **Smart Path Insertion**: Paths with spaces are automatically quoted

### Input Methods
- **Standard Input**: Type commands in the bottom input panel
- **Multi-line Support**:
  - `Enter`: Execute command
  - `Cmd/Ctrl + Enter`: Insert line break
- **Direct Terminal Input**: Click on terminal to type directly

## Keyboard Shortcuts

### Session Management
- `Alt + Shift + C`: Create new session
- `Alt + Shift + P`: Previous session
- `Alt + Shift + N`: Next session
- `Alt + Shift + R`: Rename current session
- `Alt + Shift + X`: Terminate current session

### Navigation
- `Alt + 1`: Focus terminal
- `Alt + 2`: Focus input field
- `Alt + 3`: Toggle sidebar
- `Escape`: Return to terminal / Close sidebar

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
```bash
git clone https://github.com/yourusername/webterm.git
cd webterm
npm install
```

### Running the Server
```bash
# Production mode
npm start

# Development mode with auto-restart
npm run dev

# Custom port
PORT=8080 npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Create a new session or connect to an existing one
3. Use the terminal as you would any local terminal
4. Drag and drop files when needed
5. Switch between sessions using the sidebar or keyboard shortcuts

## Security Considerations

### Network Security
**Important**: WebTerm has no built-in authentication. It provides full terminal access to anyone who can reach the server.

- **Local Network**: By default, the server is accessible to all devices on your local network
- **Public Networks**: Never run WebTerm on public networks without proper security measures
- **Recommendation**: Use only on trusted networks or implement additional security layers

### Remote Access with Tailscale
For secure remote access, we recommend using [Tailscale](https://tailscale.com/):

1. Install Tailscale on your server and client devices
2. Connect all devices to your Tailscale network
3. Access WebTerm using your server's Tailscale IP
4. Enjoy secure terminal access from anywhere, including iPads and mobile devices

This approach provides:
- End-to-end encryption
- Zero-configuration VPN
- Works seamlessly on iPads and mobile browsers
- No port forwarding or firewall configuration needed

## Technical Stack

- **Backend**: Node.js, Express, Socket.io, node-pty
- **Frontend**: xterm.js, vanilla JavaScript
- **Session Management**: UUID-based identification with server-side state management

## Architecture

```
webterm/
├── server.js       # Express server and session management
├── index.html      # Frontend application
├── package.json    # Dependencies
└── uploads/        # Uploaded files directory (auto-created)
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (with on-screen keyboard support)

## Known Limitations

- Terminal size is fixed on session creation
- File uploads are stored locally on the server
- No built-in file download capability (use `cat` or other tools)
- Sessions are stored in memory (lost on server restart)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT