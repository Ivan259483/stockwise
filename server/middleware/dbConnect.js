import connectDB from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Ensures the MongoDB connection is open before a route runs.
 * Locally the connection is opened at startup and this is a no-op; on Vercel a
 * cold-started function connects here and later invocations reuse the cache.
 */
const dbConnect = asyncHandler(async (_req, _res, next) => {
  await connectDB();
  next();
});

export default dbConnect;
