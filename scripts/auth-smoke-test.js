const baseUrl = process.env.BASE_URL || "http://localhost:5000";
const token = process.env.ID_TOKEN || "";

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  return { res, text };
}

async function run() {
  if (!token) {
    const { res, text } = await request("/api/notifications");
    if (res.status !== 401) {
      console.error("Expected 401 when ID_TOKEN is missing.");
      console.error("Status:", res.status);
      console.error("Body:", text);
      process.exit(1);
    }
    console.log("PASS: Missing token returns 401.");
    return;
  }

  const { res, text } = await request("/api/notifications", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("Expected 200 with valid token.");
    console.error("Status:", res.status);
    console.error("Body:", text);
    process.exit(1);
  }

  console.log("PASS: Valid token returns 200.");
}

run().catch((err) => {
  console.error("Auth smoke test failed:", err);
  process.exit(1);
});
