// ============================================
// CLIENT-SIDE JAVASCRIPT FOR REAL-TIME CHAT
// ============================================

console.log('Chat application loading...');

// ============================================
// 1. GET REFERENCES TO HTML ELEMENTS
// ============================================

// Form and input elements
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Display areas
const chatMessages = document.getElementById('chatMessages');
const connectionStatus = document.getElementById('connectionStatus');
const onlineCount = document.getElementById('onlineCount');
const typingIndicator = document.getElementById('typingIndicator');

// Username setup elements
const usernameSetup = document.getElementById('usernameSetup');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');

// ============================================
// 2. GLOBAL VARIABLES
// ============================================

let socket = null; // WebSocket connection (will be created later)
let currentUsername = null; // Store the current user's username

// Typing indicator state
let typingTimeout = null; // Timer for detecting when user stops typing
let isCurrentlyTyping = false; // Track if we've sent a "typing: true" message

// Track who is currently typing
// Format: Map<username, timeoutId>
const usersTyping = new Map();

// ============================================
// 3. USERNAME MANAGEMENT
// ============================================

/**
 * Load username from localStorage
 * localStorage persists data even after the browser is closed
 */
function loadUsername() {
  // Try to get saved username from localStorage
  const savedUsername = localStorage.getItem('chatUsername');

  if (savedUsername) {
    // If we found a saved username, use it
    currentUsername = savedUsername;
    console.log('Loaded username from storage:', currentUsername);

    // Hide the username setup overlay
    usernameSetup.classList.add('hidden');

    // Connect to the chat server
    connectToServer();
  } else {
    // No saved username - show the username setup form
    console.log('No saved username found. Showing username prompt.');
    usernameSetup.classList.remove('hidden');

    // Focus on the username input so user can start typing immediately
    usernameInput.focus();
  }
}

/**
 * Save username to localStorage and join chat
 */
function saveUsername() {
  // Get the value from the username input field
  const username = usernameInput.value.trim();

  // Validate: make sure username is not empty
  if (username === '') {
    alert('Please enter a username!');
    return;
  }

  // Validate: username should be reasonable length
  if (username.length < 2) {
    alert('Username must be at least 2 characters!');
    return;
  }

  // Save to both localStorage and our variable
  currentUsername = username;
  localStorage.setItem('chatUsername', username);

  console.log('Username saved:', currentUsername);

  // Hide the username setup overlay
  usernameSetup.classList.add('hidden');

  // Connect to the chat server
  connectToServer();
}

// ============================================
// 4. WEBSOCKET CONNECTION
// ============================================

/**
 * Connect to the WebSocket server
 * WebSocket provides real-time, two-way communication between client and server
 */
function connectToServer() {
  console.log('Connecting to WebSocket server...');

  // Update UI to show we're connecting
  updateConnectionStatus('Connecting...', 'connecting');

  // Create WebSocket connection
  // ws:// is the WebSocket protocol (like http:// for web pages)
  // We connect to the same host and port as our HTTP server
  socket = new WebSocket('ws://localhost:3000');

  // ============================================
  // WebSocket Event: Connection Opened
  // ============================================
  socket.addEventListener('open', function(event) {
    console.log('Connected to server!');
    updateConnectionStatus('Connected', 'connected');

    // Enable the send button now that we're connected
    sendButton.disabled = false;
  });

  // ============================================
  // WebSocket Event: Message Received
  // ============================================
  socket.addEventListener('message', function(event) {
    console.log('Message received from server:', event.data);

    try {
      // Parse the JSON message from the server
      const message = JSON.parse(event.data);

      // Handle different message types
      if (message.type === 'chat-message') {
        // Regular chat message
        displayMessage(message);
      } else if (message.type === 'system') {
        // System message (join/leave notifications)
        addSystemMessage(message.text);
      } else if (message.type === 'online-count') {
        // Update online user count
        updateOnlineCount(message.count);
      } else if (message.type === 'typing') {
        // Typing indicator from another user
        handleTypingIndicator(message);
      } else {
        console.log('Unknown message type:', message.type);
      }

    } catch (error) {
      // If parsing fails, log the error
      console.error('Error parsing message:', error);
    }
  });

  // ============================================
  // WebSocket Event: Connection Closed
  // ============================================
  socket.addEventListener('close', function(event) {
    console.log('Disconnected from server');
    updateConnectionStatus('Disconnected', 'disconnected');

    // Show a message to the user
    addSystemMessage('Disconnected from server. Refresh to reconnect.');

    // Disable sending messages
    sendButton.disabled = true;
  });

  // ============================================
  // WebSocket Event: Error Occurred
  // ============================================
  socket.addEventListener('error', function(error) {
    console.error('WebSocket error:', error);
    updateConnectionStatus('Connection Error', 'error');

    // Show error message to user
    addSystemMessage('Connection error. Please check if the server is running.');

    // Disable sending messages
    sendButton.disabled = true;
  });
}

