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
import loginDesign from "../login/login-design.json";

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

/* Same reason as the login page: the form and its button are drawn inside the pen
   tree, so they read the handler and the pending state from context instead of
   renderNode growing a parameter for them. */
type RegisterFormState = {
  pending: boolean;
  error: string | null;
  notice: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const RegisterFormContext = createContext<RegisterFormState>({
  pending: false,
  error: null,
  notice: null,
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

/* ---------------------------------------------------------------------------
   Register card content.

   The pen file has no desktop register frame - only "AI 360° — Desktop Login"
   (1440x1024) and the two mobile auth screens. So the desktop register page
   reuses the desktop login shell (brand panel and form panel, including the
   header and legal strip) verbatim and swaps the card's contents for the
   register fields, carrying over the mobile register frame's copy and controls.
   Every value below - colours, sizes, spacing, fonts - is taken from those two
   frames, so the card stays inside the drawn design system.
--------------------------------------------------------------------------- */

const SANS = "IBM Plex Sans";
const MONO = "IBM Plex Mono";

const labelText = (name: string, content: string): PenNode => ({
  id: name,
  type: "text",
  name,
  content,
  fill: "#34443b",
  fontFamily: SANS,
  fontSize: 12,
});

const bodyText = (name: string, content: string, fill: string, fontSize: number): PenNode => ({
  id: name,
  type: "text",
  name,
  content,
  fill,
  fontFamily: SANS,
  fontSize,
});

type FieldKind = "Name" | "Email" | "Password";

/* Mirrors `Email Desktop Field` in the login frame: 52 tall, 11 radius, hairline
   border, leading icon, and an optional trailing action (the password eye). */
function fieldGroup(kind: FieldKind, caption: string, placeholder: string, icon: string, action?: string): PenNode {
  const base = `Register ${kind} Field`;
  return {
    id: `${base} Group`,
    type: "frame",
    name: `${base} Group`,
    width: "fill_container",
    layout: "vertical",
    gap: 8,
    children: [
      labelText(`${base} Label`, caption),
      {
        id: base,
        type: "frame",
        name: base,
        width: "fill_container",
        height: 52,
        layout: "horizontal",
        gap: 11,
        padding: [0, 14],
        alignItems: "center",
        fill: "#f7f9f7",
        cornerRadius: 11,
        stroke: "#dfe5e0",
        children: [
          { id: `${base} Icon`, type: "icon", name: `${base} Icon`, icon, width: 18, height: 18, fill: "#718078" },
          {
            id: `${base} Placeholder`,
            type: "text",
            name: `${base} Placeholder`,
            content: placeholder,
            width: "fill_container",
            fill: "#89958e",
            fontFamily: SANS,
            fontSize: 13,
          },
          ...(action
            ? [{ id: `${base} Action`, type: "icon" as const, name: `${base} Action`, icon: action, width: 18, height: 18, fill: "#718078" }]
            : []),
        ],
      },
    ],
  };
}

/* The two role tiles are one radio group, so they share a name with the mobile
   frame's picker and one renderer branch serves both. */
function roleTile(role: string, icon: string): PenNode {
  return {
    id: `${role} Register Role`,
    type: "frame",
    name: `${role} Register Role`,
    width: "fill_container",
    layout: "horizontal",
    gap: 9,
    justifyContent: "center",
    alignItems: "center",
    padding: [0, 14],
    fill: "#f7f9f7",
    cornerRadius: 11,
    stroke: "#dfe5e0",
    children: [
      { id: `${role} Register Role Icon`, type: "icon", name: `${role} Register Role Icon`, icon, width: 16, height: 16, fill: "#718078" },
      bodyText(`${role} Register Role Label`, role, "#34443b", 12),
    ],
  };
}

const registerCardChildren: PenNode[] = [
  {
    id: "Register Form Heading",
    type: "frame",
    name: "Register Form Heading",
    width: "fill_container",
    layout: "vertical",
    gap: 7,
    children: [
      { id: "Register Form Title", type: "text", name: "Register Form Title", content: "Create your account", fill: "#102019", fontFamily: "Space Grotesk", fontSize: 31 },
      bodyText("Register Form Subtitle", "Start your AI 360° learning journey", "#718078", 12),
    ],
  },
  fieldGroup("Name", "Full name", "Your full name", "user-round"),
  fieldGroup("Email", "Email address", "you@example.com", "mail"),
  fieldGroup("Password", "Password", "At least 8 characters", "lock-keyhole", "eye"),
  {
    id: "Register Role Group",
    type: "frame",
    name: "Register Role Group",
    width: "fill_container",
    layout: "vertical",
    gap: 8,
    children: [
      labelText("Register Role Label", "I am a"),
      {
        id: "Register Role Options",
        type: "frame",
        name: "Register Role Options",
        width: "fill_container",
        height: 44,
        layout: "horizontal",
        gap: 10,
        children: [
          roleTile("Student", "graduation-cap"),
          roleTile("Professional", "briefcase-business"),
        ],
      },
    ],
  },
  {
    id: "Register Terms Row",
    type: "frame",
    name: "Register Terms Row",
    width: "fill_container",
    layout: "horizontal",
    gap: 8,
    alignItems: "center",
    children: [
      {
        id: "Register Terms Checkbox",
        type: "frame",
        name: "Register Terms Checkbox",
        width: 18,
        height: 18,
        layout: "horizontal",
        alignItems: "center",
        justifyContent: "center",
        fill: "#178a76",
        cornerRadius: 5,
        children: [
          { id: "Register Terms Check", type: "icon", name: "Register Terms Check", icon: "check", width: 12, height: 12, fill: "#ffffff" },
        ],
      },
      bodyText("Register Terms Text", "I agree to the Terms of Use and Privacy Policy", "#66756d", 10),
    ],
  },
  {
    id: "Register Primary Action",
    type: "frame",
    name: "Register Primary Action",
    width: "fill_container",
    height: 52,
    layout: "horizontal",
    gap: 9,
    justifyContent: "center",
    alignItems: "center",
    fill: "#102621",
    cornerRadius: 12,
    children: [
      bodyText("Register Primary Label", "Create account", "#ffffff", 12),
      { id: "Register Primary Arrow", type: "icon", name: "Register Primary Arrow", icon: "arrow-right", width: 16, height: 16, fill: "#95e85f" },
    ],
  },
  {
    id: "Register Divider",
    type: "frame",
    name: "Register Divider",
    width: "fill_container",
    layout: "horizontal",
    gap: 11,
    alignItems: "center",
    children: [
      { id: "Register Divider Left", type: "rectangle", name: "Register Divider Left", width: "fill_container", height: 1, fill: "#dfe5e0" },
      { id: "Register Divider Label", type: "text", name: "Register Divider Label", content: "OR", fill: "#89958e", fontFamily: MONO, fontSize: 8 },
      { id: "Register Divider Right", type: "rectangle", name: "Register Divider Right", width: "fill_container", height: 1, fill: "#dfe5e0" },
    ],
  },
  {
    id: "Google Register",
    type: "frame",
    name: "Google Register",
    width: "fill_container",
    height: 50,
    layout: "horizontal",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    fill: "#ffffff",
    cornerRadius: 11,
    stroke: "#dfe5e0",
    children: [
      { id: "Google Register Mark", type: "text", name: "Google Register Mark", content: "G", fill: "#4285F4", fontFamily: "Inter", fontSize: 17 },
      bodyText("Google Register Label", "Sign up with Google", "#34443b", 11),
    ],
  },
  {
    id: "Register Login Prompt",
    type: "frame",
    name: "Register Login Prompt",
    width: "fill_container",
    layout: "horizontal",
    gap: 5,
    justifyContent: "center",
    children: [
      bodyText("Register Login Prompt Text", "Already have an account?", "#718078", 11),
      bodyText("Register Login Prompt Link", "Sign in", "#178a76", 11),
    ],
  },
];

/* The desktop login shell, cloned so the register tree can be mutated freely. */
function desktopRegisterFrame(): PenNode {
  const shell = JSON.parse(JSON.stringify(loginDesign)) as PenNode;
  const formPanel = shell.children?.[1];
  const formCenter = formPanel?.children?.[1];
  const card = formCenter?.children?.[0];
  if (!card) return shell;
  card.name = "Register Form Card";
  card.children = registerCardChildren;
  return shell;
}

/* The design draws the text fields as frames containing a placeholder label. Real
   <input> elements replace those labels so the form is usable and screen readers
   get a labelled control rather than a picture of one. */
function TextField({ node, kind }: { node: PenNode; kind: FieldKind }) {
  const [visible, setVisible] = useState(false);
  const placeholder = node.children?.find((c) => c.name?.endsWith("Field Placeholder"));
  const icon = node.children?.find((c) => c.name?.endsWith("Field Icon"));
  const action = node.children?.find((c) => c.name?.endsWith("Field Action"));
  const caption = kind === "Name" ? "Full name" : kind === "Email" ? "Email address" : "Password";
  const autoComplete = kind === "Password" ? "new-password" : kind === "Email" ? "email" : "name";
  /* `kind` names the field, not the control: name -> text, email -> email, and the
     password eye swaps only the password field into plain text. */
  const inputType =
    kind === "Email" ? "email" : kind === "Password" ? (visible ? "text" : "password") : "text";

  return (
    <div style={{ ...styleFor({ ...node, children: undefined }), display: "flex" }} data-pen-name={node.name}>
      {icon ? <Glyph node={icon} /> : null}
      <input
        id={`register-${kind.toLowerCase()}`}
        name={kind.toLowerCase()}
        type={inputType}
        placeholder={placeholder?.content}
        aria-label={caption}
        autoComplete={autoComplete}
        className="auth-input"
      />
      {action ? (
        <button
          type="button"
          className="auth-input-action"
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
      : name === "Register Login Prompt Link"
        ? "/login"
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
  const field = /^Register (Name|Email|Password) Field$/.exec(name);
  if (field && node.children) {
    return <TextField key={node.id} node={node} kind={field[1] as FieldKind} />;
  }

  if (name === "Register Role Options") {
    return (
      <div key={node.id} data-pen-name={name} style={style} role="radiogroup" aria-label="I am a">
        {node.children?.map((option, index) => (
          <label
            key={option.id}
            className="register-role"
            style={styleFor(option, false, node.layout, node.alignItems)}
          >
            <input
              type="radio"
              name="role"
              value={option.name?.replace(/ Register Role$/, "") ?? "role"}
              defaultChecked={index === 0}
              className="visually-hidden"
            />
            {option.children?.map((child) => renderNode(child, false, option.layout, option.alignItems))}
          </label>
        ))}
      </div>
    );
  }

  if (name === "Register Terms Checkbox") {
    return (
      <label key={node.id} data-pen-name={name} className="auth-checkbox" style={styleFor({ ...node, children: undefined })}>
        <input type="checkbox" name="terms" required />
        <Glyph node={node.children?.[0] ?? { ...node, type: "icon", icon: "check" }} />
      </label>
    );
  }

  if (name === "Register Primary Action") {
    return <PrimaryAction key={node.id} node={node} style={style} />;
  }

  if (name === "Google Register") {
    return (
      <button key={node.id} data-pen-name={name} type="button" className="auth-google" style={style}>
        {node.children?.map((child) => renderNode(child, false, node.layout, node.alignItems))}
      </button>
    );
  }

  const children = node.children?.map((child) => renderNode(child, false, node.layout, node.alignItems));

  if (name === "Register Form Card") {
    return (
      <RegisterForm key={node.id} name={name} style={style}>
        {children}
      </RegisterForm>
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
      className={isRoot ? "auth-canvas" : undefined}
    >
      {children}
    </div>
  );
}

/* The two branches of the tree that need RegisterPage's state: the form carries
   the submit handler and the feedback lines, the button carries the pending
   state. The terms checkbox keeps its native `required`, so the browser blocks
   the submit before either the handler or this component sees it. */
function RegisterForm({
  name,
  style,
  children,
}: {
  name: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const { onSubmit, error, notice } = useContext(RegisterFormContext);
  return (
    <form data-pen-name={name} className="auth-form" style={style} onSubmit={onSubmit}>
      {children}
      {error ? (
        <p className="auth-error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="auth-notice" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </form>
  );
}

function PrimaryAction({ node, style }: { node: PenNode; style: CSSProperties }) {
  const { pending } = useContext(RegisterFormContext);
  return (
    <button
      type="submit"
      className="auth-submit"
      style={style}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <span>Creating account…</span>
      ) : (
        node.children?.map((child) => renderNode(child, false, node.layout, node.alignItems))
      )}
    </button>
  );
}

export default function RegisterPage() {
  const frame = desktopRegisterFrame();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* Fields are uncontrolled - the pen tree owns their boxes - so values come off
     the submitted FormData under the names TextField and the role/terms branches
     set. Native validation has already enforced the required terms checkbox. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    /* The two tiles are one radio group. Their values are the learner types the
       mobile frame draws, which are NOT public.profiles.role - the DB trigger
       fixes that column to 'user'/'admin'. So the choice is sent as sign-up
       metadata and stored as given, keeping its own vocabulary. */
    const role = String(form.get("role") ?? "Student");

    if (!fullName || !email || !password) {
      setError("Fill in your name, email address and password to continue.");
      return;
    }

    setPending(true);
    const { data, error: signUpError } = await getBrowserClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signUpError) {
      setPending(false);
      setError(readableAuthError(signUpError.message));
      return;
    }

    /* Email confirmation may be ON for this project, and signUp reports the same
       success either way. A session means we can go straight in; no session means
       the account exists but cannot sign in until the link is followed, so that
       is the only honest thing to say. */
    if (!data.session) {
      setPending(false);
      setNotice("Account created. Check your email to confirm, then sign in.");
      return;
    }

    const userRole = await fetchCurrentUserRole();
    router.replace(dashboardPathFor(userRole));
    router.refresh();
  }

  /* The frame is a fixed 1440x1024 artboard. Scale it down rather than reflow it,
     so the composition holds on narrower viewports. */
  useEffect(() => {
    const fit = () => {
      const el = document.querySelector<HTMLElement>(".auth-canvas");
      if (!el) return;
      const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 1024, 1);
      el.style.zoom = String(scale);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <RegisterFormContext.Provider value={{ pending, error, notice, onSubmit: handleSubmit }}>
      <main className="auth-viewport">
        {renderNode(frame, true)}
        <DemoCredentials emailId="register-email" passwordId="register-password" />
      </main>
    </RegisterFormContext.Provider>
  );
}
