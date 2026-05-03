import { loadConfig, getRemoteConfig } from "../ask-docs/config.js";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const config = await getRemoteConfig();
      // Expose current app settings to the UI
      res.status(200).json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load configuration', details: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const updates = req.body;
      if (process.env.VERCEL && process.env.EDGE_CONFIG_ID) {
        // Update Vercel Edge Config via API
        const response = await fetch(
          `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items: [{ operation: 'update', key: 'appSettings', value: updates }],
            }),
          }
        );
        const data = await response.json();
        return res.status(200).json({ status: "success", info: "Remote config updated", data });
      }

      res.status(403).json({ error: "Edge Config ID or Auth Token missing" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update configuration", details: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}