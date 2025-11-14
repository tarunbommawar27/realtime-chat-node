# Real-Time Chat Application

A simple, beginner-friendly real-time chat application built with **pure Node.js** and **vanilla JavaScript**. No frameworks like Express or React—just the fundamentals!

This project demonstrates how WebSockets work, how to build a server from scratch, and how to create interactive web applications using core technologies.

---

## Features

- **Real-time messaging** - Messages appear instantly for all connected users
- **User join/leave notifications** - System messages when users enter or exit
- **Typing indicators** - See when other users are typing
- **Online user count** - Live badge showing how many users are connected
- **Username persistence** - Your username is saved in localStorage
- **Dark modern UI** - Clean, responsive design that works on mobile and desktop
- **Message timestamps** - Each message shows when it was sent

---

## Installation and Setup

### Prerequisites

- **Node.js v20+** (recommended)
- npm (comes with Node.js)

### Installation Steps

1. **Navigate to the project directory:**
   ```bash
   cd realtime-chat
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This installs the `ws` WebSocket library (the only dependency).

3. **Start the server:**
   ```bash
   npm start
   ```

4. **You should see:**
   ```
   ========================================
   Server running on http://localhost:3000
   WebSocket server running on ws://localhost:3000
   Press Ctrl+C to stop the server
   ========================================
   ```

---

## Testing the Application

### Single User Test

1. Open your browser and go to: **http://localhost:3000**
2. You'll see a username prompt - enter any name (e.g., "Alice")
3. Click "Join Chat" and start sending messages

### Multi-User Test (Real-Time Chat)

To experience the real-time features:

1. **Open multiple browser tabs** pointing to http://localhost:3000
   - OR use different browsers (Chrome, Firefox, Edge, etc.)
   - OR use incognito/private windows
   - OR test from different devices on the same network (use your computer's IP address)

2. **Enter different usernames** in each tab (e.g., "Alice", "Bob", "Charlie")

3. **Test these features:**
   - Send messages from one tab → they appear in all other tabs instantly
   - Start typing in one tab → other tabs show "Alice is typing..."
   - Close a tab → other tabs see "Alice left the chat" and online count decreases
   - Watch the **online count badge** update in real-time

### What to Observe

- **Join notifications**: "Bob joined the chat"
- **Online counter**: Updates from "Online: 1" to "Online: 2", etc.
- **Typing indicators**: "Alice is typing..." appears above the input box
- **Instant delivery**: Messages appear immediately in all connected clients
- **Leave notifications**: "Charlie left the chat" when someone disconnects

---

## How It Works

### The Node.js HTTP Server

This project uses Node.js's built-in `http` module to create a web server without any frameworks. When you visit http://localhost:3000, the server reads static files (HTML, CSS, JavaScript) from the `public` folder and sends them to your browser. The server handles different file types by setting appropriate `Content-Type` headers (e.g., `text/html` for HTML files, `text/css` for stylesheets).

The HTTP server runs on port 3000 and uses simple routing logic: if you request `/`, it serves `index.html`; if you request `/styles.css`, it serves the CSS file. This demonstrates the fundamentals of how web servers work—receiving requests, reading files from disk, and sending responses back to clients.

### WebSockets and Real-Time Communication

Traditional HTTP is request-response: the client asks, the server answers, then the connection closes. WebSockets change this by creating a **persistent, two-way connection** between the client and server. Once established (via an HTTP "upgrade" request), both sides can send messages at any time without the client having to repeatedly ask "anything new?"

In this chat app, the WebSocket server (using the `ws` library) attaches to the same HTTP server on port 3000. When a client connects, the server keeps that connection open. When someone types a message and clicks Send, it's sent over the WebSocket connection as JSON. The server then immediately broadcasts that message to all other connected clients—this is what makes the chat feel "live."

### Message Flow: Client → Server → All Clients

Here's what happens when Alice sends "Hello everyone!":

1. **Alice's browser** creates a JSON message object: `{ type: "chat-message", username: "Alice", text: "Hello everyone!", timestamp: 1234567890 }`
2. **Alice's WebSocket** sends this JSON string to the server over the persistent connection
3. **The server receives** the message, parses the JSON, and validates the format
4. **The server broadcasts** the message to all connected clients (including Alice) by looping through its collection of WebSocket connections
5. **Every client's browser** receives the JSON message, parses it, and creates a new message div in the chat display
6. **The UI updates** instantly—all users see Alice's message appear at the same time

The same flow applies to typing indicators (`{ type: "typing", username: "Alice", isTyping: true }`) and system messages (`{ type: "system", text: "Alice joined the chat" }`), except typing indicators are only sent to *other* users (not back to the sender).

---

## Project Structure

```
realtime-chat/
├── package.json          # Project metadata and dependencies
├── server.js             # Node.js HTTP + WebSocket server
├── README.md             # This file
└── public/               # Static files served to the browser
    ├── index.html        # Main HTML structure
    ├── styles.css        # Dark theme styling
    └── client.js         # Client-side WebSocket logic
