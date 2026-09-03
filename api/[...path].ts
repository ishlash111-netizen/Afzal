import app from "../server";

export default function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Ensure path starts with /api for Express routing
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url}`;
  }

  return app(req, res);
}
