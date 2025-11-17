class WebSocketServer {
    constructor({ targetWindow = window.parent, targetOrigin = "*" } = {}) {
      this.targetWindow = targetWindow;
      this.targetOrigin = targetOrigin;
      this.clients = new Set();
      this.handlers = {};
  
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
        const socket = new BrowserWebSocket(event.source, event.origin);
        this.clients.add(socket);
  
        socket.on("close", () => this.clients.delete(socket));
  
        this._emit("connection", socket);
      }
  
      // Forward messages to the correct socket
      if (event.data?.type === "BROWSER_WS_MESSAGE") {
        for (const client of this.clients) {
          if (client._matches(event)) {
            client._emit("message", event.data.payload);
          }
        }
      }
  
      if (event.data?.type === "BROWSER_WS_CLOSE") {
        for (const client of this.clients) {
          if (client._matches(event)) {
            client._emit("close");
            this.clients.delete(client);
          }
        }
      }
    }
  }
  
  // Individual pseudo-socket for each "client"
  class BrowserWebSocket {
    constructor(sourceWindow, sourceOrigin) {
      this.sourceWindow = sourceWindow;
      this.sourceOrigin = sourceOrigin;
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
  
    _matches(event) {
      return event.source === this.sourceWindow && event.origin === this.sourceOrigin;
    }
  
    send(data) {
      this.sourceWindow.postMessage(
        { type: "BROWSER_WS_SERVER_SEND", payload: data },
        this.sourceOrigin
      );
    }
  
    close() {
      this.readyState = 3;
      this.sourceWindow.postMessage({ type: "BROWSER_WS_CLOSE" }, this.sourceOrigin);
      this._emit("close");
    }
}

module.exports = BrowserWebSocket;