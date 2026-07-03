const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// Set API_TOKEN before importing app so auth middleware can validate
process.env.API_TOKEN = "test-token";

const { createApp } = require("../dist/app.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

const FEEDBACK_DIR = path.join(__dirname, "..", "storage", "feedback");

function cleanup() {
  try {
    if (fs.existsSync(FEEDBACK_DIR)) {
      fs.rmSync(FEEDBACK_DIR, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

test("feedback CRUD lifecycle", async () => {
  cleanup();
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    // Submit feedback
    const submitRes = await request(port, "POST", "/api/feedback", {
      title: "Test Bug",
      description: "Something went wrong",
      severity: "high",
      category: "bug",
    });
    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.body.success, true);
    assert.ok(submitRes.body.data.folderName);

    const folderName = submitRes.body.data.folderName;

    // Admin list
    const listRes = await request(port, "GET", "/api/feedback/admin/reviews");
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.ok(listRes.body.data.items.length >= 1);
    assert.equal(listRes.body.data.items[0].title, "Test Bug");
    assert.equal(listRes.body.data.items[0].severity, "high");

    // Get detail
    const detailRes = await request(port, "GET", `/api/feedback/admin/reviews/${folderName}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.success, true);
    assert.equal(detailRes.body.data.title, "Test Bug");
    assert.equal(detailRes.body.data.description, "Something went wrong");

    // Add comment
    const commentRes = await request(port, "POST", `/api/feedback/${folderName}/comments`, {
      content: "This is a comment",
    });
    assert.equal(commentRes.status, 201);
    assert.equal(commentRes.body.success, true);

    // List comments
    const commentsRes = await request(port, "GET", `/api/feedback/${folderName}/comments`);
    assert.equal(commentsRes.status, 200);
    assert.equal(commentsRes.body.data.length, 1);
    assert.equal(commentsRes.body.data[0].content, "This is a comment");

    // Archive
    const archiveRes = await request(port, "POST", `/api/feedback/admin/reviews/${folderName}/archive`);
    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.status, "archived");

    // Verify archived status
    const detailAfterArchive = await request(port, "GET", `/api/feedback/admin/reviews/${folderName}`);
    assert.equal(detailAfterArchive.body.data.status, "archived");

    // Delete
    const deleteRes = await request(port, "DELETE", `/api/feedback/admin/reviews/${folderName}`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);

    // Verify deleted
    const detailAfterDelete = await request(port, "GET", `/api/feedback/admin/reviews/${folderName}`);
    assert.equal(detailAfterDelete.status, 404);

    // Validation: empty title should fail
    const badSubmit = await request(port, "POST", "/api/feedback", {
      title: "",
      description: "desc",
    });
    assert.equal(badSubmit.status, 400);
  } finally {
    server.close();
    cleanup();
  }
});

test("feedback list supports pagination and filters", async () => {
  cleanup();
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    // Create 3 feedback items
    for (let i = 0; i < 3; i++) {
      await request(port, "POST", "/api/feedback", {
        title: `Feedback ${i}`,
        description: `Description ${i}`,
        severity: i === 0 ? "low" : "medium",
        category: "bug",
      });
    }

    // List with pagination
    const listRes = await request(port, "GET", "/api/feedback/admin/reviews?page=1&limit=2");
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.items.length, 2);
    assert.equal(listRes.body.data.total, 3);
    assert.equal(listRes.body.data.page, 1);
    assert.equal(listRes.body.data.limit, 2);

    // Filter by severity
    const filterRes = await request(port, "GET", "/api/feedback/admin/reviews?severity=low");
    assert.equal(filterRes.status, 200);
    assert.equal(filterRes.body.data.items.length, 1);
    assert.equal(filterRes.body.data.items[0].severity, "low");
  } finally {
    server.close();
    cleanup();
  }
});
