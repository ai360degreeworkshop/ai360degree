import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { icons } from "lucide-react";
import { SignOutButton } from "../../components/sign-out-button";
import design from "./admin-design.json";

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
  layout?: "vertical" | "none";
  gap?: number;
  padding?: number | number[];
  justifyContent?: "center" | "end" | "space_between";
  alignItems?: "center" | "end";
  fill?: string | { type: "image"; url: string; mode?: "fit" | "fill" };
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
  "": "AI 360° — Admin Dashboard",
  learners: "AI 360° — Learners",
  workshops: "AI 360° — Workshops",
  programs: "AI 360° — Programs",
  instructors: "AI 360° — Instructors",
  enquiries: "AI 360° — Enquiries",
  certificates: "AI 360° — Certificates",
  reports: "AI 360° — Reports",
} as const;

const navRoutes: Record<string, string> = {
  "Overview Navigation": "/admin",
  "Learners Navigation": "/admin/learners",
  "Workshops Navigation": "/admin/workshops",
  "Programs Navigation": "/admin/programs",
  "Instructors Navigation": "/admin/instructors",
  "Enquiries Navigation": "/admin/enquiries",
  "Certificates Navigation": "/admin/certificates",
  "Reports Navigation": "/admin/reports",
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

function styleFor(
  node: PenNode,
  isRoot = false,
  parentLayout?: PenNode["layout"],
  parentAlign?: PenNode["alignItems"],
): CSSProperties {
  const image = typeof node.fill === "object" ? node.fill : undefined;
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
    alignItems:
      node.alignItems === "end" ? "flex-end" : node.alignItems,
    overflow: node.clip ? "hidden" : undefined,
    backgroundColor:
      node.type !== "text" && node.type !== "icon" &&
      typeof node.fill === "string"
        ? node.fill
        : undefined,
    backgroundImage: image
      ? `url(/admin-assets/${image.url.replace(/^assets\//, "")})`
      : undefined,
    backgroundSize: image?.mode === "fit" ? "contain" : "cover",
    backgroundPosition: image ? "center" : undefined,
    backgroundRepeat: image ? "no-repeat" : undefined,
    borderRadius: edges(node.cornerRadius),
    boxShadow: node.effect
      ? `${node.effect.offset.x}px ${node.effect.offset.y}px ${node.effect.blur}px ${node.effect.color}`
      : undefined,
    color: typeof node.fill === "string" ? node.fill : undefined,
    fontFamily: node.fontFamily
      ? `'${node.fontFamily}', system-ui, sans-serif`
      : undefined,
    fontSize: px(node.fontSize),
    fontWeight: node.fontWeight,
    /* Pencil stores a unitless ratio (1.2) or absolute px; a bare ratio must stay
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

/* lucide renamed these glyphs after the design was drawn. */
const iconAliases: Record<string, string> = {
  "circle-help": "circle-question-mark",
  "play-circle": "circle-play",
  "building-2": "building-complex",
};

function pascalCase(value: string) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
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
    const Icon = icons[pascalCase(iconAliases[name] ?? name) as keyof typeof icons];
    return Icon ? (
      <Icon
        key={node.id}
        aria-hidden="true"
        color={typeof node.fill === "string" ? node.fill : "currentColor"}
        size={node.width}
        strokeWidth={(node.weight ?? 400) / 250}
        style={style}
      />
    ) : null;
  }

  const children = node.children?.map((child) =>
    renderNode(child, false, node.layout, node.alignItems),
  );

  /* Same placement as the learner sidebar: the pen file draws no sign-out
     control, so it is appended to the profile footer as a last child. */
  if (node.name === "Admin Profile") {
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
    className: isRoot ? "admin-canvas" : undefined,
    children,
  };

  return href ? <Link {...props} href={href} /> : <div {...props} />;
}

export function AdminPage({ slug }: { slug: string }) {
  const frameName = routes[slug as keyof typeof routes];
  const frame = (design.children as unknown as PenNode[]).find(
    (candidate) => candidate.name === frameName,
  );
  return frame ? (
    <main className="admin-viewport">{renderNode(frame, true)}</main>
  ) : null;
}

export const adminSlugs = Object.keys(routes);
export const isAdminSlug = (slug: string) => slug in routes;
