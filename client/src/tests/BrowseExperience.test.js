import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import axe from "axe-core";
import Home from "../pages/HomePage";
import Marketplace from "../pages/MarketplacePageSimple";
import AuthForm from "../components/AuthForm";
import BrowseProjectCard from "../components/BrowseProjectCard";
import api, {
  loginUser,
  registerUser,
  getSavedProjectIds,
  saveProject,
  unsaveProject,
} from "../services/api";
const mockAuth = {
  user: null,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
};
jest.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("../services/api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  getSavedProjectIds: jest.fn(),
  saveProject: jest.fn(),
  unsaveProject: jest.fn(),
}));
const project = {
  project_id: "alpha",
  name: "Project Alpha",
  description: "A real project description.",
  stage: "mvp",
  sale_price: 125.75,
  tech_stack: '{"React","Node.js"}',
};
const page = (items = [project], total = items.length) => ({
  data: {
    data: items,
    pagination: { page: 1, total, totalPages: Math.ceil(total / 12) },
  },
});
const Location = () => {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  );
};
function open(element, path = "/") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/dashboard" element={<p>Signed-in dashboard</p>} />
          <Route path="/projects/chosen" element={<p>Chosen project</p>} />
          <Route path="*" element={element} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  mockAuth.user = null;
  mockAuth.isAuthenticated = false;
  api.get.mockImplementation((url) =>
    Promise.resolve(
      url.includes("stats")
        ? {
            data: {
              active_listings: "2",
              projects_count: "3",
              users_count: "36",
            },
          }
        : page(),
    ),
  );
  loginUser.mockResolvedValue({
    token: "fixture-session",
    user: { user_id: "buyer" },
  });
  registerUser.mockResolvedValue({
    token: "fixture-session",
    user: { user_id: "buyer" },
  });
  getSavedProjectIds.mockResolvedValue([]);
  saveProject.mockResolvedValue({});
  unsaveProject.mockResolvedValue({});
});
test("home uses the real snake-case statistics and guest links allow browsing", async () => {
  open(<Home />);
  await waitFor(() =>
    expect(
      screen.getByLabelText("Live marketplace statistics"),
    ).toHaveTextContent("36"),
  );
  expect(
    screen.getByLabelText("Live marketplace statistics"),
  ).toHaveTextContent("2");
  expect(screen.getByRole("link", { name: "Browse projects" })).toHaveAttribute(
    "href",
    "/marketplace",
  );
  expect(screen.queryByText("Verified Projects")).not.toBeInTheDocument();
});
test("home distinguishes unavailable counts and failed listings from empty inventory", async () => {
  api.get.mockRejectedValue(new Error("offline"));
  open(<Home />);
  expect(
    await screen.findByText(/Live marketplace counts are unavailable/),
  ).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Check your connection");
  expect(
    screen.queryByText("The next listing could be yours."),
  ).not.toBeInTheDocument();
  api.get.mockResolvedValue(page());
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findAllByText("Project Alpha")).toHaveLength(2);
});
test("marketplace restores shareable decimal budget, search, stage and sort", async () => {
  open(
    <Marketplace />,
    "/marketplace?q=alpha&minPrice=125.50&maxPrice=126.25&stage=mvp&sort=price-low",
  );
  await screen.findByText("Project Alpha");
  expect(api.get).toHaveBeenCalledWith("/public/marketplace", {
    params: expect.objectContaining({
      q: "alpha",
      minPrice: "125.50",
      maxPrice: "126.25",
      stage: "mvp",
      sortBy: "sale_price",
      sortOrder: "asc",
    }),
  });
  expect(screen.getByLabelText("Minimum price")).toHaveValue("125.50");
  fireEvent.click(
    screen.getByRole("button", { name: "Remove Stage filter: mvp" }),
  );
  await waitFor(() =>
    expect(screen.getByTestId("location")).not.toHaveTextContent("stage="),
  );
  expect(screen.getByTestId("location")).toHaveTextContent("minPrice=125.50");
});
test("bad budgets show a useful field error and can be cleared without losing stage", async () => {
  open(<Marketplace />, "/marketplace?stage=mvp&minPrice=200&maxPrice=100");
  expect(
    await screen.findByText("Set the minimum below the maximum price."),
  ).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Clear budget" }));
  await screen.findByText("Project Alpha");
  expect(screen.getByTestId("location")).toHaveTextContent("stage=mvp");
  expect(screen.getByTestId("location")).not.toHaveTextContent("maxPrice=");
});
test("failed listings have Retry; a genuinely empty filtered response has Clear filters", async () => {
  api.get.mockRejectedValueOnce(new Error("offline"));
  open(<Marketplace />, "/marketplace?q=missing");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Check your connection",
  );
  api.get.mockResolvedValue(page([]));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByText("No projects match just yet."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Clear filters" }),
  ).toBeInTheDocument();
});
test("a slow earlier search cannot replace newer results", async () => {
  let resolveOld;
  api.get.mockImplementation((_url, { params }) =>
    params.q === "old"
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve(page([{ ...project, name: params.q || "Initial" }])),
  );
  open(<Marketplace />, "/marketplace");
  await screen.findByText("Initial");
  fireEvent.change(screen.getByLabelText("Search marketplace"), {
    target: { value: "old" },
  });
  await waitFor(() => expect(resolveOld).toBeDefined());
  fireEvent.change(screen.getByLabelText("Search marketplace"), {
    target: { value: "new" },
  });
  await screen.findByText("new");
  await act(async () =>
    resolveOld(page([{ ...project, name: "Stale result" }])),
  );
  expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
});
test("project cards use real links, preserve cents and expose a named save action", () => {
  open(<BrowseProjectCard project={project} />);
  expect(
    screen.getByRole("link", { name: "Project Alpha", exact: true }),
  ).toHaveAttribute("href", "/projects/alpha");
  expect(screen.getByText("$125.75")).toBeInTheDocument();
  expect(screen.getByText("React")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Save Project Alpha" }),
  ).toHaveAttribute("aria-pressed", "false");
});
test("saving synchronizes repeated cards and shares the initial saved-ID request", async () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { user_id: "saved-user" };
  open(
    <>
      <BrowseProjectCard project={project} />
      <BrowseProjectCard project={project} />
    </>,
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Save Project Alpha" })[0],
    ).not.toBeDisabled(),
  );
  expect(getSavedProjectIds).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Save Project Alpha" })[0],
  );
  expect(
    await screen.findAllByRole("button", { name: "Unsave Project Alpha" }),
  ).toHaveLength(2);
  expect(saveProject).toHaveBeenCalledWith("alpha");
});
test("sign-in errors focus the first invalid field; passwords can be revealed accessibly", async () => {
  open(<AuthForm />, "/login");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByLabelText("Email address")).toHaveFocus();
  expect(screen.getByLabelText("Email address")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(loginUser).not.toHaveBeenCalled();
});
test("sign-in preserves a safe project destination and updates shared auth", async () => {
  open(<AuthForm />, "/login?next=%2Fprojects%2Fchosen");
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "qa@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Fixture-password!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Chosen project")).toBeInTheDocument();
  expect(mockAuth.login).toHaveBeenCalledWith("fixture-session", {
    user_id: "buyer",
  });
});
test("failed sign-in keeps typed values and offers useful recovery", async () => {
  loginUser.mockRejectedValue(new Error("Invalid credentials"));
  open(<AuthForm />, "/login");
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "qa@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Fixture-password!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Check your email and password",
  );
  expect(screen.getByLabelText("Password")).toHaveValue("Fixture-password!");
  expect(
    screen.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/forgot-password");
});
test("registration checks password confirmation and terms, then resumes the intended destination", async () => {
  open(<AuthForm register />, "/register?next=%2Fprojects%2Fchosen");
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "qa_builder" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "qa@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
    target: { value: "Fixture-password!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(registerUser).not.toHaveBeenCalled();
  expect(
    screen.getByText("Enter the same password in both fields."),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "Fixture-password!" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Chosen project")).toBeInTheDocument();
  expect(registerUser).toHaveBeenCalledWith(
    expect.objectContaining({
      username: "qa_builder",
      email: "qa@example.com",
    }),
  );
});

test("home semantics pass automated accessibility checks", async () => {
  const view = open(
    <main>
      <Home />
    </main>,
  );
  await screen.findAllByText("Project Alpha");
  const result = await axe.run(view.container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
test("signup form semantics pass automated accessibility checks", async () => {
  const view = open(
    <main>
      <AuthForm register />
    </main>,
    "/register",
  );
  const result = await axe.run(view.container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
