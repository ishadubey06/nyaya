import "dotenv/config";
import express from "express";
import { connectRedis } from "./src/config/redis.js";
const app = express();
app.listen(8000, async () => {
    await connectRedis();
    console.log('running');
});
//# sourceMappingURL=test2.js.map