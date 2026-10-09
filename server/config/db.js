import mongoose from "mongoose";

/**
 * The connection promise is cached on `globalThis` because on Vercel each
 * serverless invocation may reuse a warm instance. Reusing the existing
 * connection avoids opening a new pool (and hitting Atlas connection limits)
 * on every request.
 */
const cache = globalThis.__stockwiseMongo ?? (globalThis.__stockwiseMongo = { promise: null });

/**
 * Connects to MongoDB once and returns the shared connection.
 *
 * @returns {Promise<typeof mongoose>}
 * @throws {Error} When MONGO_URI is missing or the connection fails.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose;

  if (!cache.promise) {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");

    cache.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Fail fast instead of buffering queries for the default 30s.
        serverSelectionTimeoutMS: 10000,
        // A small pool is plenty for one serverless instance.
        maxPoolSize: 10,
      })
      .catch((error) => {
        // Reset so the next request can retry instead of reusing a rejected promise.
        cache.promise = null;
        throw error;
      });
  }

  return cache.promise;
};

export default connectDB;
