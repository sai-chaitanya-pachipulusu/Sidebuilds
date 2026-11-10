import React, { useEffect, useState, useId } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, Bookmark, Check, Code2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getSavedProjectIds,
  saveProject,
  unsaveProject,
} from "../services/api";
import { loginDestination } from "../utils/navigation";
export const stageLabels = {
  idea: "Idea",
  planning: "Planning",
  mvp: "MVP",
  development: "In development",
  launched: "Launched",
  on_hold: "On hold",
};
export const money = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
      }).format(Number(value))
    : "Ask seller";
export function technologies(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (_) {}
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}
const savedRequests = new Map();
function SaveProject({ project }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.user_id || user?.id;
  const [saved, setSaved] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    let active = true;
    setSaved(false);
    setError("");
    setPending(false);
    if (!isAuthenticated || !userId) return undefined;
    setPending(true);
    if (!savedRequests.has(userId))
      savedRequests.set(
        userId,
        getSavedProjectIds().catch((error) => {
          savedRequests.delete(userId);
          throw error;
        }),
      );
    savedRequests
      .get(userId)
      .then((ids) => {
        if (active) setSaved(ids.includes(project.project_id));
      })
      .catch(() => {
        if (active) setError("Saved status unavailable. Try again.");
      })
      .finally(() => {
        if (active) setPending(false);
      });
    const sync = (event) => {
      if (
        event.detail.userId === userId &&
        event.detail.id === project.project_id
      )
        setSaved(event.detail.saved);
    };
    window.addEventListener("sidebuilds:saved", sync);
    return () => {
      active = false;
      window.removeEventListener("sidebuilds:saved", sync);
    };
  }, [isAuthenticated, userId, project.project_id]);
  const toggle = async () => {
    if (!isAuthenticated) {
      navigate(loginDestination(location.pathname + location.search));
      return;
    }
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await (saved ? unsaveProject : saveProject)(project.project_id);
      savedRequests.delete(userId);
      window.dispatchEvent(
        new CustomEvent("sidebuilds:saved", {
          detail: { userId, id: project.project_id, saved: !saved },
        }),
      );
    } catch (_) {
      setError("Could not update saved projects. Try again.");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="sb-card-save">
      <button
        type="button"
        className="sb-icon-button"
        disabled={pending}
        aria-label={`${saved ? "Unsave" : "Save"} ${project.name}`}
        aria-pressed={saved}
        onClick={toggle}
        title={saved ? "Remove from saved projects" : "Save project"}
      >
        {saved ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Bookmark size={18} aria-hidden="true" />
        )}
      </button>
      {error && (
        <span role="alert" className="sb-save-error">
          {error}
        </span>
      )}
    </div>
  );
}
export default function BrowseProjectCard({ project, featured = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnail = (() => {
    try {
      if (!project.thumbnail_url) return null;
      const url = new URL(project.thumbnail_url, window.location.origin);
      return ["https:", "http:"].includes(url.protocol) ? url.href : null;
    } catch (_) {
      return null;
    }
  })();
  useEffect(() => setImageFailed(false), [thumbnail]);
  const titleId = useId();
  const stack = technologies(project.tech_stack);
  const Title = featured ? "h2" : "h3";
  return (
    <article
      className={`sb-project-card${featured ? " sb-project-card-featured" : ""}`}
    >
      <Link
        aria-labelledby={titleId}
        className="sb-project-link"
        to={`/projects/${project.project_id}`}
      >
        <div className="sb-project-cover" aria-hidden="true">
          {thumbnail && !imageFailed && (
            <img
              className="sb-project-thumbnail"
              src={thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          )}
          <div className="sb-cover-grid" />
          <span className="sb-project-monogram">
            {project.name?.slice(0, 1) || <Code2 />}
          </span>
          <span className="sb-cover-caption">
            {project.category?.replaceAll("_", " ") || "Independent software"}
          </span>
        </div>
        <div className="sb-project-body">
          <div className="sb-project-topline">
            <span className="sb-stage">
              <span className="sb-status-dot" />
              {stageLabels[project.stage] || "Stage not provided"}
            </span>
            {(project.is_on_hold === true || project.is_on_hold === 1) && (
              <span className="sb-small">On hold</span>
            )}
          </div>
          <Title id={titleId}>
            {project.name}
            <ArrowUpRight size={20} aria-hidden="true" />
          </Title>
          <p className="sb-project-description">
            {project.description ||
              "Open the listing to review the project and ask the seller for details."}
          </p>
          <div className="sb-tech-list">
            {stack.slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
            {stack.length > 3 && <span>+{stack.length - 3} more</span>}
          </div>
          <div className="sb-project-bottom">
            <div>
              <span className="sb-small">Asking price · USD</span>
              <strong>{money(project.sale_price)}</strong>
            </div>
            <span className="sb-view-project">
              View project <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
      <SaveProject project={project} />
    </article>
  );
}
