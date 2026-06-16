import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import admin from "firebase-admin";
import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: any = null;
if (process.env.VITE_USE_MOCK_FIREBASE !== "true") {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    db = admin.firestore();
    console.log("Firebase Admin initialized successfully.");
  } catch (error: any) {
    console.warn("Firebase Admin SDK failed to initialize. If you are in local development mock mode, this is expected.");
    console.warn("Error message:", error?.message || error);
  }
} else {
  console.log("Using Mock Firebase. Skipping Firebase Admin SDK initialization.");
}

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    console.log("Initializing server...");

    app.use(express.json());

    // API routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", message: "Backend is running" });
    });

    app.get("/test", (req, res) => {
      res.send("Server is reachable");
    });

    app.post("/api/create-razorpay-order", async (req, res) => {
      try {
        const { userId } = req.body;
        
        // Ensure success/cancel URLs point to the local server
        const domainURL = req.headers.origin || 'http://localhost:3000';

        // MOCK MODE: If the user hasn't set up real Razorpay keys yet, simulate a checkout redirect
        if (!process.env.VITE_RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID === 'rzp_test_dummy') {
          console.log("Using mock Razorpay checkout because no real keys were found.");
          return res.json({ mock: true });
        }

        const razorpay = new Razorpay({
          key_id: process.env.VITE_RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
          amount: 200, // 200 cents = $2.00 USD. Razorpay expects amount in the smallest currency unit.
          currency: "USD",
          receipt: `receipt_${userId}_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
          id: order.id,
          amount: order.amount,
          currency: order.currency
        });
      } catch (error: any) {
        console.error('Razorpay error:', error);
        res.status(500).json({ error: error.message || 'Failed to create razorpay order' });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting Vite in middleware mode...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");

      // Fallback for SPA routing in dev mode
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
          let template = await fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`> Server is listening on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