```

### Key Technologies

- **Backend**: Pure Node.js (HTTP, fs, path, url modules) + `ws` library
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Protocol**: WebSocket for real-time bidirectional communication
- **Storage**: localStorage for username persistence

---

## Code Highlights

### Server-Side Features

- **In-memory user tracking**: Maps WebSocket connections to usernames
- **Broadcast function**: Sends messages to all connected clients
- **BroadcastExcept function**: Sends to everyone except the sender (for typing indicators)
- **Error handling**: Try/catch blocks prevent server crashes from malformed JSON
- **Graceful shutdown**: Closes all connections cleanly when server stops

### Client-Side Features

- **Typing detection**: Debounced input events send typing status after 1s of inactivity
- **Message routing**: Handles different message types (chat, system, typing, online-count)
- **Auto-scroll**: Always shows the newest message
- **Responsive design**: Works on mobile, tablet, and desktop
- **Visual feedback**: Animated message appearance, pulsing online indicator

---

## Future Improvement Ideas

Here are some enhancements you could add to make this project even better:

1. **Chat Rooms/Channels**
   - Allow users to create or join different rooms (e.g., #general, #random)
   - Each room has its own message stream
   - Users can switch between rooms without reconnecting

2. **Persistent Message History**
   - Store messages in a database (MongoDB, PostgreSQL, SQLite)
   - New users see the last 50 messages when they join
   - Implement "load more" functionality to scroll through history

3. **User Authentication**
   - Add login/signup with passwords
   - Prevent username spoofing
   - Store user profiles with avatars

4. **Rich Features**
   - File/image sharing (upload and display in chat)
   - Emoji picker
   - @mentions and notifications
   - Direct messages (private chat between two users)
   - Read receipts ("seen by Alice")

5. **Enhanced UI/UX**
   - User list sidebar showing all online users
   - Sound notifications for new messages
   - Desktop notifications (browser API)
   - Custom themes or dark/light mode toggle
   - Message search functionality

6. **Scalability**
   - Use Redis for pub/sub to handle multiple server instances
   - Add rate limiting to prevent spam
   - Implement reconnection logic for flaky connections
   - Add heartbeat/ping-pong to detect disconnects faster

7. **Security**
   - Input sanitization to prevent XSS attacks
   - Rate limiting on messages per user
   - Profanity filter or content moderation
   - HTTPS/WSS (secure WebSocket) for production

---

## Learning Resources

If you want to dive deeper into the technologies used:

- **Node.js HTTP Module**: https://nodejs.org/api/http.html
- **WebSocket Protocol**: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- **ws Library Documentation**: https://github.com/websockets/ws
- **localStorage API**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

## Troubleshooting

### Server won't start
- **Error: `EADDRINUSE`**: Port 3000 is already in use. Kill the process or change `PORT` in `server.js`
- **Error: `Cannot find module 'ws'`**: Run `npm install` to install dependencies

### WebSocket connection fails
- Make sure the server is running (`npm start`)
- Check that you're using `http://localhost:3000` (not `file://`)
- Check browser console for errors (F12 → Console tab)

### Messages not appearing
- Open browser console (F12) to see connection status
- Verify multiple tabs are using different usernames
- Try refreshing the page

---

## License

This project is open source and available under the [ISC License](https://opensource.org/licenses/ISC).

---

## Contributing

This is an educational project, but contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Use this as a learning resource

---

## Acknowledgments

Built as an educational project to teach:
- How HTTP servers work without frameworks
- WebSocket fundamentals
- Real-time web applications
- Clean, commented code for beginners

**Happy coding!** 🚀
