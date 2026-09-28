#!/usr/bin/env python3
"""Port desktop homepage content into the mobile homepage shell.

Keeps the mobile app layout (header, hero, bottom nav, footer, FAQ, curriculum,
faculty, add-on, learning process) and replaces the mobile-era content that came
from the old artboard with the desktop content set.
"""
import base64
import os
import re
import sys

# The script lives in tools/ but every path it touches (the two homepage files,
# the tool icons, the poster) is relative to public/. Resolve to public/ so it
# can be run from anywhere.
_PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, "public")
os.chdir(os.path.normpath(_PUBLIC))

SRC = "mobile-homepage.html"
DESK = "schoolai-homepage.html"

# NOTE: the pen.dev export puts font stacks in double quotes, which is why every
# style attribute in this file MUST be single-quoted. A double-quoted style whose
# value contains a `"` is truncated by the HTML parser at that point, silently
# dropping every declaration after it (font-size, weight, line-height, width...).
# The build asserts this below.
GROTESK = '"Space Grotesk", system-ui, sans-serif'
PLEX = '"IBM Plex Sans", system-ui, sans-serif'
MONO = '"IBM Plex Mono", system-ui, sans-serif'

# --------------------------------------------------------------------------
# data
# --------------------------------------------------------------------------
TRACKS = [
    ("01 · CONTENT", "Content Creation", "#31983d",
     "Create video, image and text content with AI.",
     [("claude", "Claude"), ("chatgpt", "ChatGPT"), ("gemini", "Gemini"),
      ("higgsfield", "Higgsfield"), ("kling", "Kling"), ("flow", "Flow")]),
    ("02 · FINANCE", "Finance &amp; Trading", "#178a88",
     "Use AI for market research, analysis and trades.",
     [("chatgpt", "ChatGPT Schedule"), ("claude", "Claude Skills")]),
    ("03 · DESIGN", "UX / UI Design", "#6756d8",
     "Design, prototype and critique interfaces with AI.",
     [("pen", "Pen.app"), ("claude", "Claude Design"), ("chatgpt", "ChatGPT")]),
    ("04 · MARKETING", "Digital Marketing", "#5d7da7",
     "Run campaigns, SEO and content at AI speed.",
     [("chatgpt", "ChatGPT"), ("claude", "Claude"), ("leadsgorilla", "Lead Gorilla"),
      ("semrush", "Semrush"), ("ahrefs", "Ahrefs"), ("ubersuggest", "Ubersuggest"),
      ("moz", "Moz")]),
    ("05 · SALES", "Sales &amp; Lead Gen", "#234f7d",
     "Find, qualify and reach leads with AI.",
     [("leadsgorilla", "Lead Gorilla"), ("aimfox", "Aimfox"), ("hunter", "Hunter")]),
]

AUDIENCE = [
    ("01 · STUDENT", "Student Development", "#31983d",
     "Research better, think clearly and present ideas that stand out.",
     "Explore the student program"),
    ("02 · FACULTY", "Faculty Development", "#6756d8",
     "Build repeatable AI workflows for lesson planning, teaching material and assessment.",
     "Explore the faculty program"),
    ("03 · MANAGEMENT", "Management Development", "#234f7d",
     "Automate operations, document processes and lead AI adoption.",
     "Explore the management program"),
]

FEATURES = [
    ("Live sessions", "Learn in real time",
     ('<circle cx="12" cy="12" r="9"/>', '<path d="M10 8.5l5 3.5-5 3.5z"/>')),
    ("Mentor-led", "Ask. Build. Improve.",
     ('<circle cx="12" cy="8" r="3.4"/>', '<path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"/>')),
    ("Online", "Join from anywhere",
     ('<circle cx="12" cy="12" r="9"/>',
      '<path d="M3 12h18"/>',
      '<path d="M12 3c2.6 2.6 2.6 15.4 0 18"/>',
      '<path d="M12 3c-2.6 2.6-2.6 15.4 0 18"/>')),
    ("Practical", "Work on real tasks",
     ('<path d="M15.5 4.5a4.6 4.6 0 0 0-6 6L4 16v4h4l5.5-5.5a4.6 4.6 0 0 0 6-6l-2.6 2.6-2.9-.7-.7-2.9z"/>',)),
    ("Outcome-driven", "Leave with output",
     ('<circle cx="12" cy="12" r="8.5"/>',
      '<circle cx="12" cy="12" r="4.6"/>',
      '<circle cx="12" cy="12" r="1"/>')),
]

STAGES = [("01", "AI explorer"), ("02", "AI user"), ("03", "AI practitioner"),
          ("04", "AI builder"), ("05", "AI-confident leader")]

