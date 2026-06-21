"use client";

import { useState } from "react";
import type { DashboardSectionData, DashboardSectionId } from "@/lib/dashboard/deriveDashboardState";

type Glyph = "chart" | "file" | "folder" | "edit" | "quote" | "clipboard";

type SectionDetail = {
  id: DashboardSectionId;
  label: string;
  percent: number;
  badgeLabel?: string;
  y: number;
  fill: string;
  stroke: string;
  icon: string;
  badge: string;
  badgeText: string;
  bar: string;
  alertFill: string;
  glyph: Glyph;
  stats: Array<[string, string]>;
  bottleneckLabel: string;
  bottleneck: string[];
  nextLabel: string;
  next: string[];
  activity?: Array<[Glyph, string, string]>;
  button: string;
  link: string;
};

const fallbackSections: SectionDetail[] = [
  {
    id: "meta-analysis",
    label: "Meta-analysis",
    percent: 0,
    y: 112,
    fill: "#faf6ef",
    stroke: "#d8c8b7",
    icon: "#efe2d0",
    badge: "#efe2d0",
    badgeText: "#8f6132",
    bar: "#b6844e",
    alertFill: "#fbf6ef",
    glyph: "chart",
    stats: [
      ["1", "Question set"],
      ["2", "Tests suggested"],
      ["5", "Effects entered"],
      ["1", "Forest plot"],
    ],
    bottleneckLabel: "Bottleneck",
    bottleneck: [
      "The hypothesis is ready, but effect sizes need checking.",
      "Confirm Cohen's d entries before interpreting the forest plot.",
    ],
    nextLabel: "Next step",
    next: ["Review effect sizes, heterogeneity, and the APA result."],
    button: "Open meta-analysis",
    link: "View coded papers",
  },
  {
    id: "literature-review",
    label: "Literature Review Table",
    percent: 0,
    y: 209,
    fill: "#faf6ef",
    stroke: "#d8c8b7",
    icon: "#efe2d0",
    badge: "#efe2d0",
    badgeText: "#8f6132",
    bar: "#b6844e",
    alertFill: "#fbf6ef",
    glyph: "file",
    stats: [
      ["26", "Sources"],
      ["18", "Evidence rows"],
      ["9", "Syntheses"],
      ["7", "Rows left"],
    ],
    bottleneckLabel: "Bottleneck",
    bottleneck: [
      "Some rows still need notes and synthesis paragraphs.",
      "Use highlights and insights before exporting the table.",
    ],
    nextLabel: "Next step",
    next: ["Filter by section, then write the next synthesis paragraph."],
    button: "Open table",
    link: "View row gaps",
  },
  {
    id: "workspace",
    label: "Workspace",
    percent: 0,
    y: 306,
    fill: "#faf6ef",
    stroke: "#d8c8b7",
    icon: "#efe2d0",
    badge: "#efe2d0",
    badgeText: "#8f6132",
    bar: "#b6844e",
    alertFill: "#fbf6ef",
    glyph: "folder",
    stats: [
      ["6", "PDFs"],
      ["24", "Highlights"],
      ["12", "Notes"],
      ["5", "Codes"],
    ],
    bottleneckLabel: "What's next",
    bottleneck: [
      "A few highlights still need notes and section codes.",
      "Tag evidence before moving it into review and draft work.",
    ],
    nextLabel: "Recent activity",
    next: [],
    activity: [
      ["folder", "Uploaded PDFs for the current project", "2h ago"],
      ["edit", "Highlighted key passages in the viewer", "5h ago"],
      ["quote", "Added notes and section codes", "Yesterday"],
    ],
    button: "Open workspace",
    link: "View all projects",
  },
  {
    id: "draft",
    label: "Paper Draft",
    percent: 0,
    y: 403,
    fill: "#faf6ef",
    stroke: "#d8c8b7",
    icon: "#efe2d0",
    badge: "#efe2d0",
    badgeText: "#8f6132",
    bar: "#b6844e",
    alertFill: "#fbf6ef",
    glyph: "edit",
    stats: [
      ["8", "Sections"],
      ["3", "With drafts"],
      ["6", "Imported cites"],
      ["1", "Active editor"],
    ],
    bottleneckLabel: "Bottleneck",
    bottleneck: [
      "The active section needs imported evidence before writing.",
      "Use section guidance, source snippets, and APA references.",
    ],
    nextLabel: "Next step",
    next: ["Open Paper Writer and draft the next guided section."],
    button: "Open draft",
    link: "View outline",
  },
  {
    id: "citations",
    label: "Citations",
    percent: 0,
    y: 500,
    fill: "#faf6ef",
    stroke: "#d8c8b7",
    icon: "#efe2d0",
    badge: "#efe2d0",
    badgeText: "#8f6132",
    bar: "#b6844e",
    alertFill: "#fbf6ef",
    glyph: "quote",
    stats: [
      ["42", "References"],
      ["34", "APA ready"],
      ["4", "Missing data"],
      ["1", "Duplicate"],
    ],
    bottleneckLabel: "Bottleneck",
    bottleneck: [
      "Several APA references still need missing pages or metadata.",
      "Clean citations before building the final reference list.",
    ],
    nextLabel: "Next step",
    next: ["Review APA fields, then map citations to draft claims."],
    button: "Open citations",
    link: "View uncited sources",
  },
  {
    id: "notes",
    label: "Cerise Scholar",
    percent: 0,
    badgeLabel: "Ready",
    y: 597,
    fill: "#faf6ef",
    stroke: "#d8c8b7",
    icon: "#efe2d0",
    badge: "#efe2d0",
    badgeText: "#8f6132",
    bar: "#b6844e",
    alertFill: "#fbf6ef",
    glyph: "clipboard",
    stats: [
      ["8", "Pathways"],
      ["12", "Stuck fixes"],
      ["5", "Guides"],
      ["1", "Next move"],
    ],
    bottleneckLabel: "Research support",
    bottleneck: [
      "Find the right research pathway when the project feels stuck.",
      "Use guided solutions for methods, sources, synthesis, or writing.",
    ],
    nextLabel: "Next step",
    next: ["Open Cerise Scholar for pathway guidance and stuck-point help."],
    button: "Open Cerise Scholar",
    link: "View note clusters",
  },
];

