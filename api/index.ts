import app from "../server";

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Ensure routing works whether called directly or rewritten
  const target = req.url || "/api";
  if (!target.startsWith("/api")) {
    req.url = `/api${target}`;
  }

  return app(req, res);
}