TOOL_SLIDER = [("chatgpt", "ChatGPT"), ("claude", "Claude"), ("gemini", "Gemini"),
               ("n8n", "n8n"), ("notebooklm", "NotebookLM"), ("aistudio", "AI Studio"),
               ("bibliometrix", "Bibliometrix"), ("rayyan", "Rayyan"), ("zotero", "Zotero")]

EDU_AUDIENCES = ["Schools", "Colleges", "Universities"]

# --------------------------------------------------------------------------
# markup helpers (pen.dev export style: <tag on its own line, attrs indented)
# --------------------------------------------------------------------------
# Every style attribute is written single-quoted. pen.dev emits font stacks as
# `font-family: "Space Grotesk", ...`; inside a double-quoted attribute that
# inner `"` ends the value early and the parser silently discards the rest of
# the declarations. SQ keeps the single quote while the f-strings stay single
# quoted themselves.
SQ = "'"


def D(name, style, inner, ind=6):
    p = " " * ind
    return (f'{p}<div\n{p}  data-pencil-name="{name}"\n{p}  style={SQ}{style}{SQ}\n'
            f'{p}>\n{inner}{p}</div>\n')


def T(name, style, text, ind=6):
    p = " " * ind
    return (f'{p}<div\n{p}  data-pencil-name="{name}"\n{p}  style={SQ}{style}{SQ}\n'
            f'{p}>\n{p}  {text}\n{p}</div>\n')


def A(name, style, inner, ind=6, href="#"):
    p = " " * ind
    return (f'{p}<a\n{p}  data-pencil-name="{name}"\n{p}  href="{href}"\n'
            f'{p}  style={SQ}{style}{SQ}\n{p}>\n{inner}{p}</a>\n')


def IMG(name, style, src, alt, ind=6):
    p = " " * ind
    return (f'{p}<img\n{p}  data-pencil-name="{name}"\n{p}  src="{src}"\n'
            f'{p}  alt="{alt}"\n{p}  style={SQ}{style}{SQ}\n{p}/>\n')


def SVG(name, style, shapes, ind=6, color="#6756d8", fill="none"):
    """shapes: tuple of complete child elements, e.g. ('<circle .../>', '<path .../>').

    They are children of <svg>, never interpolated into an attribute — an icon
    with two shapes put into d="..." would truncate at its first inner quote,
    the same failure the single-quoted styles above exist to avoid. Stroke and
    fill live on <svg> and are inherited by every child.
    """
    p = " " * ind
    body = "".join(f"{p}  {s}\n" for s in shapes)
    return (f'{p}<svg\n{p}  data-pencil-name="{name}"\n{p}  viewBox="0 0 24 24"\n'
            f'{p}  preserveAspectRatio="xMidYMid meet"\n'
            f'{p}  xmlns="http://www.w3.org/2000/svg"\n'
            f'{p}  fill="{fill}"\n{p}  stroke="{color}"\n'
            f'{p}  stroke-width="1.6"\n{p}  stroke-linecap="round"\n'
            f'{p}  stroke-linejoin="round"\n{p}  style={SQ}{style}{SQ}\n'
            f'{p}>\n{body}{p}</svg>\n')


def SEC(name, style, inner, ind=6):
    p = " " * ind
    return (f'{p}<section\n{p}  data-pencil-name="{name}"\n{p}  style={SQ}{style}{SQ}\n'
            f'{p}>\n{inner}{p}</section>\n')


def section_style(bg, gap, pad="52px 20px"):
    return (f"align-items: flex-start; background-color: {bg}; box-sizing: border-box; "
            f"display: flex; flex-direction: column; flex-shrink: 0; gap: {gap}; "
            f"height: auto; justify-content: flex-start; padding: {pad}; "
            f"position: relative; width: 100%")


def h_title(name, text):
    return T(name, f'box-sizing: border-box; color: #102019; font-family: {GROTESK}; '
                   f'font-size: 32px; font-style: normal; font-weight: 600; '
                   f'letter-spacing: 0px; line-height: 36px; text-align: left; '
                   f'width: 100%', text)


def h_desc(name, text):
    return T(name, f'box-sizing: border-box; color: #66756d; font-family: {PLEX}; '
                   f'font-size: 14px; font-style: normal; font-weight: 400; '
                   f'letter-spacing: 0px; line-height: 21px; text-align: left; '
                   f'width: 100%', text)


CARD = ("align-items: flex-start; background-color: #ffffff; border-radius: 15px; "
        "border: 1px solid #dfe5e0; box-sizing: border-box; display: flex; "
        "flex-direction: column; flex-shrink: 0; gap: 13px; height: auto; "
        "justify-content: flex-start; padding: 18px; width: 100%")

