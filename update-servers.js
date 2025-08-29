const fs = require("fs");
const path = require("path");
const query = require("samp-query");

const filePath = path.join(__dirname, "mobile", "servers.json");

// Load existing servers.json
let existingData = { query: [] };
try {
  const raw = fs.readFileSync(filePath, "utf8");
  existingData = JSON.parse(raw);
} catch (err) {
  console.error("⚠️ Failed to read servers.json, starting with empty list:", err);
}

async function queryServer(server) {
  return new Promise((resolve) => {
    query(
      { host: server.ip, port: server.port, timeout: 5000 },
      (error, response) => {
        if (error) {
          console.warn(
            `⚠️ Query failed for server ${server.name} → keeping old values`
          );
          resolve({ ...server }); // fallback
        } else {
          console.log(`✅ Query successful for ${server.name}`);
          resolve({
            ...server,
            name: response.hostname.trim(),
            online: response.online,
            maxplayers: response.maxplayers,
            password: response.passworded,
            lastChecked: new Date().toISOString(),
          });
        }
      }
    );
  });
}

(async () => {
  const updatedServers = [];

  for (let server of existingData.query) {
    try {
      const updated = await queryServer(server);
      updatedServers.push(updated);
    } catch (err) {
      console.error("⚠️ Unexpected error:", err);
      updatedServers.push(server); // fallback again
    }
  }

  const newData = { query: updatedServers };

  // Compare before writing
  const oldJson = JSON.stringify(existingData, null, 2);
  const newJson = JSON.stringify(newData, null, 2);

  if (oldJson !== newJson) {
    fs.writeFileSync(filePath, newJson, "utf8");
    console.log("✅ servers.json updated.");
  } else {
    console.log("ℹ️ No changes detected, skipping update.");
  }
})();
