import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { icons } from "lucide-react";
import { SignOutButton } from "../../components/sign-out-button";
import design from "./user-design.json";

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
  fill?: string | { type: "image"; url: string; mode?: "fit" | "fill" } | GradientFill;
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
  effect?: {
    color: string;
    offset: { x: number; y: number };
    blur: number;
  };
};

const routes = {
  "": "AI 360° — Learner Dashboard",
  "my-learning": "AI 360° — My Learning",
  "live-sessions": "AI 360° — Live Sessions",
  projects: "AI 360° — Projects",
  certificates: "AI 360° — My Certificates",
  community: "AI 360° — Community",
  help: "AI 360° — Help Center",
} as const;

const navRoutes: Record<string, string> = {
  "Home User Navigation": "/user",
  "My learning User Navigation": "/user/my-learning",
  "Live sessions User Navigation": "/user/live-sessions",
  "Projects User Navigation": "/user/projects",
  "Certificates User Navigation": "/user/certificates",
  "Community User Navigation": "/user/community",
  "User Help Navigation": "/user/help",
};

const px = (value?: number | string) =>
  typeof value === "number" ? `${value}px` : value;

function edges(value?: number | number[]) {
  if (value == null) return undefined;
  return (Array.isArray(value) ? value : [value])
    .map((side) => `${side}px`)
    .join(" ");
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
    return node.type === "text" || node.type === "icon"
      ? {}
      : { backgroundColor: fill };
  }
  if (fill?.type === "image") {
    return {
      backgroundImage: `url(/user-assets/${fill.url.replace(/^assets\//, "")})`,
      backgroundSize: fill.mode === "fit" ? "contain" : "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  if (fill?.type === "gradient") {
    const stops = fill.colors
      .map((stop) => `${stop.color} ${stop.position * 100}%`)
      .join(", ");
    return {
      backgroundImage: `linear-gradient(${fill.rotation ?? 180}deg, ${stops})`,
    };
  }
  return {};
}

function styleFor(
  node: PenNode,
  isRoot = false,
  parentLayout?: PenNode["layout"],
  parentAlign?: PenNode["alignItems"],
): CSSProperties {
  const hasPositionedChildren = node.children?.some(
    (child) => child.x != null || child.y != null,
  );
  return {
    ...(node.width === "fill_container"
      ? parentLayout === "vertical"
        ? { width: "100%", minWidth: 0 }
        : { flex: "1 1 0", minWidth: 0 }
      : { width: px(node.width), flexShrink: 0 }),
    /* A child with no width of its own hugs its content in the design. A plain CSS
       column stretches it, so pin it to the start - unless the design centers the
       column itself, where stretching is exactly what keeps the child centered. */
    ...(node.width == null && parentLayout === "vertical" && parentAlign == null
      ? { alignSelf: "flex-start" as const }
      : {}),
    ...(node.height === "fill_container"
      ? parentLayout === "vertical"
        ? { flex: "1 1 0", minHeight: 0 }
        : { height: "100%", minHeight: 0 }
      : { height: px(node.height), flexShrink: 0 }),
    ...(node.type === "frame" && node.layout !== "none"
      ? {
          display: "flex",
          flexDirection: node.layout === "vertical" ? "column" : "row",
        }
      : {}),
    position:
      !isRoot && (node.x != null || node.y != null)
        ? "absolute"
        : hasPositionedChildren || node.layout === "none"
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
    borderRadius:
      node.type === "ellipse" ? "50%" : edges(node.cornerRadius),
    boxShadow: node.effect
      ? `${node.effect.offset.x}px ${node.effect.offset.y}px ${node.effect.blur}px ${node.effect.color}`
      : undefined,
    color: typeof node.fill === "string" ? node.fill : undefined,
    fontFamily: node.fontFamily
      ? `'${node.fontFamily}', system-ui, sans-serif`
      : undefined,
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
    whiteSpace: node.textGrowth === "fixed-width" ? "pre-wrap" : "nowrap",
    ...borderStyle(node),
  };
}

function pascalCase(value: string) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/* The design's layer names predate lucide v1, which renamed a few glyphs and
   dropped all brand marks. Map the old names onto what the installed set has. */
const iconAliases: Record<string, string> = {
  "circle-help": "circle-question-mark",
  "play-circle": "circle-play", "building-2": "building-complex" };

/* lucide carries no brand marks, so the one the design uses is inlined here. */
function BrandIcon({
  name,
  color,
  size,
  style,
}: {
  name: string;
  color: string;
  size?: number;
  style?: CSSProperties;
}) {
  if (name !== "linkedin") return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      width={size}
      height={size}
      style={style}
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4z" />
    </svg>
  );
}

function renderNode(
  node: PenNode,
  isRoot = false,
  parentLayout?: PenNode["layout"],
  parentAlign?: PenNode["alignItems"],
): ReactNode {
  const style = styleFor(node, isRoot, parentLayout, parentAlign);
  if (node.type === "text") {
    return (
      <div key={node.id} data-pen-name={node.name} style={style}>
        {node.content}
      </div>
    );
  }
  if (node.type === "icon") {
    const name = node.icon ?? "circle";
    const resolved = iconAliases[name] ?? name;
    const Icon = icons[pascalCase(resolved) as keyof typeof icons];
    return Icon ? (
      <Icon
        key={node.id}
        aria-hidden="true"
        color={typeof node.fill === "string" ? node.fill : "currentColor"}
        size={node.width}
        strokeWidth={(node.weight ?? 400) / 250}
        style={style}
      />
    ) : (
      <BrandIcon
        key={node.id}
        name={name}
        color={typeof node.fill === "string" ? node.fill : "currentColor"}
        size={typeof node.width === "number" ? node.width : undefined}
        style={style}
      />
    );
  }

  const children = node.children?.map((child) =>
    renderNode(child, false, node.layout, node.alignItems),
  );

  /* The pen file draws no sign-out control. The sidebar footer is where the
     signed-in identity already lives, so the button is appended there as a last
     child rather than given a frame of its own. */
  if (node.name === "Learner Profile") {
    return (
      <div key={node.id} data-pen-name={node.name} style={style}>
        {children}
        <SignOutButton />
      </div>
    );
  }

  const href = node.name ? navRoutes[node.name] : undefined;
  const props = {
    key: node.id,
    "data-pen-name": node.name,
    style,
    className: isRoot ? "dashboard-canvas" : undefined,
    children,
  };

  return href ? <Link {...props} href={href} /> : <div {...props} />;
}

export function DashboardPage({ slug }: { slug: string }) {
  const frameName = routes[slug as keyof typeof routes];
  const frame = (design.children as unknown as PenNode[]).find(
    (candidate) => candidate.name === frameName,
  );
  return frame ? (
    <main className="dashboard-viewport">{renderNode(frame, true)}</main>
  ) : null;
}

export const dashboardSlugs = Object.keys(routes);
export const isDashboardSlug = (slug: string) => slug in routes;