DATABOX = ("align-items: center; border-radius: 9px; box-sizing: border-box; "
           "display: flex; flex-direction: column; flex: 1 1 0; gap: 6px; "
           "height: auto; justify-content: center; padding: 10px 6px")


# --------------------------------------------------------------------------
# sections
# --------------------------------------------------------------------------
def sec_learning_experience(z):
    rows = []
    for i, (title, desc, paths) in enumerate(FEATURES):
        badge = D(f"{title} Mobile Feature Icon Box",
                  "align-items: center; background-color: #f0edff; border-radius: 11px; "
                  "box-sizing: border-box; display: flex; flex-direction: row; "
                  "flex-shrink: 0; gap: 0px; height: 40px; justify-content: center; width: 40px",
                  SVG(f"{title} Mobile Feature Icon",
                      "box-sizing: border-box; flex-shrink: 0; height: 20px; width: 20px",
                      paths, ind=12), ind=10)
        copy = D(f"{title} Mobile Feature Copy",
                 "align-items: flex-start; box-sizing: border-box; display: flex; "
                 "flex-direction: column; flex: 1 1 0; gap: 3px; height: auto; "
                 "justify-content: flex-start",
                 T(f"{title} Mobile Feature Title",
                   f'box-sizing: border-box; color: #203029; font-family: {GROTESK}; '
                   f'font-size: 17px; font-weight: 600; line-height: normal; '
                   f'text-align: left; white-space: nowrap', title, ind=12)
                 + T(f"{title} Mobile Feature Description",
                     f'box-sizing: border-box; color: #718078; font-family: {PLEX}; '
                     f'font-size: 12px; font-weight: 400; line-height: 18px; '
                     f'text-align: left; width: 100%', desc, ind=12), ind=10)
        rows.append(D(f"{title} Mobile Feature",
                      "align-items: center; box-sizing: border-box; display: flex; "
                      "flex-direction: row; flex-shrink: 0; gap: 12px; height: auto; "
                      "justify-content: flex-start; width: 100%",
                      badge + copy, ind=8))
    return SEC("Mobile Learning Experience",
               section_style("#fbfcfa", "14px") + f"; z-index: {z}",
               "".join(rows))


def sec_tool_slider(z):
    items = []
    for slug, label in TOOL_SLIDER:
        items.append(D(f"{label} Mobile Slider Item",
                       "align-items: center; box-sizing: border-box; display: flex; "
                       "flex-direction: column; flex-shrink: 0; gap: 6px; "
                       "height: auto; justify-content: center; width: 74px",
                       IMG(f"{label} Mobile Slider Logo",
                           "border-radius: 8px; box-sizing: border-box; height: 30px; "
                           "object-fit: contain; width: 30px",
                           f"tool-icons/{slug}.png", label, ind=12)
                       + T(f"{label} Mobile Slider Name",
                           f'box-sizing: border-box; color: #66756d; font-family: {PLEX}; '
                           f'font-size: 10px; font-weight: 500; line-height: normal; '
                           f'text-align: center; width: 100%', label, ind=12), ind=10))
    track = D("Mobile Logo Track",
              "align-items: center; box-sizing: border-box; display: flex; "
              "flex-direction: row; flex-shrink: 0; gap: 16px; height: auto; "
              "justify-content: flex-start; overflow-x: auto; padding: 2px 0px; "
              "width: 100%; scrollbar-width: none; -ms-overflow-style: none",
              "".join(items), ind=8)
    return SEC("Mobile Tool Logo Slider",
               section_style("#ffffff", "18px") + f"; z-index: {z}",
               h_title("Mobile Tool Slider Title", "Tools we work with")
               + h_desc("Mobile Tool Slider Description",
                        "The same tools teams already use — taught properly, not skimmed.") + track)


