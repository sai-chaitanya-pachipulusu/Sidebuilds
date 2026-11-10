import React, { useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { ArrowRight, Eye, EyeOff, ArrowUpRight, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser } from "../services/api";
import { safeReturnTo } from "../utils/navigation";
import SEO from "./SEO";
export default function AuthForm({ register = false }) {
  const { isAuthenticated, login } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation(),
    navigate = useNavigate();
  const from = location.state?.from;
  const stateDestination =
    typeof from === "string"
      ? from
      : from?.pathname
        ? `${from.pathname}${from.search || ""}${from.hash || ""}`
        : undefined;
  const next = safeReturnTo(params.get("next") || stateDestination);
  const nextQuery =
    next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : "";
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false),
    [showConfirm, setShowConfirm] = useState(false),
    [terms, setTerms] = useState(false);
  const [pending, setPending] = useState(false),
    [errors, setErrors] = useState({}),
    [serverError, setServerError] = useState("");
  const form = useRef(null);
  if (isAuthenticated) return <Navigate to={next} replace />;
  const change = (event) => {
    setValues((old) => ({ ...old, [event.target.name]: event.target.value }));
    setErrors((old) => ({ ...old, [event.target.name]: undefined }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    const invalid = {};
    if (register && !values.name.trim()) invalid.name = "Enter a username.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      invalid.email = "Enter a valid email address, like name@example.com.";
    if (!values.password) invalid.password = "Enter your password.";
    else if (register && values.password.length < 8)
      invalid.password = "Use at least 8 characters for your password.";
    if (register && values.password !== values.confirm)
      invalid.confirm = "Enter the same password in both fields.";
    if (register && !terms)
      invalid.terms =
        "Read and agree to the Terms of Service to create an account.";
    setErrors(invalid);
    setServerError("");
    if (Object.keys(invalid).length) {
      form.current
        ?.querySelector(`[name="${Object.keys(invalid)[0]}"]`)
        ?.focus();
      return;
    }
    setPending(true);
    try {
      const result = register
        ? await registerUser({
            username: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
            first_name: null,
            last_name: null,
          })
        : await loginUser({
            email: values.email.trim(),
            password: values.password,
          });
      if (!result?.token || !result?.user) throw new Error("Missing session");
      login(result.token, result.user);
      navigate(next, {
        replace: true,
        state: { marketplaceSearch: location.state?.marketplaceSearch },
      });
    } catch (error) {
      const status = error.status || error.response?.status;
      setServerError(
        status === 429 ||
          /too many|exceeded.*attempts/i.test(
            error.message || error.error || "",
          )
          ? "Too many attempts. Wait 15 minutes, then try again."
          : register
            ? "Your account could not be created. Choose another username or email, or sign in if you already have an account."
            : "Sign-in failed. Check your email and password, then try again.",
      );
    } finally {
      setPending(false);
    }
  };
  const field = (name, label, type, placeholder, autocomplete) => (
    <div className="sb-auth-field">
      <label htmlFor={`auth-${name}`}>{label}</label>
      <div className="sb-password-wrap">
        <input
          id={`auth-${name}`}
          name={name}
          type={
            name === "password" && show
              ? "text"
              : name === "confirm" && showConfirm
                ? "text"
                : type
          }
          value={values[name]}
          placeholder={placeholder}
          autoComplete={autocomplete}
          required
          spellCheck={false}
          onChange={change}
          aria-invalid={!!errors[name]}
          aria-describedby={
            errors[name]
              ? `error-${name}`
              : register && name === "password"
                ? "password-hint"
                : undefined
          }
        />
        {type === "password" && (
          <button
            type="button"
            className="sb-icon-button"
            aria-label={`${(name === "password" ? show : showConfirm) ? "Hide" : "Show"} ${name === "confirm" ? "confirmation password" : "password"}`}
            aria-pressed={name === "password" ? show : showConfirm}
            onClick={() =>
              name === "password"
                ? setShow((value) => !value)
                : setShowConfirm((value) => !value)
            }
          >
            {(name === "password" ? show : showConfirm) ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {errors[name] && (
        <p className="sb-field-error" id={`error-${name}`}>
          {errors[name]}
        </p>
      )}
      {register && name === "password" && (
        <p className="sb-field-hint" id="password-hint">
          Use at least 8 characters. A unique password is best.
        </p>
      )}
    </div>
  );
  return (
    <div className="sb-page sb-auth">
      <SEO
        title={`${register ? "Create an account" : "Sign in"} — SideBuilds`}
        description={
          register
            ? "Create a SideBuilds account to save projects, talk to builders and share your work."
            : "Sign in to your SideBuilds account and pick up where you left off."
        }
      />
      <div className="sb-container sb-auth-layout">
        <aside className="sb-auth-story">
          <span className="sb-eyebrow">
            A good project is just the beginning.
          </span>
          <p className="sb-auth-story-display">
            Build on
            <br />
            someone’s <em>head start.</em>
          </p>
          <p>
            Save what catches your eye. Ask the questions that matter. Find a
            project you can take further.
          </p>
          <ul>
            {[
              "Explore projects at every stage",
              "Talk directly with their builders",
              "Keep your saved projects in one place",
            ].map((item) => (
              <li key={item}>
                <Check size={17} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link className="sb-text-link" to="/marketplace">
            Keep exploring <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </aside>
        <section className="sb-auth-card" aria-labelledby="auth-heading">
          <span className="sb-eyebrow">
            {register
              ? "Your next chapter starts here"
              : "Good to see you again"}
          </span>
          <h1 id="auth-heading">
            {register ? "Create your account" : "Welcome back"}
          </h1>
          <p>
            {register ? "Already have an account?" : "New to SideBuilds?"}{" "}
            <Link
              to={(register ? "/login" : "/register") + nextQuery}
              state={location.state}
            >
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <form ref={form} onSubmit={submit} noValidate aria-busy={pending}>
            {register && (
              <p className="sb-field-hint">All fields are required.</p>
            )}
            {serverError && (
              <div className="sb-form-error" role="alert">
                {serverError}
              </div>
            )}
            {register &&
              field("name", "Username", "text", "alexbuilds", "username")}
            {field(
              "email",
              "Email address",
              "email",
              "name@example.com",
              "email",
            )}
            {field(
              "password",
              "Password",
              "password",
              register ? "Create a password" : "Enter your password",
              register ? "new-password" : "current-password",
            )}
            {!register && (
              <div className="sb-auth-forgot">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            {register &&
              field(
                "confirm",
                "Confirm password",
                "password",
                "Re-enter your password",
                "new-password",
              )}
            {register && (
              <div className="sb-terms">
                <label htmlFor="auth-terms">
                  <input
                    id="auth-terms"
                    name="terms"
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => {
                      setTerms(e.target.checked);
                      setErrors((old) => ({ ...old, terms: undefined }));
                    }}
                    aria-invalid={!!errors.terms}
                    aria-describedby={errors.terms ? "error-terms" : undefined}
                  />
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>
                  .
                </label>
                {errors.terms && (
                  <p className="sb-field-error" id="error-terms">
                    {errors.terms}
                  </p>
                )}
              </div>
            )}
            <button
              className="sb-button sb-button-primary sb-auth-submit"
              type="submit"
              aria-disabled={pending}
            >
              {pending
                ? register
                  ? "Creating account…"
                  : "Signing in…"
                : register
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
          <p className="sb-auth-footnote">
            {register
              ? "You can browse without an account."
              : "Your projects will be right where you left them."}
          </p>
        </section>
      </div>
    </div>
  );
}
