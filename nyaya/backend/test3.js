import express from "express";
const app = express();
const server = app.listen(8000, () => console.log('running'));
server.on('error', (e) => console.log('Server Error:', e.message));
//# sourceMappingURL=test3.js.map