// All filter values are bound parameters; only allowlisted columns enter SQL.
const stages = [
  "idea",
  "planning",
  "mvp",
  "development",
  "launched",
  "on_hold",
];
const invalid = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};
function getMarketplaceQuery(query = {}) {
  const parameters = [];
  const conditions = ["p.is_for_sale = true", "p.is_public = true"];
  const bind = (value) => {
    parameters.push(value);
    return `$${parameters.length}`;
  };
  const input = (key, max) => {
    if (query[key] === undefined || query[key] === "") return "";
    if (typeof query[key] !== "string" || query[key].length > max)
      invalid(`${key} must be text of at most ${max} characters.`);
    return query[key].trim().toLowerCase();
  };
  const pattern = (value) =>
    `%${value.replace(/[!%_]/g, (character) => `!${character}`)}%`;
  const contains = (column, placeholder) =>
    `LOWER(COALESCE(CAST(${column} AS TEXT), '')) LIKE ${placeholder} ESCAPE '!'`;
  const search = input("q", 200);
  if (search) {
    const placeholder = bind(pattern(search));
    conditions.push(
      `(${["p.name", "p.description", "p.tech_stack", "p.category", "p.tags"].map((column) => contains(column, placeholder)).join(" OR ")})`,
    );
  }
  const stage = input("stage", 30);
  if (stage) {
    if (!stages.includes(stage)) invalid("Invalid project stage filter.");
    conditions.push(`LOWER(p.stage) = ${bind(stage)}`);
  }
  const category = input("category", 50);
  if (category) conditions.push(`LOWER(p.category) = ${bind(category)}`);
  const technologies = input("techStack", 200)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (technologies.length > 10) invalid("Filter by at most 10 technologies.");
  for (const technology of technologies)
    conditions.push(contains("p.tech_stack", bind(pattern(technology))));
  const prices = {};
  for (const [key, operator] of [
    ["minPrice", ">="],
    ["maxPrice", "<="],
  ]) {
    const raw = input(key, 30);
    if (!raw) continue;
    if (
      !/^\d+(\.\d{1,2})?$/.test(raw) ||
      !Number.isFinite(Number(raw)) ||
      Number(raw) > 9999999999.99
    ) {
      invalid(
        `${key} must be a non-negative price with at most two decimal places.`,
      );
    }
    prices[key] = Number(raw);
    conditions.push(`p.sale_price ${operator} ${bind(prices[key])}`);
  }
  if (
    prices.minPrice !== undefined &&
    prices.maxPrice !== undefined &&
    prices.minPrice > prices.maxPrice
  ) {
    invalid("Minimum price cannot exceed maximum price.");
  }
  const sortFields = {
    created_at: "p.created_at",
    sale_price: "p.sale_price",
    monthly_revenue: "p.monthly_revenue",
    view_count: "p.view_count",
    overall_score: "ai.overall_score",
  };
  const sort =
    typeof query.sortBy === "string" && Object.hasOwn(sortFields, query.sortBy)
      ? sortFields[query.sortBy]
      : sortFields.created_at;
  const direction = query.sortOrder === "asc" ? "ASC" : "DESC";
  return {
    where: conditions.join(" AND "),
    parameters,
    orderBy: `(${sort} IS NULL) ASC, ${sort} ${direction}, p.project_id ASC`,
  };
}
module.exports = { getMarketplaceQuery };
