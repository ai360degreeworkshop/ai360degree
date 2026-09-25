"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { icons } from "lucide-react";
import { DemoCredentials } from "../../components/demo-credentials";
import { getBrowserClient } from "../../lib/supabase/client";
import { readableAuthError } from "../../lib/supabase/errors";
import { dashboardPathFor, fetchCurrentUserRole } from "../../lib/supabase/profile";
import design from "./login-design.json";

type GradientFill = {
  type: "gradient";
  gradientType: "linear";
  enabled?: boolean;
  rotation?: number;
  colors: { color: string; position: number }[];
};

type PenNode = {
  id: string;
  type: "frame" | "text" | "icon" | "rectangle" | "ellipse";
  name?: string;
  content?: string;
  children?: PenNode[];
  width?: number | "fill_container";
  height?: number | "fill_container";
  x?: number;
  y?: number;
  layout?: "vertical" | "horizontal" | "none";
  gap?: number;
  padding?: number | number[];
  justifyContent?: "center" | "end" | "space_between";
  alignItems?: "center" | "end";
  fill?: string | { type: "image"; url: string } | GradientFill;
  stroke?: string;
  strokeWidth?: number | Record<string, number>;
  cornerRadius?: number | number[];
  clip?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textGrowth?: "fixed-width";
  icon?: string;
  weight?: number;
  effect?: { color: string; offset: { x: number; y: number }; blur: number };
};

/* The submit handler and the inline message belong to LoginPage, but the form and
   its button are drawn deep inside the pen tree. Rather than thread state through
   renderNode - which would change its signature and every call site - the two
   branches that need it read it from here. */
