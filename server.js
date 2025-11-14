// ============================================
// IMPORT REQUIRED MODULES
// ============================================

// Import Node.js core modules (built-in, no installation needed)
const http = require('http');  // Creates HTTP server
const fs = require('fs');      // Reads files from disk
const path = require('path');  // Handles file paths correctly across different operating systems
const url = require('url');    // Parses URLs to get pathname

// Import the WebSocket library (installed via npm)
// This provides real-time, two-way communication between server and clients
const WebSocket = require('ws');

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3000;


// ============================================
// IN-MEMORY DATA STORAGE
// ============================================

// Store all connected WebSocket clients
// Set is like an array but only stores unique values and has better performance
const connectedClients = new Set();

// Map WebSocket connections to usernames
// This allows us to track which username belongs to which connection
// Format: Map<WebSocket, string>
const clientUsernames = new Map();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the count of online users
 * @returns {number} Number of users with usernames
 */
function getOnlineCount() {
  return clientUsernames.size;
}

/**
 * Broadcast the current online user count to all clients
 */
function broadcastOnlineCount() {
  const countMessage = {
    type: 'online-count',
    count: getOnlineCount(),
    timestamp: Date.now()
  };
  broadcast(countMessage);
}

// ============================================
// STATIC FILE SERVING
// ============================================

/**
 * This function serves static files (HTML, CSS, JS) from the 'public' folder
 * @param {string} filePath - The path to the file we want to serve
 * @param {object} res - The HTTP response object to send data back to the browser
 */
