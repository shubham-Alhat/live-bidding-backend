const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Periodically check connection health (e.g., every 30 seconds)
const PING_INTERVAL = 30000;

wss.on('connection', function connection(ws) {
// Mark the connection as alive when it's first established
ws.isAlive = true;

// Listen for the built-in 'pong' event to reset the alive status
ws.on('pong', function heartbeat() {
ws.isAlive = true;
});

ws.on('message', function incoming(message) {
console.log('received: %s', message);
});

ws.on('close', function close() {
console.log('Client disconnected');
});
});

// Set up the interval to send pings and check for timeouts
const interval = setInterval(function ping() {
wss.clients.forEach(function each(ws) {
if (ws.isAlive === false) {
// If the client didn't respond to the last ping, terminate the connection
console.log('Client did not respond, terminating connection');
return ws.terminate();
}

    // Mark the connection as potentially dead and send a ping
    ws.isAlive = false;
    ws.ping(); // Use the built-in ping method

});
}, PING_INTERVAL);

wss.on('close', function close() {
clearInterval(interval);
});

https://share.google/aimode/zEY0cu48YiJHpqWNi