/**
 * Update the connection status display in the header
 */
function updateConnectionStatus(text, status) {
  connectionStatus.textContent = text;
  connectionStatus.className = 'connection-status ' + status;
}

// ============================================
// 5. ONLINE COUNT
// ============================================

/**
 * Update the online users count badge
 */
function updateOnlineCount(count) {
  console.log('Online users:', count);
  onlineCount.textContent = count;
}

// ============================================
// 6. TYPING INDICATOR
// ============================================

/**
 * Send typing status to server
 * @param {boolean} isTyping - Whether the user is typing or not
 */
function sendTypingStatus(isTyping) {
  // Only send if we're connected
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  const typingMessage = {
    type: 'typing',
    username: currentUsername,
    isTyping: isTyping,
    timestamp: Date.now()
  };

  console.log('Sending typing status:', isTyping);
  socket.send(JSON.stringify(typingMessage));

  // Update our local state
  isCurrentlyTyping = isTyping;
}

/**
 * Handle typing indicator from another user
 */
function handleTypingIndicator(message) {
  const username = message.username;

  // Don't show our own typing indicator
  if (username === currentUsername) {
    return;
  }

  if (message.isTyping) {
    // User started typing
    console.log(username, 'is typing...');

    // Clear existing timeout for this user if any
    if (usersTyping.has(username)) {
      clearTimeout(usersTyping.get(username));
    }

    // Add user to typing set
    usersTyping.set(username, null);

    // Auto-clear this typing indicator after 3 seconds
    // (in case we don't receive the "stopped typing" message)
    const timeoutId = setTimeout(() => {
      usersTyping.delete(username);
      updateTypingIndicatorDisplay();
    }, 3000);

    usersTyping.set(username, timeoutId);
  } else {
    // User stopped typing
    console.log(username, 'stopped typing');

    // Clear timeout and remove from set
    if (usersTyping.has(username)) {
      clearTimeout(usersTyping.get(username));
      usersTyping.delete(username);
    }
  }

  // Update the display
  updateTypingIndicatorDisplay();
}

/**
 * Update the typing indicator display based on who is typing
 */
function updateTypingIndicatorDisplay() {
  const typingUsers = Array.from(usersTyping.keys());

  if (typingUsers.length === 0) {
    // No one is typing
    typingIndicator.textContent = '';
    typingIndicator.style.display = 'none';
  } else if (typingUsers.length === 1) {
    // One person is typing
    typingIndicator.textContent = `${typingUsers[0]} is typing...`;
    typingIndicator.style.display = 'block';
  } else if (typingUsers.length === 2) {
    // Two people are typing
    typingIndicator.textContent = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    typingIndicator.style.display = 'block';
  } else {
    // Multiple people are typing
    typingIndicator.textContent = 'Several people are typing...';
    typingIndicator.style.display = 'block';
  }
}

/**
 * Handle user typing in the message input
 * This is called on every keystroke
 */
function handleUserTyping() {
  // Clear the previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  // If this is the first keystroke, send "typing: true"
  if (!isCurrentlyTyping) {
    sendTypingStatus(true);
  }

  // Set a timeout to send "typing: false" after 1 second of inactivity
  typingTimeout = setTimeout(() => {
    sendTypingStatus(false);
  }, 1000);
}

