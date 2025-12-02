class WebSocketServer {
    constructor({ targetWindow = window.parent, targetOrigin = "*" } = {}) {
      this.targetWindow = targetWindow;
      this.targetOrigin = targetOrigin;
      this.clients = new Set();
      this.handlers = {};
      
      console.log("[SERVER] > WebSocketServer initialized");
  
      window.addEventListener("message", this._handleIncomingMessage.bind(this));
    }
  
    on(event, handler) {
      this.handlers[event] = handler;
    }
  
    _emit(event, ...args) {
      if (this.handlers[event]) {
        this.handlers[event](...args);
      }
    }
  
    _handleIncomingMessage(event) {
      if (event.data?.type === "BROWSER_WS_CONNECT") {
        console.log("[SERVER] > Incoming connection from", event.data.clientId, event.origin);
        const socket = new Websocket(event.source, event.origin, event.data.clientId);
        this.clients.add(socket);
  
        socket.on("close", () => this.clients.delete(socket));
  
        this._emit("connection", socket);
      }
  
      // Forward messages to the correct socket
      if (event.data?.type === "BROWSER_WS_MESSAGE") {
        for (const client of this.clients) {
          if (client.clientId === event.data.clientId) {
            client._emit("message", event.data.payload);
          }
        }
      }

      if(event.data?.type === "CONSOLE_INPUT") {
        try {
          const result = eval(event.data.command);
          console.log("<", result);
        } catch(error) {
          console.log("< " + error);
        }
      }
  
      if (event.data?.type === "BROWSER_WS_CLOSE") {
        for (const client of this.clients) {
          if (client.clientId === event.data.clientId) {
            client._emit("close");
            this.clients.delete(client);
          }
        }
      }
    }
  }
  
  // Individual pseudo-socket for each "client"
  class Websocket {
    constructor(sourceWindow, sourceOrigin, clientId) {
      this.sourceWindow = sourceWindow;
      this.sourceOrigin = sourceOrigin;
      this.clientId = clientId;
      this.handlers = {};
      this.readyState = 1; // open
    }
  
    on(event, handler) {
      this.handlers[event] = handler;
    }
  
    _emit(event, ...args) {
      if (this.handlers[event]) {
        this.handlers[event](...args);
      }
    }
  
    send(payload) {
      this.sourceWindow.postMessage(
        { type: "BROWSER_WS_SERVER_SEND", payload, clientId: this.clientId },
        this.sourceOrigin
      );
    }
  
    close() {
      this.readyState = 3;
      this.sourceWindow.postMessage({ type: "BROWSER_WS_CLOSE", clientId: this.clientId }, this.sourceOrigin);
      this._emit("close");
    }
}

module.exports = {WebSocketServer, Websocket};