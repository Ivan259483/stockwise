/**
 * StockWise API entry point.
 *
 * Builds the Express app (security middleware → routes → 404 → error handler).
 * Locally it connects to MongoDB and listens on PORT; on Vercel the app is
 * exported and run as a serverless function, so `listen` is skipped there.
 */
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db.js";
import dbConnect from "./middleware/dbConnect.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";

/** Origins allowed by CORS, from the comma-separated CLIENT_URL variable. */
const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const app = express();

// Vercel and other hosts sit behind one proxy; needed for correct client IPs in rate limiting.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    // Requests without an Origin header (curl, server-to-server, smoke tests) are allowed.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  })
);
// 5 MB leaves room for a 1 MB product image after base64 encoding.
app.use(express.json({ limit: "5mb" }));
app.use(morgan(isProduction ? "tiny" : "dev"));

/** Friendly landing response for anyone who opens the API URL in a browser. */
app.get("/", (_req, res) => {
  res.json({ success: true, message: "StockWise API is running. See /api/health." });
});

app.use("/api", dbConnect);

/** Health check. Runs after dbConnect, so a 200 also confirms the database is reachable. */
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: { status: "ok", database: "connected", environment: process.env.NODE_ENV ?? "development" },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

// Vercel sets VERCEL=1 and invokes the exported app per request instead.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 5050;
  connectDB()
    .then(() => {
      app.listen(port, () => console.log(`StockWise API listening on http://localhost:${port}`));
    })
    .catch((error) => {
      console.error("Failed to connect to MongoDB:", error.message);
      process.exit(1);
    });
}

export default app;