def sec_promo_video(z):
    poster = IMG("Mobile Promotional Video Poster",
                 "border-radius: 14px; box-sizing: border-box; height: 200px; "
                 "object-fit: cover; width: 100%", "promo-poster.jpg",
                 "AI 360° workshop in progress", ind=12)
    overlay = D("Mobile Video Image Overlay",
                "background: linear-gradient(180deg, rgba(11,26,18,0.10) 0%, "
                "rgba(11,26,18,0.72) 100%); border-radius: 14px; box-sizing: border-box; "
                "height: 200px; left: 0px; position: absolute; top: 0px; width: 100%",
                "", ind=12)
    badge = D("Mobile Video Duration Badge",
              "align-items: center; background-color: #ffffff; border-radius: 16777200px; "
              "box-sizing: border-box; display: flex; flex-direction: row; gap: 6px; "
              "height: fit-content; justify-content: flex-start; left: 12px; "
              "padding: 7px 11px; position: absolute; top: 12px",
              D("Mobile Live Dot",
                "background-color: #31983d; border-radius: 16777200px; box-sizing: border-box; "
                "height: 7px; width: 7px", "", ind=16)
              + T("Mobile Video Duration",
                  f'box-sizing: border-box; color: #102019; font-family: {MONO}; '
                  f'font-size: 10px; font-weight: 700; letter-spacing: 1.2px; '
                  f'white-space: nowrap', "2 MIN WATCH", ind=16), ind=12)
    play = D("Mobile Video Play Button",
             "align-items: center; background-color: #ffffff; border-radius: 16777200px; "
             "box-sizing: border-box; display: flex; flex-direction: row; height: 56px; "
             "justify-content: center; left: 50%; margin-left: -28px; margin-top: -28px; "
             "position: absolute; top: 50%; width: 56px",
             SVG("Mobile Video Play Icon",
                 "box-sizing: border-box; flex-shrink: 0; height: 22px; width: 22px",
                 ('<path d="M10 8l7 4-7 4z"/>',), ind=16,
                 color="#102019", fill="#102019"), ind=12)
    poster_box = D("Mobile Promotional Video Poster Box",
                   "border-radius: 14px; box-sizing: border-box; height: 200px; "
                   "overflow: hidden; position: relative; width: 100%",
                   poster + overlay + badge + play, ind=8)

    caption = D("Mobile Video Caption",
                "align-items: flex-start; box-sizing: border-box; display: flex; "
                "flex-direction: column; gap: 8px; height: auto; justify-content: flex-start; "
                "width: 100%",
                T("Mobile Video Caption Eyebrow",
                  f'box-sizing: border-box; color: #31983d; font-family: {MONO}; '
                  f'font-size: 11px; font-weight: 700; letter-spacing: 1.6px; '
                  f'text-align: left; white-space: nowrap', "CLASSROOM &rarr; CAREER", ind=12)
                + T("Mobile Video Caption Title",
                    f'box-sizing: border-box; color: #102019; font-family: {GROTESK}; '
                    f'font-size: 22px; font-weight: 600; line-height: 28px; '
                    f'text-align: left; width: 100%',
                    "From curious questions to confident outcomes.", ind=12)
                + T("Mobile Video Caption Description",
                    f'box-sizing: border-box; color: #66756d; font-family: {PLEX}; '
                    f'font-size: 13px; font-weight: 400; line-height: 20px; '
                    f'text-align: left; width: 100%',
                    "Real people. Live mentorship. Practical projects.", ind=12), ind=8)

    tags = []
    for lbl in ("FOR STUDENTS", "FOR PROFESSIONALS"):
        tags.append(T(f"Mobile {lbl} Tag Text",
                      f'box-sizing: border-box; color: #234f7d; font-family: {MONO}; '
                      f'font-size: 10px; font-weight: 700; letter-spacing: 1.2px; '
                      f'white-space: nowrap', lbl, ind=14))
    tag_row = D("Mobile Video Audience Tags",
                "align-items: center; box-sizing: border-box; display: flex; "
                "flex-direction: row; gap: 8px; height: auto; justify-content: flex-start; "
                "width: 100%",
                "".join(
                    D(f"Mobile Video Tag {i}",
                      "align-items: center; background-color: #f0edff; "
                      "border: 1px solid #d8d1fa; border-radius: 16777200px; "
                      "box-sizing: border-box; display: flex; flex-direction: row; "
                      "height: auto; justify-content: center; padding: 7px 12px",
                      t, ind=12)
                    for i, t in enumerate(tags)), ind=12)

    progress = D("Mobile Video Progress Track",
                 "background-color: #e6ebe6; border-radius: 16777200px; "
                 "box-sizing: border-box; height: 4px; overflow: hidden; width: 100%",
                 D("Mobile Video Progress",
                   "background-color: #31983d; border-radius: 16777200px; "
                   "box-sizing: border-box; height: 4px; width: 38%", "", ind=12), ind=12)

    header = D("Mobile Video Section Header",
               "align-items: flex-start; box-sizing: border-box; display: flex; "
               "flex-direction: column; gap: 10px; height: auto; justify-content: flex-start; "
               "width: 100%",
               h_title("Mobile Video Section Title",
                       "See what practical AI learning looks like.")
               + h_desc("Mobile Video Section Description",
                        "A quick look at how students and professionals learn, practise and "
                        "build with AI at School of AI."), ind=8)

    return SEC("Mobile Promotional Video Section",
               section_style("#ffffff", "20px") + f"; z-index: {z}",
               header + poster_box + caption + tag_row + progress)


