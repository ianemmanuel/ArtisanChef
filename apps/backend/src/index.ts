import express from "express"
import helmet from "helmet"
import cors from "cors"
import morgan from "morgan"
import { rateLimit, ipKeyGenerator } from "express-rate-limit"
import cookieParser from "cookie-parser"
import router from "./routes"
import { errorHandler } from "./middleware/error/error.middleware"
import "./env"
import clerkWebhookRoutes from "./modules/integrations/clerk/webhooks/clerk.webhook.routes"

const app = express()
const port = process.env.PORT || 8000

const whitelist = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
]

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (whitelist.includes(origin)) return callback(null, true)
    console.error("Blocked by CORS:", origin)
    return callback(new Error("Not allowed by CORS"))
  },
  credentials: true,
}

// Apply CORS, Helmet, Morgan globally
app.use(cors(corsOptions))
app.use(helmet())
app.use(morgan("dev"))
app.use(cookieParser())

// ----------------------
// 1️⃣ Clerk webhooks
// ----------------------
// Bypass JSON parser, CORS, and rate limiting
app.use(
  "/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhookRoutes
)

// ----------------------
// 2️⃣ Normal API routes
// ----------------------
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ limit: "100mb", extended: true }))

// Rate limiting
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req: any) => ipKeyGenerator(req),
  skip: (req) => req.path.startsWith("/webhooks"),
})

export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: any) => (req.headers["x-is-authenticated"] === "true" ? 1000 : 100),
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req: any) => ipKeyGenerator(req),
  skip: (req) => req.path.startsWith("/webhooks"),
})

app.use(publicRateLimiter)
app.use("/api", router)

// Error handler
app.use(errorHandler)

app.listen(port, () => {
  console.log(`Backend is running at port ${port}`)
})