const sectionRowHeight = 88;
const sectionRowCenter = sectionRowHeight / 2;
const sectionRowRadius = 18;
const sectionBadgeHeight = 38;
const palette = {
  activeFill: "var(--dashboard-bridge-active-fill, #faf6ef)",
  activeStroke: "var(--dashboard-bridge-active-stroke, #d8c8b7)",
  activeIcon: "var(--dashboard-bridge-active-icon, #efe2d0)",
  activeBadge: "var(--dashboard-bridge-active-badge, #efe2d0)",
  activeBadgeText: "var(--dashboard-bridge-active-badge-text, #8f6132)",
  activeBar: "var(--dashboard-bridge-active-bar, #b6844e)",
  activeAlert: "var(--dashboard-bridge-active-alert, #fbf6ef)",
  neutralFill: "var(--dashboard-bridge-neutral-fill, #fbfaf7)",
  neutralStroke: "var(--dashboard-bridge-neutral-stroke, #e8e1d8)",
  neutralIcon: "var(--dashboard-bridge-neutral-icon, #f3f0eb)",
  neutralBadge: "var(--dashboard-bridge-neutral-badge, #ede8df)",
  neutralBadgeText: "var(--dashboard-bridge-neutral-badge-text, #6f6a64)",
  text: "var(--dashboard-bridge-text, #141414)",
  muted: "var(--dashboard-bridge-muted, #6f6a64)",
  label: "var(--dashboard-bridge-label, #3f3a35)",
  panelStroke: "var(--dashboard-bridge-panel-stroke, #e8e1d8)",
} as const;