def sec_audience(z):
    cards = []
    for i, (eyebrow, title, accent, desc, cta) in enumerate(AUDIENCE):
        head = D(f"{title} Mobile Audience Eyebrow",
                 f'box-sizing: border-box; color: {accent}; font-family: {MONO}; '
                 f'font-size: 11px; font-weight: 700; letter-spacing: 1.4px; '
                 f'text-align: left; white-space: nowrap', eyebrow, ind=12)
        body = (head
                + T(f"{title} Mobile Audience Title",
                    f'box-sizing: border-box; color: #203029; font-family: {GROTESK}; '
                    f'font-size: 21px; font-weight: 600; line-height: 26px; '
                    f'text-align: left; width: 100%', title, ind=12)
                + T(f"{title} Mobile Audience Description",
                    f'box-sizing: border-box; color: #718078; font-family: {PLEX}; '
                    f'font-size: 13px; font-weight: 400; line-height: 20px; '
                    f'text-align: left; width: 100%', desc, ind=12)
                + A(f"{title} Mobile Audience Action",
                    f'align-items: center; box-sizing: border-box; display: flex; '
                    f'flex-direction: row; gap: 6px; min-height: 44px; '
                    f'justify-content: flex-start; text-decoration: none',
                    T(f"{title} Mobile Audience Action Label",
                      f'box-sizing: border-box; color: {accent}; font-family: {GROTESK}; '
                      f'font-size: 14px; font-weight: 600; text-align: left; '
                      f'white-space: nowrap', cta, ind=16), ind=12))
        cards.append(D(f"{title} Mobile Audience Card", CARD, body, ind=8))
    return SEC("Mobile Audience Paths",
               section_style("#fbfcfa", "16px") + f"; z-index: {z}",
               h_title("Mobile Audience Title", "Learn for class. Apply at work.")
               + h_desc("Mobile Audience Subtitle",
                        "Whether you&rsquo;re building your first AI skill or upgrading how "
                        "you work, start with the path that feels like you.")
               + "".join(cards))


def sec_tracks(z):
    cards = []
    for eyebrow, title, accent, desc, tools in TRACKS:
        cells = []
        for slug, label in tools:
            cells.append(D(f"{label} Mobile Track Tool",
                           "align-items: center; box-sizing: border-box; display: flex; "
                           "flex-direction: row; flex-shrink: 0; gap: 8px; height: auto; "
                           "justify-content: flex-start; width: 100%",
                           IMG(f"{label} Mobile Track Tool Logo",
                               "border-radius: 7px; box-sizing: border-box; height: 24px; "
                               "object-fit: contain; width: 24px",
                               f"tool-icons/{slug}.png", label, ind=14)
                           + T(f"{label} Mobile Track Tool Label",
                               f'box-sizing: border-box; color: #203029; font-family: {GROTESK}; '
                               f'font-size: 12px; font-weight: 500; line-height: 15px; '
                               f'text-align: left; flex: 1 1 0', label, ind=14), ind=12))
        grid = D(f"{title} Mobile Track Tools",
                 "align-items: flex-start; box-sizing: border-box; display: grid; "
                 "grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 8px; "
                 "height: auto; justify-content: flex-start; width: 100%",
                 "".join(cells), ind=10)
        body = (T(f"{title} Mobile Track Eyebrow",
                  f'box-sizing: border-box; color: {accent}; font-family: {MONO}; '
                  f'font-size: 11px; font-weight: 700; letter-spacing: 1.4px; '
                  f'text-align: left; white-space: nowrap', eyebrow, ind=12)
                + T(f"{title} Mobile Track Title",
                    f'box-sizing: border-box; color: #203029; font-family: {GROTESK}; '
                    f'font-size: 21px; font-weight: 600; line-height: 26px; '
                    f'text-align: left; width: 100%', title, ind=12)
                + T(f"{title} Mobile Track Description",
                    f'box-sizing: border-box; color: #718078; font-family: {PLEX}; '
                    f'font-size: 13px; font-weight: 400; line-height: 20px; '
                    f'text-align: left; width: 100%', desc, ind=12)
                + D("Mobile Track Rule",
                    "background-color: #e6ebe6; box-sizing: border-box; height: 1px; "
                    "width: 100%", "", ind=12)
                + grid)
        cards.append(D(f"{title} Mobile Track Card",
                       CARD + f"; border-top: 4px solid {accent}", body, ind=8))
    return SEC("Mobile What We Teach",
               section_style("#fbfcfa", "16px") + f"; z-index: {z}",
               h_title("Mobile What We Teach Title", "Five tracks. Real tools. Three hours.")
               + h_desc("Mobile What We Teach Description",
                        "One 3-hour session &mdash; the exact mix of tools is tailored to your "
                        "group, from first-time users to power users. No one is left behind, "
                        "and no one is held back.")
               + "".join(cards))


