const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { getMarketplaceQuery } = require("../utils/marketplaceQuery");
const db = new sqlite3.Database(":memory:");
const query = (sql, args = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, args, (error, rows) => (error ? reject(error) : resolve(rows))),
  );
const select = (input, limit = 20, offset = 0) => {
  const { where, parameters, orderBy } = getMarketplaceQuery(input);
  return query(
    `SELECT p.project_id,p.sale_price FROM projects p LEFT JOIN ai_project_analysis ai ON ai.project_id=p.project_id WHERE ${where} ORDER BY ${orderBy} LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`,
    [...parameters, limit, offset],
  );
};
before(async () => {
  await query(
    "CREATE TABLE projects(project_id TEXT,name TEXT,description TEXT,tech_stack TEXT,category TEXT,tags TEXT,stage TEXT,sale_price NUMERIC,is_public BOOLEAN,is_for_sale BOOLEAN,created_at TEXT,monthly_revenue NUMERIC,view_count INTEGER)",
  );
  await query(
    "CREATE TABLE ai_project_analysis(project_id TEXT,overall_score NUMERIC)",
  );
  for (let i = 0; i < 24; i++)
    await query(
      "INSERT INTO projects VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,true,$9,0,0)",
      [
        String(i).padStart(2, "0"),
        i === 23 ? "Rare 100% match" : "Ordinary project",
        "Build something",
        "React,Node.js",
        "analytics",
        "tools",
        "mvp",
        i === 23 ? 25.75 : 10,
        "2026-11-09",
      ],
    );
});
after(() => new Promise((resolve) => db.close(resolve)));
test("search filters the complete inventory before pagination, including literal wildcards", async () => {
  assert.equal((await select({})).length, 20);
  assert.deepEqual(await select({ q: "Rare 100%" }), [
    { project_id: "23", sale_price: 25.75 },
  ]);
  assert.equal((await select({ q: "100_" })).length, 0);
});
test("combined filters preserve cents and use a deterministic order", async () => {
  assert.deepEqual(
    await select({
      minPrice: "25.74",
      maxPrice: "25.76",
      stage: "mvp",
      techStack: "React, Node.js",
      category: "analytics",
    }),
    [{ project_id: "23", sale_price: 25.75 }],
  );
  assert.deepEqual(
    (await select({ sortBy: "sale_price", sortOrder: "desc" }, 2)).map(
      (row) => row.project_id,
    ),
    ["23", "00"],
  );
});
test("hostile strings stay values and invalid prices fail before SQL", async () => {
  assert.deepEqual(await select({ q: "' OR 1=1 --" }), []);
  assert.equal(
    (await query("SELECT COUNT(*) AS count FROM projects"))[0].count,
    24,
  );
  assert.throws(() => getMarketplaceQuery({ minPrice: "20", maxPrice: "10" }), {
    status: 400,
  });
  assert.throws(() => getMarketplaceQuery({ stage: ["mvp"] }), { status: 400 });
});
test("private or unavailable listings are excluded even when their text matches", async () => {
  await query("UPDATE projects SET is_public=false WHERE project_id='23'");
  assert.deepEqual(await select({ q: "Rare" }), []);
  await query(
    "UPDATE projects SET is_public=true,is_for_sale=false WHERE project_id='23'",
  );
  assert.deepEqual(await select({ q: "Rare" }), []);
});
