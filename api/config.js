import { getRemoteConfig } from "../ask-docs/config.js";
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
      if (process.env.VERCEL) {
        return res.status(403).json({ 
          error: "Filesystem is read-only on Vercel.", 
          message: "Please use Edge Config or Environment Variables for updates." 
        });
      }
      // Local logic could go here
    } catch (err) {
      res.status(500).json({ error: "Failed to update configuration", details: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}