def sec_from_curious(z):
    buttons = []
    for i, (num, label) in enumerate(STAGES):
        active = (num == "04")
        buttons.append(D(f"Mobile Stage {num} Button",
                         "align-items: center; box-sizing: border-box; display: flex; "
                         "flex-direction: row; flex-shrink: 0; gap: 7px; height: auto; "
                         "justify-content: flex-start; padding: 9px 13px; "
                         "border-radius: 16777200px; "
                         + ("background-color: #102019; border: 1px solid #102019"
                            if active else
                            "background-color: #ffffff; border: 1px solid #dfe5e0"),
                         T(f"Mobile Stage {num} Number",
                           f'box-sizing: border-box; font-family: {MONO}; font-size: 10px; '
                           f'font-weight: 700; letter-spacing: 1px; white-space: nowrap; '
                           f'color: ' + ("#8fd39a" if active else "#a8b3ab"),
                           num, ind=12)
                         + T(f"Mobile Stage {num} Label",
                           f'box-sizing: border-box; font-family: {GROTESK}; font-size: 13px; '
                           f'font-weight: 600; white-space: nowrap; color: '
                           + ("#ffffff" if active else "#203029"),
                           label, ind=12), ind=10))
    tabs = D("Mobile Stage Buttons",
             "align-items: center; box-sizing: border-box; display: flex; "
             "flex-direction: row; flex-shrink: 0; gap: 8px; height: auto; "
             "justify-content: flex-start; overflow-x: auto; width: 100%; "
             "scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px",
             "".join(buttons), ind=8)
    panel = D("Mobile Stage Panel",
              CARD,
              T("Mobile Stage Eyebrow",
                f'box-sizing: border-box; color: #31983d; font-family: {MONO}; '
                f'font-size: 11px; font-weight: 700; letter-spacing: 1.4px; '
                f'white-space: nowrap', "STAGE 4 OF 5", ind=12)
              + T("Mobile Stage Title",
                  f'box-sizing: border-box; color: #203029; font-family: {GROTESK}; '
                  f'font-size: 22px; font-weight: 600; line-height: 27px; '
                  f'text-align: left; width: 100%', "AI builder", ind=12)
              + T("Mobile Stage Description",
                  f'box-sizing: border-box; color: #718078; font-family: {PLEX}; '
                  f'font-size: 13px; font-weight: 400; line-height: 20px; '
                  f'text-align: left; width: 100%',
                  "Builds useful workflows, projects and applications.", ind=12), ind=8)
    goal = T("Mobile Stage Goal",
             f'box-sizing: border-box; color: #66756d; font-family: {PLEX}; font-size: 13px; '
             f'font-style: italic; font-weight: 400; line-height: 20px; text-align: left; '
             f'width: 100%',
             "The goal is not a new title. It is more confidence in class, more capability at "
             "work and better output everywhere.", ind=8)
    return SEC("Mobile From AI Curious",
               section_style("#ffffff", "18px") + f"; z-index: {z}",
               h_title("Mobile Curious Title",
                       "From AI-curious to AI-capable &mdash; for study, work and everything next.")
               + tabs + panel + goal)


def sec_bring_ai(z):
    tiles = "".join(
        D(f"{name} Mobile Audience Tile",
          "align-items: center; background-color: #f0edff; border: 1px solid #d8d1fa; "
          "border-radius: 10px; box-sizing: border-box; display: flex; flex-direction: row; "
          "gap: 9px; height: auto; justify-content: flex-start; padding: 13px; width: 100%",
          T(f"{name} Mobile Audience Tile Label",
            f'box-sizing: border-box; color: #102019; font-family: {GROTESK}; font-size: 15px; '
            f'font-weight: 600; text-align: left; white-space: nowrap', name, ind=14), ind=10)
        for name in EDU_AUDIENCES)
    btns = "".join(
        A(f"Mobile {lbl} Button",
          "align-items: center; border-radius: 12px; box-sizing: border-box; display: flex; "
          "flex-direction: row; height: 50px; justify-content: center; text-decoration: none; "
          "width: 100%; " + style,
          T(f"Mobile {lbl} Button Label",
            f'box-sizing: border-box; font-family: {GROTESK}; font-size: 16px; font-weight: 600; '
            f'text-align: center; white-space: nowrap; color: {fg}', lbl, ind=14), ind=10)
        for lbl, style, fg in (
            ("Plan a workshop", "background-color: #102019; border: 1px solid #102019", "#ffffff"),
            ("Discuss your audience", "background-color: #ffffff; border: 1px solid #dfe5e0", "#203029"),
        ))
    return SEC("Mobile Final CTA",
               section_style("#fbfcfa", "18px") + f"; z-index: {z}",
               T("Mobile Final CTA Title",
                 f'box-sizing: border-box; color: #102019; font-family: {GROTESK}; font-size: 30px; '
                 f'font-weight: 600; line-height: 36px; text-align: left; width: 100%',
                 "Bring practical AI to your campus or organisation.", ind=8)
               + h_desc("Mobile Final CTA Description",
                        "Live workshops designed for students, educators, professionals and "
                        "teams &mdash; grounded in the work they actually need to do.")
               + btns + tiles)


