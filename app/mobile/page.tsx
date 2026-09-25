import { type CSSProperties, type ReactNode } from "react";
import { icons } from "lucide-react";
import design from "./mobile-design.json";

type GradientFill = {
  type: "gradient";
  gradientType: "linear";
  enabled?: boolean;
  rotation?: number;
  colors: { color: string; position: number }[];
};

type PenNode = {
  id: string;
  type: "frame" | "text" | "icon" | "ellipse";
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
  fill?: string | GradientFill;
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

const iconAliases: Record<string, string> = {
  "circle-help": "circle-question-mark",
  "play-circle": "circle-play", "building-2": "building-complex" };

const pascalCase = (value: string) =>
  value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");

function Glyph({ node }: { node: PenNode }) {
  const name = node.icon ?? "circle";
  const Icon = icons[pascalCase(iconAliases[name] ?? name) as keyof typeof icons];
  return Icon ? (
    <Icon
      aria-hidden="true"
      color={typeof node.fill === "string" ? node.fill : "currentColor"}
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
  const positioned = node.children?.some((c) => c.x != null || c.y != null);
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
    position: !isRoot && (node.x != null || node.y != null) ? "absolute" : positioned ? "relative" : undefined,
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

/* The bottom bar is drawn in flow at the end of the artboard but is meant to stay
   on screen, so it is pinned instead. */
const BOTTOM_NAV = "Persistent Mobile App Bottom Navigation";

const hrefFor = (name: string) =>
  /log ?in|sign ?in/i.test(name) ? "/login" : undefined;

function renderNode(
  node: PenNode,
  isRoot = false,
  parentLayout?: PenNode["layout"],
  parentAlign?: PenNode["alignItems"],
): ReactNode {
  const name = node.name ?? "";
  const style = styleFor(node, isRoot, parentLayout, parentAlign);

  if (node.type === "text") {
    return (
      <div key={node.id} data-pen-name={name} style={style}>
        {node.content}
      </div>
    );
  }
  if (node.type === "icon") return <Glyph key={node.id} node={node} />;

  const children = node.children?.map((child) => renderNode(child, false, node.layout, node.alignItems));

  if (name === BOTTOM_NAV) {
    return (
      <nav key={node.id} data-pen-name={name} className="mobile-bottom-nav" style={style}>
        {children}
      </nav>
    );
  }

  const href = hrefFor(name);
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
      className={isRoot ? "mobile-canvas" : undefined}
    >
      {children}
    </div>
  );
}

export default function MobileHome() {
  const frame = design as unknown as PenNode;
  return <main className="mobile-viewport">{renderNode(frame, true)}</main>;
}