function serveStaticFile(filePath, res) {
  // Read the file from disk
  fs.readFile(filePath, (err, data) => {
    // If there's an error (file doesn't exist, permission denied, etc.)
    if (err) {
      // Send a 404 Not Found response
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - File Not Found');
      return;
    }

    // Figure out what type of file this is so the browser knows how to handle it
    let contentType = 'text/html'; // Default content type
    const ext = path.extname(filePath); // Get file extension (.html, .css, .js)

    // Set the correct Content-Type header based on file extension
    if (ext === '.css') {
      contentType = 'text/css';
    } else if (ext === '.js') {
      contentType = 'application/javascript';
    } else if (ext === '.html') {
      contentType = 'text/html';
    }

    // Send successful response with the file content
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ============================================
// CREATE HTTP SERVER
// ============================================

/**
 * Create the HTTP server
 * This handles regular HTTP requests (like loading HTML, CSS, JS files)
 * The WebSocket server will be attached to this same server
 */
const server = http.createServer((req, res) => {
  // Parse the URL to get just the pathname (e.g., "/", "/styles.css", "/client.js")
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Log the request to the console so we can see what's being requested
  console.log(`[HTTP] Request for: ${pathname}`);

  // Handle different routes (URLs)
  if (pathname === '/') {
    // If someone visits the root URL, serve index.html
    pathname = '/index.html';
  }

  // Build the full file path by combining 'public' folder with the requested file
  // path.join() ensures the path is correct for Windows, Mac, and Linux
  const filePath = path.join(__dirname, 'public', pathname);

  // Check if the requested file is actually inside the 'public' folder
  // This is a security measure to prevent users from accessing files outside 'public'
  const publicPath = path.join(__dirname, 'public');
  if (!filePath.startsWith(publicPath)) {
    // If someone tries to access files outside 'public', deny the request
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 - Forbidden');
    return;
  }

  // Serve the requested file
  serveStaticFile(filePath, res);
});

// ============================================
// CREATE WEBSOCKET SERVER
// ============================================

/**
 * Create a WebSocket server and attach it to the HTTP server
 *
 * How this works:
 * 1. The HTTP server handles normal web requests (GET /index.html, etc.)
 * 2. When a client wants to establish a WebSocket connection, they send a special
 *    HTTP request called an "upgrade" request
 * 3. The WebSocket server intercepts these upgrade requests and converts them
 *    into WebSocket connections
 * 4. Both servers share the same port (3000) because they're attached to the same
 *    HTTP server instance
 */
const wss = new WebSocket.Server({
  server: server  // Attach to the HTTP server we created above
});

console.log('[WebSocket] WebSocket server created');

// ============================================
// WEBSOCKET BROADCAST FUNCTIONS
// ============================================

/**
 * Broadcast a message to all connected clients
 * This function sends the same message to everyone in the chat
 *
 * @param {object} messageObject - The message object to broadcast
 */
function broadcast(messageObject) {
  // Convert the JavaScript object to a JSON string
  const messageString = JSON.stringify(messageObject);

  console.log(`[WebSocket] Broadcasting message to ${connectedClients.size} clients:`, messageObject);

  // Loop through all connected clients
  connectedClients.forEach((client) => {
    // Only send to clients that are still connected and ready
    // readyState === WebSocket.OPEN means the connection is active
    if (client.readyState === WebSocket.OPEN) {
      try {
        // Send the message to this client
        client.send(messageString);
      } catch (error) {
        // If sending fails, log the error but don't crash the server
        console.error('[WebSocket] Error sending to client:', error.message);
      }
    }
  });
}

/**
 * Broadcast a message to all clients EXCEPT the sender
 * Useful for typing indicators - we don't want to send "You are typing" back to yourself
 *
 * @param {object} messageObject - The message object to broadcast
 * @param {WebSocket} excludeClient - The client to exclude from broadcast
 */
function broadcastExcept(messageObject, excludeClient) {
  // Convert the JavaScript object to a JSON string
  const messageString = JSON.stringify(messageObject);

  console.log(`[WebSocket] Broadcasting to others (excluding sender):`, messageObject);

  // Loop through all connected clients
  connectedClients.forEach((client) => {
    // Skip the excluded client and only send to clients that are still open
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      try {
        // Send the message to this client
        client.send(messageString);
      } catch (error) {
        // If sending fails, log the error but don't crash the server
        console.error('[WebSocket] Error sending to client:', error.message);
      }
    }
  });
}

// ============================================
// WEBSOCKET CONNECTION HANDLING
// ============================================

/**
 * This event fires whenever a new client connects via WebSocket
 * The 'connection' event gives us a 'ws' object representing this client
 */
wss.on('connection', (ws) => {
  console.log('[WebSocket] New client connected');
  console.log(`[WebSocket] Total clients: ${connectedClients.size + 1}`);

  // Add this client to our set of connected clients
  connectedClients.add(ws);

  // Note: We don't add to clientUsernames yet - we'll do that when they send their first message
  // This is because the username is sent from the client, not available at connection time

  // ============================================
  // Send welcome message to the new client only
  // ============================================
  const welcomeMessage = {
    type: 'system',
    text: 'Welcome to the chat! You are now connected.',
    timestamp: Date.now()
  };

  try {
    ws.send(JSON.stringify(welcomeMessage));
  } catch (error) {
    console.error('[WebSocket] Error sending welcome message:', error.message);
  }

  // Send the current online count to the new client
  const countMessage = {
    type: 'online-count',
    count: getOnlineCount(),
    timestamp: Date.now()
  };

  try {
    ws.send(JSON.stringify(countMessage));
  } catch (error) {
    console.error('[WebSocket] Error sending online count:', error.message);
  }

  // ============================================
  // Handle incoming messages from this client
  // ============================================
  ws.on('message', (data) => {
    console.log('[WebSocket] Received raw data:', data.toString());

    try {
      // Try to parse the incoming message as JSON
      const message = JSON.parse(data.toString());

      console.log('[WebSocket] Parsed message:', message);

      // Check if this is the first time we're seeing this client's username
      const isNewUser = !clientUsernames.has(ws);

      // ============================================
      // Handle different message types
      // ============================================

      if (message.type === 'chat-message') {
        // Validate chat message format
        if (!message.username || !message.text) {
          console.error('[WebSocket] Invalid chat message - missing username or text');
          return;
        }

        // If this is a new user (first message), save their username and announce them
        if (isNewUser && message.username) {
          clientUsernames.set(ws, message.username);
          console.log(`[WebSocket] User joined: ${message.username}`);

          // Broadcast join message to everyone
          const joinMessage = {
            type: 'system',
            text: `${message.username} joined the chat`,
            timestamp: Date.now()
          };
          broadcast(joinMessage);

          // Broadcast updated online count
          broadcastOnlineCount();
        }

        console.log(`[WebSocket] ${message.username}: ${message.text}`);

        // Broadcast the chat message to all connected clients
        // This includes the sender, so they see their own message too
        broadcast(message);
      }
      else if (message.type === 'typing') {
        // Handle typing indicator
        // Validate typing message format
        if (!message.username || message.isTyping === undefined) {
          console.error('[WebSocket] Invalid typing message - missing username or isTyping');
          return;
        }

        // Save username if this is a new user
        if (isNewUser && message.username) {
          clientUsernames.set(ws, message.username);
          console.log(`[WebSocket] User registered via typing: ${message.username}`);

          // Broadcast join message
          const joinMessage = {
            type: 'system',
            text: `${message.username} joined the chat`,
            timestamp: Date.now()
          };
          broadcast(joinMessage);

          // Broadcast updated online count
          broadcastOnlineCount();
        }

        console.log(`[WebSocket] ${message.username} is typing: ${message.isTyping}`);

        // Broadcast typing indicator to all OTHER clients (not the sender)
        broadcastExcept(message, ws);
      }
      else {
        console.log('[WebSocket] Unknown message type:', message.type);
      }

    } catch (error) {
      // If JSON parsing fails or any other error occurs, log it
      console.error('[WebSocket] Error processing message:', error.message);

      // Send error message back to the sender only
      try {
        const errorMessage = {
          type: 'error',
          text: 'Failed to process message',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(errorMessage));
      } catch (sendError) {
        console.error('[WebSocket] Error sending error message:', sendError.message);
      }
    }
  });

  // ============================================
  // Handle client disconnection
  // ============================================
  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');

    // Get the username before removing from map
    const username = clientUsernames.get(ws);

    // Remove this client from our collections
    connectedClients.delete(ws);
    clientUsernames.delete(ws);

    console.log(`[WebSocket] Total clients: ${connectedClients.size}`);

    // If the user had a username, broadcast their departure
    if (username) {
      console.log(`[WebSocket] User left: ${username}`);

      // Broadcast leave message
      const leaveMessage = {
        type: 'system',
        text: `${username} left the chat`,
        timestamp: Date.now()
      };
      broadcast(leaveMessage);

      // Broadcast updated online count
      broadcastOnlineCount();
    }
  });

  // ============================================
  // Handle WebSocket errors
  // ============================================
  ws.on('error', (error) => {
    console.error('[WebSocket] Client error:', error.message);

    // Get the username before removing
    const username = clientUsernames.get(ws);

    // Remove this client from our collections
    connectedClients.delete(ws);
    clientUsernames.delete(ws);

    // If the user had a username, broadcast their departure
    if (username) {
      const leaveMessage = {
        type: 'system',
        text: `${username} left the chat`,
        timestamp: Date.now()
      };
      broadcast(leaveMessage);

      // Broadcast updated online count
      broadcastOnlineCount();
    }
  });
});

// ============================================
// START THE SERVER
// ============================================

/**
 * Start listening for both HTTP and WebSocket connections
 * Both use the same port because the WebSocket server is attached to the HTTP server
 */
server.listen(PORT, () => {
  console.log('========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
  console.log('========================================');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

/**
 * Handle server shutdown gracefully
 * This closes all WebSocket connections when the server stops
 */
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down gracefully...');

  // Close all WebSocket connections
  connectedClients.forEach((client) => {
    client.close();
  });

  // Close the WebSocket server
  wss.close(() => {
    console.log('[WebSocket] WebSocket server closed');
  });

  // Close the HTTP server
  server.close(() => {
    console.log('[HTTP] HTTP server closed');
    process.exit(0);
  });
});
