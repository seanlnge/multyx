# MultyxCreate Browser Emulator

***

This folder and specifically the webpacked `browser-emulator.js` file is a tool for the MultyxCreate software to emulate a WSServer on the browser. It requires 2 browser stubs stored in `browser-stubs/` that act as browser-friendly versions of the `nanotimer` and `ws` packages, which would run in a managed environment sending window messages to a central script.

The `ws` package is not complete, however, without an iframe-friendly websocket client and the central environment to run these codes in.

If you'd like, have at it trying to make the websocket client along with the central environment, it's pretty fun.

Moral of the story is that this folder along with the webpack configuration in the `server/` folder are not a part of the Multyx server code ecosystem.