// ============================================
// 7. SENDING MESSAGES
// ============================================

/**
 * Send a chat message to the server
 */
function sendMessage(event) {
  // Prevent the form from submitting normally (which would reload the page)
  event.preventDefault();

  // Get the message text from the input
  const messageText = messageInput.value.trim();

  // Don't send empty messages
  if (messageText === '') {
    return;
  }

  // Make sure we're connected before trying to send
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage('Cannot send message: Not connected to server');
    return;
  }

  // Create the message object
  // This matches the format the server expects
  const message = {
    type: 'chat-message',           // Type of message
    username: currentUsername,       // Who sent it
    text: messageText,              // The actual message
    timestamp: Date.now()           // When it was sent (milliseconds since 1970)
  };

  console.log('Sending message:', message);

  // Convert the message object to JSON and send it
  socket.send(JSON.stringify(message));

  // Clear the input field so user can type a new message
  messageInput.value = '';

  // Send "stopped typing" indicator since we just sent a message
  if (isCurrentlyTyping) {
    sendTypingStatus(false);
  }

  // Clear the typing timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  // Keep focus on the input for easy continued typing
  messageInput.focus();
}

// ============================================
// 8. DISPLAYING MESSAGES
// ============================================

/**
 * Display a chat message in the message list
 */
function displayMessage(message) {
  // Create a new div element for this message
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  // Add class to distinguish own messages from others
  // This allows different styling (e.g., own messages on the right)
  if (message.username === currentUsername) {
    messageDiv.classList.add('own');
  } else {
    messageDiv.classList.add('other');
  }

  // Create sender name element
  const senderSpan = document.createElement('span');
  senderSpan.className = 'message-sender';
  senderSpan.textContent = message.username;

  // Create message text element
  const textSpan = document.createElement('span');
  textSpan.className = 'message-text';
  textSpan.textContent = message.text;

  // Create timestamp element
  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(message.timestamp);

  // Assemble the message: sender + text + time
  messageDiv.appendChild(senderSpan);
  messageDiv.appendChild(textSpan);
  messageDiv.appendChild(timeSpan);

  // Add the message to the chat display
  chatMessages.appendChild(messageDiv);

  // Scroll to the bottom to show the new message
  scrollToBottom();
}

/**
 * Add a system message (like "Connected" or "User joined")
 * These are displayed differently from regular chat messages
 */
function addSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'system-message';
  messageDiv.textContent = text;

  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Scroll the chat messages to the bottom
 * This ensures the newest message is always visible
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================
// 9. UTILITY FUNCTIONS
// ============================================

/**
 * Format a timestamp into a readable time string (HH:MM)
 * @param {number} timestamp - Milliseconds since 1970
 * @returns {string} Formatted time like "14:30"
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);

  // Get hours and minutes
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Pad with zero if needed (e.g., "9:05" instead of "9:5")
  const hoursStr = hours.toString().padStart(2, '0');
  const minutesStr = minutes.toString().padStart(2, '0');

  return `${hoursStr}:${minutesStr}`;
}

// ============================================
// 10. EVENT LISTENERS
// ============================================

// Listen for form submission (when user presses Enter or clicks Send)
chatForm.addEventListener('submit', sendMessage);

// Listen for username save button click
saveUsernameBtn.addEventListener('click', saveUsername);

// Allow pressing Enter in username input to save
usernameInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    saveUsername();
  }
});

// Listen for typing in the message input
// Use 'input' event which fires on every change
messageInput.addEventListener('input', handleUserTyping);

// When user focuses on the input, they might start typing
messageInput.addEventListener('focus', function() {
  // Don't send typing indicator just for focusing
  // Wait for actual input
});

// When user leaves the input, send "stopped typing"
messageInput.addEventListener('blur', function() {
  if (isCurrentlyTyping) {
    sendTypingStatus(false);
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
});

// ============================================
// 11. INITIALIZE THE APPLICATION
// ============================================

// When the page loads, check for saved username
// This runs automatically when the script loads
loadUsername();

console.log('Chat application initialized!');