# --------------------------------------------------------------------------
# splice
# --------------------------------------------------------------------------
def find_block(lines, attr_line):
    """attr_line is 1-based line holding the data-pencil-name of the section."""
    opener = next(i for i in range(attr_line - 1, 0, -1)
                  if lines[i - 1].strip().startswith("<div"))
    d = 0
    for i in range(opener - 1, len(lines)):
        d += lines[i].count("<div") - lines[i].count("</div>")
        if d == 0 and i > opener - 1:
            return opener, i + 1      # 1-based inclusive start, exclusive end
    raise SystemExit(f"unbalanced block at {attr_line}")


def main():
    src = open(SRC, encoding="utf-8").read()

    # This script is not idempotent: it splices the desktop content into the
    # original artboard. Running it on its own output would splice a second time.
    # Restore the pre-port artboard first.
    if "Mobile What We Teach" in src or "Mobile Learning Experience" in src:
        raise SystemExit(
            f"{SRC} already contains the ported sections.\n"
            f"Restore the pre-port artboard first:\n"
            f"    cp tools/mobile-homepage.html.bak public/{SRC}\n"
            f"then re-run this script.")

    lines = src.split("\n")

    # 1. video poster -> real file
    desk = open(DESK, encoding="utf-8").read()
    m = re.search(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)", desk)
    if not m:
        raise SystemExit("no poster found on desktop")
    with open("promo-poster.jpg", "wb") as fh:
        fh.write(base64.b64decode(m.group(1)))
    print("wrote promo-poster.jpg")

    starts = {
        "Impact Formula": 153, "Audience Paths": 372, "What We Teach": 619,
        "Community": 2078, "Final CTA": 2399,
    }
    blocks = {k: find_block(lines, v) for k, v in starts.items()}
    for k, v in blocks.items():
        print(f"  {k:18} lines {v[0]}..{v[1] - 1}")

    # 2. z-index continuation past the highest existing value
    z = 20
    # Mobile Impact Formula lived INSIDE the Mobile Hero box (Hero is a fixed
    # 650px tall column). Dropping three full sections into that slot buries
    # them inside Hero, where its fixed height clips everything past 650px.
    # Delete the nested block, then splice these three in as artboard siblings
    # immediately AFTER Hero so they land in the page's normal flow.
    hero_extras = (sec_learning_experience(z) + sec_tool_slider(z + 1)
                   + sec_promo_video(z + 2))
    repl = {
        "Impact Formula": "",
        "Audience Paths": sec_audience(z + 3),
        "What We Teach": sec_tracks(z + 4),
        "Community": sec_from_curious(z + 5),
        "Final CTA": sec_bring_ai(z + 6),
    }

    # apply bottom-up so earlier line numbers stay valid
    for key in sorted(blocks, key=lambda k: blocks[k][0], reverse=True):
        s, e = blocks[key]
        body = repl[key]
        # an empty replacement deletes the block rather than leaving a blank line
        lines[s - 1:e] = body.rstrip("\n").split("\n") if body.strip() else []

    # Hero must be located AFTER the splice, since that shifted every line number
    hero_attr = next(i for i, l in enumerate(lines, 1)
                     if 'data-pencil-name="Mobile Hero"' in l)
    _, hero_end = find_block(lines, hero_attr)
    lines[hero_end:hero_end] = hero_extras.rstrip("\n").split("\n")

    out = "\n".join(lines)

    # 2b. Hero loses the Impact Formula that used to fill its tail, so its fixed
    # 650px height would leave dead space. Let it hug its own content.
    out = out.replace(
        "gap: 20px; height: 650px; justify-content: flex-start;",
        "gap: 20px; height: auto; justify-content: flex-start;", 1)

    # 3. root artboard: fixed 8393px height + overflow hidden clipped new sections
    out = out.replace(
        "gap: 0px; height: 8393px; justify-content: flex-start; overflow: hidden",
        "gap: 0px; height: auto; justify-content: flex-start; overflow: visible", 1)

    # 4. old-artboard naming + content fixes
    out = out.replace("Vio Add-on Tool", "Veo Add-on Tool")
    out = out.replace('data-pencil-name="Vio"', 'data-pencil-name="Veo"')
    out = re.sub(r"(>)\s*Vio\s*(<)", r"\1Veo\2", out)

    # 5. hide scrollbars on the two horizontal tracks
    out = out.replace(
        "</style>",
        '      [data-pencil-name="Mobile Logo Track"]::-webkit-scrollbar,\n'
        '      [data-pencil-name="Mobile Stage Buttons"]::-webkit-scrollbar {\n'
        "        display: none;\n      }\n    </style>", 1)

    # ---------------------------------------------------------------- verify
    # Verified BEFORE writing, so a failed build never clobbers the good file.
    chk = out.split("\n")
    fail = []

    # (a) tag structure via a real parser, not div counting
    from html.parser import HTMLParser

    class Check(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.stack, self.errors, self.junk = [], [], []
            self.styled = 0

        def handle_starttag(self, tag, attrs):
            names = [a for a, _ in attrs]
            if tag not in ("img", "br", "hr", "meta", "link", "input"):
                self.stack.append((tag, self.getpos()[0]))
            if "style" in names:
                self.styled += 1
                val = dict(attrs)["style"] or ""
                # THE regression this guard exists for: a double-quoted style
                # holding `font-family: "X"` is cut at that quote, losing every
                # declaration after it. A style with a family but no size is it.
                if "font-family:" in val and "font-size:" not in val:
                    self.errors.append((self.getpos()[0], val[-60:]))
            for n in names:
                if n in ("Grotesk", "Plex", "Grotesk\\", "sans-serif"):
                    self.junk.append((self.getpos()[0], n))

        def handle_endtag(self, tag):
            if tag in ("img", "br", "hr", "meta", "link", "input"):
                return
            if not self.stack:
                self.errors.append((self.getpos()[0], f"stray </{tag}>"))
            elif self.stack[-1][0] != tag:
                self.errors.append((self.getpos()[0], f"</{tag}> closes <{self.stack[-1][0]}>"))
                self.stack.pop()
            else:
                self.stack.pop()

    c = Check()
    c.feed(out)
    if c.stack:
        fail.append(f"{len(c.stack)} unclosed tags, first {c.stack[0]}")
    if c.errors:
        fail.append(f"{len(c.errors)} parser errors, first {c.errors[0]}")
    if c.junk:
        fail.append(f"{len(c.junk)} leaked-token attributes (quote bug), first {c.junk[0]}")

    # (b) the sections ported in must actually be styled, not blank
    for name in ("Mobile Learning Experience", "Mobile Tool Logo Slider",
                 "Mobile Promotional Video Section", "Mobile Audience Paths",
                 "Mobile What We Teach", "Mobile From AI Curious", "Mobile Final CTA"):
        if name not in out:
            fail.append(f"section missing: {name}")

    # (c) those three must be artboard siblings. If they end up inside Hero they
    # still parse and still contain their text, but Hero's box clips them, so
    # only a structural check catches it.
    olines = out.split("\n")
    h_attr = next(i for i, l in enumerate(olines, 1)
                  if 'data-pencil-name="Mobile Hero"' in l)
    _, h_end = find_block(olines, h_attr)
    hero_txt = "\n".join(olines[h_attr - 1:h_end])
    for name in ("Mobile Learning Experience", "Mobile Tool Logo Slider",
                 "Mobile Promotional Video Section"):
        if name in hero_txt:
            fail.append(f"{name} nested inside Mobile Hero (clipped by its height)")

    for gone in ("Everyday AI Mobile Program", "Applied AI Mobile Program",
                 "Mobile Impact Formula", "Mobile Homepage Community",
                 "Mobile Free Tools Note", "Research &amp; Automation Mobile Program"):
        if gone in out:
            fail.append(f"old content still present: {gone}")

    print(f"\n<div> balance: {out.count('<div') - out.count('</div>')} (want 0)")
    print(f"<section> balance: {out.count('<section') - out.count('</section>')} (want 0)")
    print(f"styled elements parsed: {c.styled}")
    print(f"lines: {len(chk)}  bytes: {len(out)}")
    if fail:
        print("\nBUILD FAILED (nothing written):")
        for f in fail:
            print(f"  - {f}")
        sys.exit(1)

    open(SRC, "w", encoding="utf-8").write(out)
    print(f"\nwrote {SRC}")
    print("BUILD OK")


if __name__ == "__main__":
    main()