const svgTone = {
  canvas: "var(--dashboard-bridge-canvas, #ffffff)",
  headerText: "var(--dashboard-bridge-header-text, #141414)",
  controlFill: "var(--dashboard-bridge-control-fill, #080808)",
  controlStroke: "var(--dashboard-bridge-control-stroke, transparent)",
  controlText: "var(--dashboard-bridge-control-text, #ffffff)",
  iconStroke: "var(--dashboard-bridge-icon-stroke, #101010)",
  actionFill: "var(--dashboard-bridge-action-fill, #fffdfb)",
  actionText: "var(--dashboard-bridge-action-text, #b6844e)",
  progressTrack: "var(--dashboard-bridge-progress-track, #ffffff)",
  alertDot: "var(--dashboard-bridge-alert-dot, #fffdfb)",
} as const;

function selectedShapePath(rowY: number) {
  const rowX = 64;
  const rowW = 582;
  const rowH = sectionRowHeight;
  const rowR = sectionRowRadius;
  const detailX = rowX + rowW;
  const detailY = 112;
  const detailW = 1130;
  const detailH = 588;
  const detailR = 18;
  const connectorR = 18;
  const detailRight = detailX + detailW;
  const detailBottom = detailY + detailH;
  const rowBottom = rowY + rowH;
  const rowTouchesDetailTop = rowY <= detailY;
  const rowTouchesDetailBottom = rowBottom + connectorR >= detailBottom;

  if (rowTouchesDetailTop) {
    return [
      `M ${rowX + rowR} ${rowY}`,
      `H ${detailRight - detailR}`,
      `Q ${detailRight} ${detailY} ${detailRight} ${detailY + detailR}`,
      `V ${detailBottom - detailR}`,
      `Q ${detailRight} ${detailBottom} ${detailRight - detailR} ${detailBottom}`,
      `H ${detailX + detailR}`,
      `Q ${detailX} ${detailBottom} ${detailX} ${detailBottom - detailR}`,
      `V ${rowBottom + connectorR}`,
      `Q ${detailX} ${rowBottom} ${detailX - connectorR} ${rowBottom}`,
      `H ${rowX + rowR}`,
      `Q ${rowX} ${rowBottom} ${rowX} ${rowBottom - rowR}`,
      `V ${rowY + rowR}`,
      `Q ${rowX} ${rowY} ${rowX + rowR} ${rowY}`,
      "Z",
    ].join(" ");
  }

  if (rowTouchesDetailBottom) {
    return [
      `M ${detailX + detailR} ${detailY}`,
      `H ${detailRight - detailR}`,
      `Q ${detailRight} ${detailY} ${detailRight} ${detailY + detailR}`,
      `V ${detailBottom - detailR}`,
      `Q ${detailRight} ${detailBottom} ${detailRight - detailR} ${detailBottom}`,
      `H ${rowX + rowR}`,
      `Q ${rowX} ${detailBottom} ${rowX} ${detailBottom - rowR}`,
      `V ${rowY + rowR}`,
      `Q ${rowX} ${rowY} ${rowX + rowR} ${rowY}`,
      `H ${detailX - connectorR}`,
      `Q ${detailX} ${rowY} ${detailX} ${rowY - connectorR}`,
      `V ${detailY + detailR}`,
      `Q ${detailX} ${detailY} ${detailX + detailR} ${detailY}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${detailX + detailR} ${detailY}`,
    `H ${detailRight - detailR}`,
    `Q ${detailRight} ${detailY} ${detailRight} ${detailY + detailR}`,
    `V ${detailBottom - detailR}`,
    `Q ${detailRight} ${detailBottom} ${detailRight - detailR} ${detailBottom}`,
    `H ${detailX + detailR}`,
    `Q ${detailX} ${detailBottom} ${detailX} ${detailBottom - detailR}`,
    `V ${rowBottom + connectorR}`,
    `Q ${detailX} ${rowBottom} ${detailX - connectorR} ${rowBottom}`,
    `H ${rowX + rowR}`,
    `Q ${rowX} ${rowBottom} ${rowX} ${rowBottom - rowR}`,
    `V ${rowY + rowR}`,
    `Q ${rowX} ${rowY} ${rowX + rowR} ${rowY}`,
    `H ${detailX - connectorR}`,
    `Q ${detailX} ${rowY} ${detailX} ${rowY - connectorR}`,
    `V ${detailY + detailR}`,
    `Q ${detailX} ${detailY} ${detailX + detailR} ${detailY}`,
    "Z",
  ].join(" ");
}

function Icon({ glyph, x, y, size = 1 }: { glyph: Glyph; x: number; y: number; size?: number }) {
  return (
    <g
      fill="none"
      stroke={svgTone.iconStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={4 / size}
      transform={`translate(${x} ${y}) scale(${size})`}
    >
      {glyph === "chart" ? (
        <>
          <circle cx="18" cy="18" r="14" />
          <path d="M18 4v14h14" />
          <path d="M18 18 28 28" />
        </>
      ) : null}
      {glyph === "file" ? (
        <>
          <path d="M10 5h12l7 7v23H10z" />
          <path d="M22 5v8h7" />
          <path d="M15 20h9M15 27h7" />
        </>
      ) : null}
      {glyph === "folder" ? <path d="M5 12h13l4 4h15v16a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /> : null}
      {glyph === "edit" ? (
        <>
          <path d="M18 35h17" />
          <path d="M28 6a4 4 0 0 1 6 6L13 33l-8 2 2-8z" />
        </>
      ) : null}
      {glyph === "quote" ? (
        <>
          <path d="M14 17c-5 0-8 4-8 9 0 4 3 7 7 7 3 0 6-2 6-6 0-3-2-5-5-6 .5-4 2-7 5-10" />
          <path d="M31 17c-5 0-8 4-8 9 0 4 3 7 7 7 3 0 6-2 6-6 0-3-2-5-5-6 .5-4 2-7 5-10" />
        </>
      ) : null}
      {glyph === "clipboard" ? (
        <>
          <rect height="26" rx="3" width="20" x="10" y="8" />
          <path d="M15 16h10M15 23h10M15 30h6" />
        </>
      ) : null}
    </g>
  );
}

function RowContent({ section, active, onSelect }: { section: SectionDetail; active: boolean; onSelect: () => void }) {
  const centerY = section.y + sectionRowCenter;
  const iconY = centerY - 17;
  const badgeY = section.y + (sectionRowHeight - sectionBadgeHeight) / 2;

  return (
    <g
      aria-label={section.label}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      style={{ cursor: "pointer", outline: "none" }}
      tabIndex={0}
    >
      {!active ? (
        <rect fill={palette.neutralFill} height={sectionRowHeight} rx={sectionRowRadius} stroke={palette.neutralStroke} strokeWidth="2" width="566" x="64" y={section.y} />
      ) : null}
      <circle cx="116" cy={centerY} fill={active ? palette.activeIcon : palette.neutralIcon} r="28" />
      <Icon glyph={section.glyph} x={99} y={iconY} size={0.92} />
      <text dominantBaseline="middle" fill={palette.text} fontSize="23" fontWeight="850" x="188" y={centerY}>
        {section.label}
      </text>
      <rect fill={active ? palette.activeBadge : palette.neutralBadge} height={sectionBadgeHeight} rx="19" width="88" x="516" y={badgeY} />
      <text dominantBaseline="middle" fill={active ? palette.activeBadgeText : palette.neutralBadgeText} fontSize={section.badgeLabel ? "18" : "22"} fontWeight="800" textAnchor="middle" x="560" y={centerY}>
        {section.badgeLabel ?? `${section.percent}%`}
      </text>
    </g>
  );
}

function mergeSections(sections?: DashboardSectionData[]) {
  if (!sections) return fallbackSections;
  const byId = new Map(sections.map((section) => [section.id, section]));
  return fallbackSections.map((fallback) => {
    const next = byId.get(fallback.id);
    return next ? { ...fallback, ...next } : fallback;
  });
}

export default function DashboardResearchSectionsExact({
  sections: dynamicSections,
  onOpenSection,
}: {
  sections?: DashboardSectionData[];
  onOpenSection?: (sectionId: DashboardSectionId) => void;
}) {
  const sections = mergeSections(dynamicSections);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = sections[selectedIndex];
  const isCeriseScholar = selected.id === "notes";
  const progressTrackWidth = 900;
  const progressWidth = Math.round((selected.percent / 100) * progressTrackWidth);
  const needsRoomyAction = selected.button === "Open meta-analysis" || selected.button === "Open Cerise Scholar";
  const actionButtonX = needsRoomyAction ? 1490 : 1520;
  const actionButtonWidth = needsRoomyAction ? 268 : 238;
  const actionTextX = needsRoomyAction ? 1516 : 1614;
  const actionTextAnchor = needsRoomyAction ? "start" : "middle";

  return (
    <section
      aria-label="Research Sections and Section Details"
      className="dashboard-research-bridge-svg h-[318px] min-w-0 w-full overflow-hidden rounded-[12px] border border-[#e8e1d8] bg-white font-sans text-[#101010]"
    >
      <svg className="h-full w-full" preserveAspectRatio="none" role="img" viewBox="0 0 1804 722">
        <title>Research Sections and Section Details</title>
        <rect fill={svgTone.canvas} height="722" width="1804" x="0" y="0" />

        <text dominantBaseline="middle" fill={svgTone.headerText} fontSize="32" fontWeight="850" x="54" y="70">
          Research Sections
        </text>
        <rect fill={svgTone.controlFill} height="46" rx="23" stroke={svgTone.controlStroke} strokeWidth="2" width="118" x="496" y="47" />
        <text dominantBaseline="middle" fill={svgTone.controlText} fontSize="18" fontWeight="760" textAnchor="middle" x="547" y="70">
          Today
        </text>
        <path d="m586 65 8 8 8-8" fill="none" stroke={svgTone.controlText} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <text dominantBaseline="middle" fill={svgTone.headerText} fontSize="32" fontWeight="850" x="680" y="70">
          Section Details
        </text>

        <path d={selectedShapePath(selected.y)} fill={palette.activeFill} stroke={palette.activeStroke} strokeLinejoin="round" strokeWidth="2" />

        {sections.map((section, index) => (
          <RowContent active={index === selectedIndex} key={section.id} onSelect={() => setSelectedIndex(index)} section={section} />
        ))}

        <text fill={palette.text} fontSize="33" fontWeight="850" x="682" y="162">
          {selected.label}
        </text>
        <g
          onClick={() => onOpenSection?.(selected.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenSection?.(selected.id);
            }
          }}
          role="button"
          style={{ cursor: onOpenSection ? "pointer" : "default", outline: "none", pointerEvents: "all" }}
          tabIndex={onOpenSection ? 0 : -1}
        >
          <rect fill={svgTone.actionFill} height="42" rx="8" stroke={palette.activeBar} strokeWidth="1.6" width={actionButtonWidth} x={actionButtonX} y="124" />
          <text dominantBaseline="middle" fill={svgTone.actionText} fontSize="18" fontWeight="800" textAnchor={actionTextAnchor} x={actionTextX} y="145">
            {selected.button}
          </text>
          <path d="M1732 139h8v8M1740 139l-10 10" fill="none" stroke={svgTone.actionText} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </g>

        {isCeriseScholar ? (
          <>
            <text fill={palette.muted} fontSize="22" fontWeight="800" x="682" y="224">
              Guidance
            </text>
            <text fill={palette.text} fontSize="23" fontWeight="600" x="682" y="264">
              Research pathways and stuck-point help are ready for this project.
            </text>
          </>
        ) : (
          <>
            <text fill={palette.muted} fontSize="22" fontWeight="800" x="682" y="222">
              Progress
            </text>
            <text dominantBaseline="middle" fill={palette.text} fontSize="31" fontWeight="850" textAnchor="start" x="1616" y="259">
              {selected.percent}%
            </text>
            <rect fill={svgTone.progressTrack} height="13" rx="6.5" width={progressTrackWidth} x="682" y="252" />
            <rect fill={palette.activeBar} height="13" rx="6.5" width={progressWidth} x="682" y="252" />
          </>
        )}

        <text fill={palette.text} fontSize="22" fontWeight="850" x="682" y="306">
          At a glance
        </text>
        {selected.stats.map(([value, label], index) => {
          const x = 770 + index * 240;
          return (
            <g key={`${label}-${index}`}>
              {index > 0 ? <line stroke={palette.activeStroke} strokeOpacity="0.7" strokeWidth="2" x1={x - 120} x2={x - 120} y1="336" y2="398" /> : null}
              <text fill={palette.activeBar} fontSize="40" fontWeight="850" textAnchor="middle" x={x} y="362">
                {value}
              </text>
              <text fill={palette.label} fontSize="21" fontWeight="620" textAnchor="middle" x={x} y="396">
                {label}
              </text>
            </g>
          );
        })}

        <text fill={palette.text} fontSize="22" fontWeight="850" x="682" y="446">
          {selected.bottleneckLabel}
        </text>
        <rect fill={palette.activeAlert} height="86" rx="9" stroke={palette.activeStroke} strokeOpacity="0.9" strokeWidth="1.6" width="1070" x="682" y="462" />
        <circle cx="722" cy="505" fill={svgTone.alertDot} r="22" stroke={palette.activeStroke} strokeWidth="1.6" />
        <text fill={palette.activeBar} fontSize="30" fontWeight="850" textAnchor="middle" x="722" y="516">
          !
        </text>
        <text fill={palette.text} fontSize="22" fontWeight="600" x="764" y="494">
          {selected.bottleneck.map((line, index) => (
            <tspan key={`${line}-${index}`} x="764" dy={index === 0 ? 0 : 29}>
              {line}
            </tspan>
          ))}
        </text>

        <text fill={palette.text} fontSize="22" fontWeight="850" x="682" y="584">
          {selected.nextLabel}
        </text>
        {selected.activity && selected.activity.length > 0 ? (
          selected.activity.map(([glyph, text, time], index) => (
            <g key={`${glyph}-${text}-${time}-${index}`}>
              <circle cx="706" cy={608 + index * 30} fill={palette.activeIcon} r="12" />
              <Icon glyph={glyph} x={699} y={601 + index * 30} size={0.38} />
              <text fill={palette.text} fontSize="21" fontWeight="600" x="728" y={615 + index * 30}>
                {text}
              </text>
              <text fill={palette.muted} fontSize="19" fontWeight="620" textAnchor="end" x="1682" y={615 + index * 30}>
                {time}
              </text>
              {index < 2 ? <line stroke={palette.activeStroke} strokeOpacity="0.55" x1="682" x2="1694" y1={627 + index * 30} y2={627 + index * 30} /> : null}
            </g>
          ))
        ) : (
          <text fill={palette.text} fontSize="23" fontWeight="560" x="682" y="618">
            {selected.next.map((line, index) => (
              <tspan key={`${line}-${index}`} x="682" dy={index === 0 ? 0 : 30}>
                {line}
              </tspan>
            ))}
          </text>
        )}

      </svg>
    </section>
  );
}