type LoginFormState = {
  pending: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const LoginFormContext = createContext<LoginFormState>({
  pending: false,
  error: null,
  onSubmit: () => {},
});

const px = (value?: number | string) =>
  typeof value === "number" ? `${value}px` : value;

function edges(value?: number | number[]) {
  if (value == null) return undefined;
  return (Array.isArray(value) ? value : [value]).map((side) => `${side}px`).join(" ");
}

function borderStyle(node: PenNode): CSSProperties {
  if (!node.stroke || node.strokeWidth == null) return {};
  if (typeof node.strokeWidth === "number") {
    return { border: `${node.strokeWidth}px solid ${node.stroke}` };
  }
  return Object.fromEntries(
    Object.entries(node.strokeWidth).map(([side, width]) => [
      `border${side[0].toUpperCase()}${side.slice(1)}`,
      `${width}px solid ${node.stroke}`,
    ]),
  ) as CSSProperties;
}

function background(node: PenNode) {
  const fill = node.fill;
  if (typeof fill === "string") {
    return node.type === "text" || node.type === "icon" ? {} : { backgroundColor: fill };
  }
  if (fill?.type === "gradient") {
    const stops = fill.colors
      .map((stop) => `${stop.color} ${stop.position * 100}%`)
      .join(", ");
    return { backgroundImage: `linear-gradient(${fill.rotation ?? 180}deg, ${stops})` };
  }
  return {};
}

/* lucide renamed this glyph after the design was drawn. */
const iconAliases: Record<string, string> = { "circle-help": "circle-question-mark" };

const pascalCase = (value: string) =>
  value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");

function Glyph({ node }: { node: PenNode }) {
  const name = node.icon ?? "circle";
  const Icon = icons[pascalCase(iconAliases[name] ?? name) as keyof typeof icons];
  const color = typeof node.fill === "string" ? node.fill : "currentColor";
  return Icon ? (
    <Icon
      aria-hidden="true"
      color={color}
      size={typeof node.width === "number" ? node.width : undefined}
      strokeWidth={(node.weight ?? 400) / 250}
      style={styleFor(node)}
    />
  ) : null;
}

function styleFor(
  node: PenNode,
  isRoot = false,
  parentLayout?: PenNode["layout"],
  parentAlign?: PenNode["alignItems"],
): CSSProperties {
  const hasPositionedChildren = node.children?.some((c) => c.x != null || c.y != null);
  return {
    ...(node.width === "fill_container"
      ? { flex: "1 1 0", minWidth: 0 }
      : { width: px(node.width), flexShrink: 0 }),
    /* A child with no width of its own hugs its content in the design. A plain CSS
       column stretches it, so pin it to the start - unless the design centers the
       column itself, where stretching is exactly what keeps the child centered. */
    ...(node.width == null && parentLayout === "vertical" && parentAlign == null
      ? { alignSelf: "flex-start" as const }
      : {}),
    ...(node.height === "fill_container"
      ? { flex: "1 1 0", minHeight: 0 }
      : { height: px(node.height), flexShrink: 0 }),
    ...(node.children?.length
      ? {
          display: "flex",
          flexDirection: node.layout === "vertical" ? "column" : "row",
        }
      : {}),
    position:
      !isRoot && (node.x != null || node.y != null)
        ? "absolute"
        : hasPositionedChildren
          ? "relative"
          : undefined,
    left: !isRoot ? px(node.x) : undefined,
    top: !isRoot ? px(node.y) : undefined,
    gap: px(node.gap),
    padding: edges(node.padding),
    justifyContent:
      node.justifyContent === "space_between"
        ? "space-between"
        : node.justifyContent === "end"
          ? "flex-end"
          : node.justifyContent,
    alignItems: node.alignItems === "end" ? "flex-end" : node.alignItems,
    overflow: node.clip ? "hidden" : undefined,
    ...background(node),
    borderRadius: node.type === "ellipse" ? "50%" : edges(node.cornerRadius),
    boxShadow: node.effect
      ? `${node.effect.offset.x}px ${node.effect.offset.y}px ${node.effect.blur}px ${node.effect.color}`
      : undefined,
    color: typeof node.fill === "string" ? node.fill : undefined,
    fontFamily: node.fontFamily ? `'${node.fontFamily}', system-ui, sans-serif` : undefined,
    fontSize: px(node.fontSize),
    fontWeight: node.fontWeight,
    /* Pencil stores a unitless ratio (1.08) or absolute px; a bare ratio must stay
       unitless so lines are spaced proportionally, not collapsed to ~1px. */
    lineHeight:
      node.lineHeight == null
        ? undefined
        : node.lineHeight < 4
          ? String(node.lineHeight)
          : `${node.lineHeight}px`,
    letterSpacing: px(node.letterSpacing),
    whiteSpace:
      node.textGrowth === "fixed-width" || node.width === "fill_container"
        ? "pre-wrap"
        : "nowrap",
    ...borderStyle(node),
  };
}

/* The design draws the text fields as frames containing a placeholder label. Real
   <input> elements replace those labels so the form is usable and screen readers
   get a labelled control rather than a picture of one. */
function TextField({ node, type, label }: { node: PenNode; type: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const placeholder = node.children?.find((c) => c.name?.endsWith("Field Placeholder"));
  const icon = node.children?.find((c) => c.name?.endsWith("Field Icon"));
  const action = node.children?.find((c) => c.name?.endsWith("Field Action"));
  const id = `login-${type}`;
  const inputType = type === "password" && visible ? "text" : type;

  return (
    <div style={{ ...styleFor({ ...node, children: undefined }), display: "flex" }}>
      {icon ? <Glyph node={icon} /> : null}
      <input
        id={id}
        name={type}
        type={inputType}
        placeholder={placeholder?.content}
        aria-label={label}
        autoComplete={type === "password" ? "current-password" : "email"}
        className="login-input"
      />
      {action ? (
        <button
          type="button"
          className="login-input-action"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <Glyph node={{ ...action, icon: visible ? "eye-off" : "eye" }} />
        </button>
      ) : null}
    </div>
  );
}

function renderNode(
  node: PenNode,
  isRoot = false,
  parentLayout?: PenNode["layout"],
  parentAlign?: PenNode["alignItems"],
): ReactNode {
  const name = node.name ?? "";
  const style = styleFor(node, isRoot, parentLayout, parentAlign);
  /* Links in this design are text nodes, so resolve the target before the text
     branch returns - otherwise the prompt link renders as inert copy. */
  const href =
    name === "Desktop Login Home Link"
      ? "/"
      : name === "Desktop Register Prompt Link"
        ? "/register"
        : undefined;

  if (node.type === "text") {
    return href ? (
      <a key={node.id} href={href} data-pen-name={name} style={style}>
        {node.content}
      </a>
    ) : (
      <div key={node.id} data-pen-name={name} style={style}>
        {node.content}
      </div>
    );
  }

  if (node.type === "icon") return <Glyph key={node.id} node={node} />;

  // Interactive controls the design expresses as static frames.
  if (name.endsWith("Desktop Field") && node.children) {
    const isPassword = name.startsWith("Password");
    return (
      <TextField
        key={node.id}
        node={node}
        type={isPassword ? "password" : "email"}
        label={isPassword ? "Password" : "Email address"}
      />
    );
  }

  if (name === "Desktop Remember Checkbox") {
    return (
      <label key={node.id} className="login-checkbox" style={styleFor({ ...node, children: undefined })}>
        <input type="checkbox" name="remember" defaultChecked />
        <Glyph node={node.children?.[0] ?? { ...node, type: "icon", icon: "check" }} />
      </label>
    );
  }

  if (name === "Desktop Login Primary Action") {
    return <PrimaryAction key={node.id} node={node} style={style} />;
  }

  if (name === "Desktop Google Login") {
    return (
      <button key={node.id} type="button" className="login-google" style={style}>
        {node.children?.map((child) => renderNode(child))}
      </button>
    );
  }

  const children = node.children?.map((child) => renderNode(child, false, node.layout, node.alignItems));

  if (name === "Desktop Login Form Card") {
    return (
      <LoginForm key={node.id} style={style}>
        {children}
      </LoginForm>
    );
  }

  if (href) {
    return (
      <a key={node.id} href={href} data-pen-name={name} style={style}>
        {children}
      </a>
    );
  }

  return (
    <div
      key={node.id}
      data-pen-name={name}
      style={style}
      className={isRoot ? "login-canvas" : undefined}
    >
      {children}
    </div>
  );
}

/* The two pieces of the tree that need LoginPage's state: the form carries the
   submit handler and the feedback line, the button carries the pending state. */
function LoginForm({ style, children }: { style: CSSProperties; children: ReactNode }) {
  const { onSubmit, error } = useContext(LoginFormContext);
  return (
    <form className="login-form" style={style} onSubmit={onSubmit}>
      {children}
      {error ? (
        <p className="login-error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function PrimaryAction({ node, style }: { node: PenNode; style: CSSProperties }) {
  const { pending } = useContext(LoginFormContext);
  return (
    <button
      type="submit"
      className="login-submit"
      style={style}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <span>Signing in…</span>
      ) : (
        node.children?.map((child) => renderNode(child))
      )}
    </button>
  );
}

export default function LoginPage() {
  const frame = design as unknown as PenNode;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The fields stay uncontrolled - the pen tree owns their boxes - so the values
     are read off the submitted FormData by the names TextField sets. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Enter your email address and password to sign in.");
      return;
    }

    setPending(true);
    const { error: signInError } = await getBrowserClient().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setPending(false);
      setError(readableAuthError(signInError.message));
      return;
    }

    /* The role lives in public.profiles, not in the session, so it has to be
       fetched before we know which dashboard to open. Pending stays true through
       the navigation so the button cannot be pressed twice. */
    const role = await fetchCurrentUserRole();
    router.replace(dashboardPathFor(role));
    router.refresh();
  }

  /* The frame is a fixed 1440x1024 artboard. Scale it down rather than reflow it,
     so the composition holds on narrower viewports. */
  useEffect(() => {
    const fit = () => {
      const el = document.querySelector<HTMLElement>(".login-canvas");
      if (!el) return;
      const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 1024, 1);
      el.style.zoom = String(scale);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <LoginFormContext.Provider value={{ pending, error, onSubmit: handleSubmit }}>
      <main className="login-viewport">
        {renderNode(frame, true)}
        <DemoCredentials emailId="login-email" passwordId="login-password" />
      </main>
    </LoginFormContext.Provider>
  );
}
