"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import {
  collectExperimentVariables,
  createExperimentBlock,
  createExperimentStudioDocument,
  assignExperimentCondition,
  EXPERIMENT_BLOCK_OPTIONS,
  isExperimentStudioReady,
  MAX_EXPERIMENT_BLOCKS,
  readExperimentStudioDocument,
  updateExperimentStudioDocument,
  validateExperimentStudio,
  writeExperimentStudioDocument,
  type ExperimentBlock,
  type ExperimentBlockType,
  type ExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import {
  materializeExperimentTrialBlocks,
  resolveExperimentRuntimeNextIndex,
} from "@/lib/research/experimentTrials";
import { prepareExperimentImage } from "@/lib/research/experimentMedia";
import type { ExperimentAssistantBlockPatch } from "@/lib/research/experimentAssistant";
import {
  fetchExperimentStudio,
  upsertExperimentStudio,
} from "@/lib/research/experimentStudioPersistence";
import { readResearchPathStoredDocument } from "@/lib/research/researchPathStorage";
import type { StudyDesignDocument } from "@/lib/research/studyDesign";
import { createClient } from "@/lib/supabase/client";
import styles from "./ExperimentalStudio.module.css";

type StudioTab =
  | "builder"
  | "trials"
  | "logic"
  | "rehearse"
  | "diagnostics"
  | "variables"
  | "checks"
  | "package";

interface ExperimentalStudioProps {
  projectId: string;
  projectName: string;
}

const TAB_LABELS: ReadonlyArray<{ id: StudioTab; label: string }> = [
  { id: "builder", label: "Builder" },
  { id: "trials", label: "Trials" },
  { id: "logic", label: "Logic" },
  { id: "rehearse", label: "Rehearse" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "variables", label: "Variables" },
  { id: "checks", label: "Checks" },
  { id: "package", label: "Release" },
];

const ExperimentLogicPanel = dynamic(() => import("./ExperimentLogicPanel"), {
  loading: () => <main className={styles.logicLoading}>Loading study logic…</main>,
  ssr: false,
});

const ExperimentTrialsPanel = dynamic(() => import("./ExperimentTrialsPanel"), {
  loading: () => <main className={styles.logicLoading}>Opening the trial-table workspace…</main>,
  ssr: false,
});

const ExperimentPackagePanel = dynamic(() => import("./ExperimentPackagePanel"), {
  loading: () => <main className={styles.logicLoading}>Preparing the local package workspace…</main>,
  ssr: false,
});

const ExperimentTimingDiagnosticsPanel = dynamic(
  () => import("./ExperimentTimingDiagnosticsPanel"),
  {
    loading: () => <main className={styles.logicLoading}>Opening local timing diagnostics…</main>,
    ssr: false,
  },
);

const ExperimentAiAssistant = dynamic(() => import("./ExperimentAiAssistant"), {
  loading: () => <aside className={styles.assistantLoading}>Opening AI study assistant…</aside>,
  ssr: false,
});

interface RehearsalTiming {
  blockId: string;
  blockTitle: string;
  durationMs: number;
  deadlineMs: number;
  deadlineExceeded: boolean;
}

const RESPONSE_LABELS: Record<ExperimentBlock["responseType"], string> = {
  none: "No response",
  consent: "Consent decision",
  likert: "Rating scale",
  "single-choice": "Single choice",
  keyboard: "Keyboard response",
  audio: "Local audio response",
  video: "Local video response",
  "long-text": "Long text",
};

function makeBlockId(type: ExperimentBlockType): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${type}-${crypto.randomUUID()}`;
  }
  return `${type}-${Date.now().toString(36)}`;
}

function ParticipantResponse({
  block,
  interactive,
  value,
  onChange,
}: {
  block: ExperimentBlock;
  interactive: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  if (block.responseType === "none") return null;

  if (block.responseType === "keyboard") {
    const keys = block.allowedKeys?.length ? block.allowedKeys : ["f", "j"];
    return (
      <div className={styles.keyboardResponse} aria-live="polite">
        <strong>{value ? `Recorded key: ${value}` : "Waiting for a keyboard response"}</strong>
        <span>Allowed keys: {keys.map((key) => key.toUpperCase()).join(" · ")}</span>
      </div>
    );
  }

  if (block.responseType === "audio") {
    const completed = Boolean(value);
    return (
      <div className={styles.keyboardResponse} aria-live="polite">
        <strong>{completed ? "Simulated recording complete" : "Local Host microphone recording"}</strong>
        <span>
          {interactive
            ? "Rehearsal never opens the microphone or stores audio. Use this control only to rehearse the flow."
            : "Microphone permission, recording, and local storage run only in the same-Mac Local Research Host."}
        </span>
        {interactive ? (
          <button
            onClick={() => onChange?.(completed ? "" : "rehearsal-audio-placeholder")}
            type="button"
          >
            {completed ? "Clear simulated recording" : "Simulate completed recording"}
          </button>
        ) : null}
      </div>
    );
  }

  if (block.responseType === "video") {
    const completed = Boolean(value);
    return (
      <div className={styles.keyboardResponse} aria-live="polite">
        <strong>{completed ? "Simulated video recording complete" : "Local Host camera recording"}</strong>
        <span>
          {interactive
            ? "Rehearsal never opens the camera or stores video. Use this control only to rehearse the flow."
            : "Camera permission, preview, recording, and local storage run only in the same-Mac Local Research Host."}
        </span>
        {interactive ? (
          <button
            onClick={() => onChange?.(completed ? "" : "rehearsal-video-placeholder")}
            type="button"
          >
            {completed ? "Clear simulated recording" : "Simulate completed recording"}
          </button>
        ) : null}
      </div>
    );
  }

  if (block.responseType === "likert") {
    const values = Array.from(
      { length: Math.max(0, block.scaleMax - block.scaleMin + 1) },
      (_, index) => block.scaleMin + index,
    );
    return (
      <fieldset className={styles.ratingScale}>
        <legend>Response scale ({block.scaleMin}–{block.scaleMax})</legend>
        <div className={styles.scaleLabels}>
          <span>{block.minLabel || "Minimum"}</span>
          <span>{block.maxLabel || "Maximum"}</span>
        </div>
        <div className={styles.scaleOptions}>
          {values.map((option) => (
            <label key={option}>
              <span>{option}</span>
              <input
                checked={value === String(option)}
                disabled={!interactive}
                name={`response-${block.id}`}
                onChange={() => onChange?.(String(option))}
                type="radio"
              />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (block.responseType === "single-choice" || block.responseType === "consent") {
    return (
      <fieldset className={styles.choiceList}>
        <legend>{block.responseType === "consent" ? "Your decision" : "Choose one option"}</legend>
        {block.choices.map((choice) => (
          <label key={choice}>
            <input
              checked={value === choice}
              disabled={!interactive}
              name={`response-${block.id}`}
              onChange={() => onChange?.(choice)}
              type="radio"
            />
            <span>{choice}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <label className={styles.previewTextResponse}>
      <span>Your response</span>
      <textarea
        disabled={!interactive}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="Write your response here…"
        rows={5}
        value={value ?? ""}
      />
    </label>
  );
}

function ParticipantScreen({
  block,
  editable,
  response,
  onResponse,
  onUpdate,
}: {
  block: ExperimentBlock;
  editable?: boolean;
  response?: string;
  onResponse?: (value: string) => void;
  onUpdate?: (patch: Partial<ExperimentBlock>) => void;
}) {
  return (
    <div className={styles.participantScreen}>
      {editable ? (
        <label className={styles.canvasField}>
          <span>Heading <small>(optional)</small></span>
          <input
            maxLength={200}
            onChange={(event) => onUpdate?.({ heading: event.target.value })}
            value={block.heading}
          />
        </label>
      ) : block.heading ? <h2>{block.heading}</h2> : null}

      {block.media ? (
        <figure className={styles.participantMedia}>
          <Image
            alt={block.media.altText}
            height={900}
            src={block.media.dataUrl}
            unoptimized
            width={1_200}
          />
        </figure>
      ) : null}

      {editable ? (
        <label className={styles.canvasField}>
          <span>Prompt</span>
          <textarea
            maxLength={2_000}
            onChange={(event) => onUpdate?.({ prompt: event.target.value })}
            rows={3}
            value={block.prompt}
          />
        </label>
      ) : <p className={styles.participantPrompt}>{block.prompt}</p>}

      <ParticipantResponse
        block={block}
        interactive={!editable}
        onChange={onResponse}
        value={response}
      />
    </div>
  );
}

function BlockSettings({
  block,
  blocks,
  onDelete,
  onUpdate,
}: {
  block: ExperimentBlock;
  blocks: ExperimentBlock[];
  onDelete: () => void;
  onUpdate: (patch: Partial<ExperimentBlock>) => void;
}) {
  const choiceValue = block.choices.join("\n");
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");

  async function handleMediaUpload(file: File | undefined) {
    if (!file) return;
    setMediaBusy(true);
    setMediaError("");
    try {
      const dataUrl = await prepareExperimentImage(file);
      onUpdate({
        media: {
          kind: "image",
          dataUrl,
          altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 240) || "Study stimulus",
          source: "upload",
        },
      });
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "The image could not be prepared.");
    } finally {
      setMediaBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  return (
    <aside className={styles.inspector}>
      <div className={styles.panelHeading}>
        <h2>Block settings</h2>
        <span>{block.type.replace("-", " ")}</span>
      </div>

      <label>
        <span>Display title</span>
        <input maxLength={120} onChange={(event) => onUpdate({ title: event.target.value })} value={block.title} />
      </label>
      <label>
        <span>Internal name</span>
        <input maxLength={80} onChange={(event) => onUpdate({ internalName: event.target.value })} value={block.internalName} />
      </label>
      <label>
        <span>Prompt</span>
        <textarea maxLength={2_000} onChange={(event) => onUpdate({ prompt: event.target.value })} rows={4} value={block.prompt} />
      </label>
      <label>
        <span>Response type</span>
        <select
          onChange={(event) => onUpdate({ responseType: event.target.value as ExperimentBlock["responseType"] })}
          value={block.responseType}
        >
          {Object.entries(RESPONSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {block.responseType !== "none" ? (
        <>
          <label>
            <span>Variable name</span>
            <input maxLength={80} onChange={(event) => onUpdate({ variableName: event.target.value })} value={block.variableName} />
            <small>Begins with a letter; use letters, numbers, and underscores.</small>
          </label>
          <label className={styles.toggleRow}>
            <input checked={block.required} onChange={(event) => onUpdate({ required: event.target.checked })} type="checkbox" />
            <span>Response required</span>
          </label>
        </>
      ) : null}

      {block.responseType === "single-choice" || block.responseType === "consent" ? (
        <>
          <label>
            <span>Response options <small>(one per line)</small></span>
            <textarea
              onChange={(event) => onUpdate({ choices: event.target.value.split("\n").slice(0, 20) })}
              rows={5}
              value={choiceValue}
            />
          </label>
          {block.responseType === "single-choice" ? (
            <label className={styles.toggleRow}>
              <input
                checked={block.randomizeChoices === true}
                onChange={(event) => onUpdate({ randomizeChoices: event.target.checked })}
                type="checkbox"
              />
              <span>Randomize option order reproducibly</span>
            </label>
          ) : null}
        </>
      ) : null}

      {block.responseType === "keyboard" ? (
        <>
          <label>
            <span>Allowed keys <small>(comma-separated)</small></span>
            <input
              maxLength={120}
              onChange={(event) => onUpdate({
                allowedKeys: event.target.value.split(",").map((key) => key.trim().toLocaleLowerCase()).filter(Boolean).slice(0, 12),
              })}
              value={(block.allowedKeys ?? []).join(", ")}
            />
          </label>
          <label>
            <span>Correct key <small>(optional)</small></span>
            <input
              maxLength={20}
              onChange={(event) => onUpdate({ correctAnswer: event.target.value.trim().toLocaleLowerCase() })}
              value={block.correctAnswer ?? ""}
            />
          </label>
          <label className={styles.toggleRow}>
            <input checked={block.practice === true} onChange={(event) => onUpdate({ practice: event.target.checked })} type="checkbox" />
            <span>Practice trial</span>
          </label>
        </>
      ) : null}

      {block.responseType === "audio" && block.audio ? (
        <section className={styles.mediaSettings}>
          <div className={styles.panelHeading}>
            <h2>Local audio limits</h2>
            <span>same Mac only</span>
          </div>
          <label>
            <span>Audio recording consent</span>
            <select
              onChange={(event) => onUpdate({
                audio: { ...block.audio!, consentBlockId: event.target.value },
              })}
              value={block.audio.consentBlockId}
            >
              <option value="">Select a preceding audio-consent block</option>
              {blocks
                .slice(0, Math.max(0, blocks.findIndex((candidate) => candidate.id === block.id)))
                .filter((candidate) => candidate.type === "audio-consent")
                .map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
            </select>
          </label>
          <label>
            <span>Maximum duration <small>(seconds)</small></span>
            <input
              max={300}
              min={5}
              onChange={(event) => onUpdate({
                audio: { ...block.audio!, maxDurationSeconds: Number(event.target.value) },
              })}
              type="number"
              value={block.audio.maxDurationSeconds}
            />
          </label>
          <label>
            <span>Maximum recording <small>(MB)</small></span>
            <input
              max={25}
              min={1}
              onChange={(event) => onUpdate({
                audio: {
                  ...block.audio!,
                  maxBytes: Math.round(Number(event.target.value) * 1024 * 1024),
                },
              })}
              type="number"
              value={Math.max(1, Math.round(block.audio.maxBytes / (1024 * 1024)))}
            />
          </label>
          <small>
            Participants must pass a microphone check and explicitly start recording.
            Audio is chunked and stored only by the same-Mac Local Research Host.
          </small>
        </section>
      ) : null}

      {block.responseType === "video" && block.video ? (
        <section className={styles.mediaSettings}>
          <div className={styles.panelHeading}>
            <h2>Local video limits</h2>
            <span>same Mac only</span>
          </div>
          <label>
            <span>Video recording consent</span>
            <select
              onChange={(event) => onUpdate({
                video: { ...block.video!, consentBlockId: event.target.value },
              })}
              value={block.video.consentBlockId}
            >
              <option value="">Select a preceding video-consent block</option>
              {blocks
                .slice(0, Math.max(0, blocks.findIndex((candidate) => candidate.id === block.id)))
                .filter((candidate) => candidate.type === "video-consent")
                .map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
            </select>
          </label>
          <label className={styles.toggleRow}>
            <input
              checked={block.video.includeAudio}
              onChange={(event) => onUpdate({
                video: {
                  ...block.video!,
                  includeAudio: event.target.checked,
                  audioConsentBlockId: event.target.checked
                    ? block.video!.audioConsentBlockId
                    : "",
                },
              })}
              type="checkbox"
            />
            <span>Include microphone audio in the video</span>
          </label>
          {block.video.includeAudio ? (
            <label>
              <span>Separate audio recording consent</span>
              <select
                onChange={(event) => onUpdate({
                  video: { ...block.video!, audioConsentBlockId: event.target.value },
                })}
                value={block.video.audioConsentBlockId}
              >
                <option value="">Select a preceding audio-consent block</option>
                {blocks
                  .slice(0, Math.max(0, blocks.findIndex((candidate) => candidate.id === block.id)))
                  .filter((candidate) => candidate.type === "audio-consent")
                  .map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            <span>Preferred camera</span>
            <select
              onChange={(event) => onUpdate({
                video: {
                  ...block.video!,
                  cameraFacing: event.target.value === "environment" ? "environment" : "user",
                },
              })}
              value={block.video.cameraFacing}
            >
              <option value="user">Front-facing camera</option>
              <option value="environment">Rear-facing camera</option>
            </select>
          </label>
          <label>
            <span>Maximum duration <small>(seconds)</small></span>
            <input
              max={300}
              min={5}
              onChange={(event) => onUpdate({
                video: { ...block.video!, maxDurationSeconds: Number(event.target.value) },
              })}
              type="number"
              value={block.video.maxDurationSeconds}
            />
          </label>
          <label>
            <span>Maximum recording <small>(MB)</small></span>
            <input
              max={100}
              min={1}
              onChange={(event) => onUpdate({
                video: {
                  ...block.video!,
                  maxBytes: Math.round(Number(event.target.value) * 1024 * 1024),
                },
              })}
              type="number"
              value={Math.max(1, Math.round(block.video.maxBytes / (1024 * 1024)))}
            />
          </label>
          <small>
            Participants must pass a visible camera check and explicitly start recording.
            Video is chunked and stored only by the same-Mac Local Research Host.
          </small>
        </section>
      ) : null}

      {block.type === "attention-check" ? (
        <label>
          <span>Expected answer</span>
          <select onChange={(event) => onUpdate({ correctAnswer: event.target.value })} value={block.correctAnswer ?? ""}>
            <option value="">Select an expected answer</option>
            {block.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
          </select>
        </label>
      ) : null}

      {block.responseType === "likert" ? (
        <div className={styles.scaleSettings}>
          <label><span>Minimum</span><input max={19} min={0} onChange={(event) => onUpdate({ scaleMin: Number(event.target.value) })} type="number" value={block.scaleMin} /></label>
          <label><span>Maximum</span><input max={20} min={1} onChange={(event) => onUpdate({ scaleMax: Number(event.target.value) })} type="number" value={block.scaleMax} /></label>
          <label><span>Minimum label</span><input onChange={(event) => onUpdate({ minLabel: event.target.value })} value={block.minLabel} /></label>
          <label><span>Maximum label</span><input onChange={(event) => onUpdate({ maxLabel: event.target.value })} value={block.maxLabel} /></label>
        </div>
      ) : null}

      <section className={styles.mediaSettings}>
        <div className={styles.panelHeading}>
          <h2>Screen image</h2>
          <span>compact local media</span>
        </div>
        {block.media ? (
          <>
            <Image alt="" height={180} src={block.media.dataUrl} unoptimized width={240} />
            <label>
              <span>Accessible alt text</span>
              <textarea
                maxLength={240}
                onChange={(event) => onUpdate({ media: { ...block.media!, altText: event.target.value } })}
                rows={3}
                value={block.media.altText}
              />
            </label>
            <div className={styles.mediaActions}>
              <button disabled={mediaBusy} onClick={() => uploadRef.current?.click()} type="button">Replace image</button>
              <button onClick={() => onUpdate({ media: null })} type="button">Remove</button>
            </div>
          </>
        ) : (
          <button className={styles.mediaUploadButton} disabled={mediaBusy} onClick={() => uploadRef.current?.click()} type="button">
            <AppIcon name="upload" />
            {mediaBusy ? "Preparing image…" : "Upload approved image"}
          </button>
        )}
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-label="Upload screen image"
          className={styles.hiddenFileInput}
          onChange={(event) => void handleMediaUpload(event.target.files?.[0])}
          ref={uploadRef}
          type="file"
        />
        <small>JPEG, PNG, or WebP. Cerise reduces the approved file to a small WebP inside the study package; no separate media bucket is used.</small>
        {mediaError ? <p className={styles.mediaError}>{mediaError}</p> : null}
      </section>

      <label>
        <span>After this block</span>
        <select onChange={(event) => onUpdate({ nextBlockId: event.target.value })} value={block.nextBlockId}>
          <option value="">Continue to the next block</option>
          {blocks.filter((candidate) => candidate.id !== block.id).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>Go to {candidate.title}</option>
          ))}
          <option value="__end__">End the study</option>
        </select>
      </label>

      <button className={styles.deleteButton} disabled={blocks.length <= 1} onClick={onDelete} type="button">
        <AppIcon name="trash" />
        Delete block
      </button>
    </aside>
  );
}

export default function ExperimentalStudio({ projectId, projectName }: ExperimentalStudioProps) {
  const [studio, setStudio] = useState<ExperimentStudioDocument>(() => createExperimentStudioDocument(projectId));
  const [activeBlockId, setActiveBlockId] = useState("block-rating-1");
  const [activeTab, setActiveTab] = useState<StudioTab>("builder");
  const [blockType, setBlockType] = useState<ExperimentBlockType>("rating");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewResponses, setPreviewResponses] = useState<Record<string, string>>({});
  const [rehearsalHistory, setRehearsalHistory] = useState<number[]>([]);
  const [rehearsalNumber, setRehearsalNumber] = useState(1);
  const [rehearsalTimings, setRehearsalTimings] = useState<RehearsalTiming[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Loading study…");
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [studyDesign, setStudyDesign] = useState<StudyDesignDocument | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const cloudTimer = useRef<number | null>(null);
  const dirty = useRef(false);
  const rehearsalStartedAt = useRef(0);

  const activeBlock = useMemo(
    () => studio.blocks.find((block) => block.id === activeBlockId) ?? studio.blocks[0],
    [activeBlockId, studio.blocks],
  );
  const variables = useMemo(() => collectExperimentVariables(studio), [studio]);
  const issues = useMemo(() => validateExperimentStudio(studio), [studio]);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;
  const ready = isExperimentStudioReady(studio);
  const assignedCondition = useMemo(
    () => assignExperimentCondition(studio, String(rehearsalNumber)),
    [rehearsalNumber, studio],
  );
  const rehearsalBlocks = useMemo(
    () => materializeExperimentTrialBlocks(studio, String(rehearsalNumber), assignedCondition.id),
    [assignedCondition.id, rehearsalNumber, studio],
  );
  const displayStudyTitle = studio.title === "Untitled experimental study" ? projectName : studio.title;
  const packagedStudio = useMemo(
    () => displayStudyTitle === studio.title ? studio : { ...studio, title: displayStudyTitle },
    [displayStudyTitle, studio],
  );

  useEffect(() => {
    let cancelled = false;
    let localStudy = createExperimentStudioDocument(projectId);
    let inheritedStudy: StudyDesignDocument | null = null;
    try {
      inheritedStudy = readResearchPathStoredDocument(window.localStorage, projectId).studyDesign;
      setStudyDesign(inheritedStudy);
      localStudy = readExperimentStudioDocument(window.localStorage, projectId, inheritedStudy);
      setStudio(localStudy);
      setActiveBlockId(localStudy.blocks[0]?.id ?? "");
      setSaveState("Saved on this device");
    } catch {
      setSaveState("Study storage unavailable");
    } finally {
      setHydrated(true);
    }

    async function loadCloud() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setCloudUserId(user.id);
        const cloud = await fetchExperimentStudio(supabase, user.id, projectId, inheritedStudy);
        if (cancelled || !cloud) return;
        const cloudTime = Date.parse(cloud.updatedAt);
        const localTime = Date.parse(localStudy.updatedAt);
        if (Number.isFinite(cloudTime) && cloudTime >= localTime) {
          setStudio(cloud);
          setActiveBlockId(cloud.blocks[0]?.id ?? "");
          setSaveState("Saved securely");
        } else {
          dirty.current = true;
        }
      } catch {
        // Versioned local persistence remains available while Supabase is offline.
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    }

    void loadCloud();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("Saving…");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        writeExperimentStudioDocument(window.localStorage, studio);
        setSaveState("Saved on this device");
      } catch {
        setSaveState("Study could not be saved");
      }
    }, 300);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [hydrated, studio]);

  useEffect(() => {
    if (!cloudReady || !cloudUserId || !dirty.current) return;
    if (cloudTimer.current) window.clearTimeout(cloudTimer.current);
    setSaveState("Saving securely…");
    cloudTimer.current = window.setTimeout(() => {
      void upsertExperimentStudio(createClient(), cloudUserId, studio).then((saved) => {
        if (saved) {
          dirty.current = false;
          setSaveState("Saved securely");
        } else {
          setSaveState("Saved on this device");
        }
      });
    }, 700);
    return () => { if (cloudTimer.current) window.clearTimeout(cloudTimer.current); };
  }, [cloudReady, cloudUserId, studio]);

  const changeStudio = useCallback((updater: (current: ExperimentStudioDocument) => ExperimentStudioDocument) => {
    dirty.current = true;
    setStudio((current) => updateExperimentStudioDocument(current, updater));
  }, []);

  const updateBlock = useCallback((blockId: string, patch: Partial<ExperimentBlock>) => {
    changeStudio((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id === blockId ? { ...block, ...patch } : block),
    }));
  }, [changeStudio]);

  const addBlock = useCallback(() => {
    const block = createExperimentBlock(blockType, makeBlockId(blockType));
    changeStudio((current) => {
      if (block.type === "audio-response" && block.audio) {
        const consent = [...current.blocks].reverse().find((candidate) => candidate.type === "audio-consent");
        block.audio = { ...block.audio, consentBlockId: consent?.id ?? "" };
      }
      if (block.type === "video-response" && block.video) {
        const videoConsent = [...current.blocks].reverse().find(
          (candidate) => candidate.type === "video-consent",
        );
        const audioConsent = [...current.blocks].reverse().find(
          (candidate) => candidate.type === "audio-consent",
        );
        block.video = {
          ...block.video,
          consentBlockId: videoConsent?.id ?? "",
          audioConsentBlockId: audioConsent?.id ?? "",
        };
      }
      return { ...current, blocks: [...current.blocks, block] };
    });
    setActiveBlockId(block.id);
  }, [blockType, changeStudio]);

  const addSuggestedBlock = useCallback((suggestedType: ExperimentBlockType, patch: ExperimentAssistantBlockPatch) => {
    if (studio.blocks.length >= MAX_EXPERIMENT_BLOCKS) return;
    const block = { ...createExperimentBlock(suggestedType, makeBlockId(suggestedType)), ...patch };
    changeStudio((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setActiveBlockId(block.id);
    setActiveTab("builder");
  }, [changeStudio, studio.blocks.length]);

  const deleteBlock = useCallback((blockId: string) => {
    const currentIndex = studio.blocks.findIndex((block) => block.id === blockId);
    const remainingBlocks = studio.blocks.filter((block) => block.id !== blockId);
    const nextActiveId = remainingBlocks[Math.max(0, currentIndex - 1)]?.id ?? remainingBlocks[0]?.id ?? "";
    changeStudio((current) => {
      if (current.blocks.length <= 1) return current;
      const blocks = current.blocks.filter((block) => block.id !== blockId).map((block) => (
        block.nextBlockId === blockId ? { ...block, nextBlockId: "" } : block
      ));
      return { ...current, blocks };
    });
    setActiveBlockId(nextActiveId);
  }, [changeStudio, studio.blocks]);

  const moveBlock = useCallback((blockId: string, direction: -1 | 1) => {
    changeStudio((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.blocks.length) return current;
      const blocks = [...current.blocks];
      [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]];
      return { ...current, blocks };
    });
  }, [changeStudio]);

  const restartRehearsal = useCallback((nextRehearsalNumber = rehearsalNumber) => {
    setRehearsalNumber(Math.max(1, Math.trunc(nextRehearsalNumber) || 1));
    setPreviewIndex(0);
    setPreviewResponses({});
    setRehearsalHistory([]);
    setRehearsalTimings([]);
    rehearsalStartedAt.current = typeof performance !== "undefined" ? performance.now() : Date.now();
  }, [rehearsalNumber]);

  const advanceRehearsal = useCallback(() => {
    const block = rehearsalBlocks[previewIndex];
    if (!block) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.max(0, Math.round(now - rehearsalStartedAt.current));
    setRehearsalTimings((current) => {
      const timing: RehearsalTiming = {
        blockId: block.id,
        blockTitle: block.title,
        durationMs,
        deadlineMs: block.responseDeadlineMs,
        deadlineExceeded: block.responseDeadlineMs > 0 && durationMs > block.responseDeadlineMs,
      };
      return [...current.filter((entry) => entry.blockId !== block.id), timing];
    });
    setRehearsalHistory((current) => [...current, previewIndex]);
    setPreviewIndex(resolveExperimentRuntimeNextIndex(
      studio,
      rehearsalBlocks,
      previewIndex,
      previewResponses,
      assignedCondition.id,
    ));
  }, [assignedCondition.id, previewIndex, previewResponses, rehearsalBlocks, studio]);

  const goBackInRehearsal = useCallback(() => {
    const previousIndex = rehearsalHistory.at(-1);
    if (previousIndex === undefined) return;
    setRehearsalHistory((current) => current.slice(0, -1));
    setPreviewIndex(previousIndex);
  }, [rehearsalHistory]);

  useEffect(() => {
    if (activeTab !== "rehearse") return;
    rehearsalStartedAt.current = typeof performance !== "undefined" ? performance.now() : Date.now();
  }, [activeTab, previewIndex]);

  useEffect(() => {
    const block = rehearsalBlocks[previewIndex];
    if (activeTab !== "rehearse" || block?.responseType !== "keyboard") return;
    const allowedKeys = new Set((block.allowedKeys ?? []).map((key) => key.toLocaleLowerCase()));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLocaleLowerCase();
      if (!allowedKeys.has(key)) return;
      event.preventDefault();
      setPreviewResponses((current) => ({ ...current, [block.id]: key }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, previewIndex, rehearsalBlocks]);

  useEffect(() => {
    const block = rehearsalBlocks[previewIndex];
    if (
      activeTab !== "rehearse"
      || !block
      || block.responseType !== "none"
      || block.displayDurationMs <= 0
    ) return;
    const timer = window.setTimeout(advanceRehearsal, block.displayDurationMs);
    return () => window.clearTimeout(timer);
  }, [activeTab, advanceRehearsal, previewIndex, rehearsalBlocks]);

  const previewBlock = rehearsalBlocks[previewIndex];
  const previewComplete = previewIndex >= rehearsalBlocks.length;

  return (
    <div className={styles.studio}>
      <div className={styles.studioMain}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/projects">Cerise Scholar</Link>
        <Link className={styles.returnLink} href={`/dashboard/project/${projectId}`}>
          <AppIcon name="arrow-left" />
          Return to research path
        </Link>
        <div className={styles.projectContext}>
          <input
            aria-label="Study title"
            maxLength={160}
            onChange={(event) => changeStudio((current) => ({ ...current, title: event.target.value }))}
            value={displayStudyTitle}
          />
          <span aria-live="polite"><AppIcon name="save" />{saveState}</span>
        </div>
        <div className={styles.topActions}>
          <button
            aria-expanded={assistantOpen}
            className={assistantOpen ? styles.assistantButtonActive : undefined}
            onClick={() => setAssistantOpen((current) => !current)}
            type="button"
          >
            <AppIcon name="lightbulb" />
            AI assistant
          </button>
          <button onClick={() => { restartRehearsal(); setActiveTab("rehearse"); }} type="button">
            <AppIcon name="play" />
            Rehearse study
          </button>
          <button className={styles.exportButton} onClick={() => setActiveTab("package")} type="button">
            <AppIcon name="upload" />
            Package study
          </button>
        </div>
      </header>

      <nav aria-label="Experimental Studio sections" className={styles.tabs}>
        {TAB_LABELS.map((tab) => (
          <button
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={activeTab === tab.id ? styles.tabActive : undefined}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
            {tab.id === "checks" && issues.length > 0 ? <span>{issues.length}</span> : null}
          </button>
        ))}
      </nav>

      {activeTab === "builder" && activeBlock ? (
        <main className={styles.builder}>
          <aside className={styles.flowRail}>
            <h2>Study flow</h2>
            <ol>
              {studio.blocks.map((block, index) => (
                <li className={block.id === activeBlock.id ? styles.flowActive : undefined} key={block.id}>
                  <button onClick={() => setActiveBlockId(block.id)} type="button">
                    <span>{index + 1}</span>
                    <strong>{block.title}</strong>
                  </button>
                  <div className={styles.reorderActions}>
                    <button aria-label={`Move ${block.title} up`} disabled={index === 0} onClick={() => moveBlock(block.id, -1)} type="button"><AppIcon name="arrow-left" /></button>
                    <button aria-label={`Move ${block.title} down`} disabled={index === studio.blocks.length - 1} onClick={() => moveBlock(block.id, 1)} type="button"><AppIcon name="arrow-right" /></button>
                  </div>
                </li>
              ))}
            </ol>
            <div className={styles.addBlockRow}>
              <select aria-label="Block type to add" onChange={(event) => setBlockType(event.target.value as ExperimentBlockType)} value={blockType}>
                {EXPERIMENT_BLOCK_OPTIONS.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}
              </select>
              <button disabled={studio.blocks.length >= MAX_EXPERIMENT_BLOCKS} onClick={addBlock} type="button"><AppIcon name="plus" />Add block</button>
            </div>
          </aside>

          <section className={styles.canvasPanel}>
            <div className={styles.canvasHeading}>
              <div>
                <h1>{activeBlock.title}</h1>
                <p>Screen flow: {studio.blocks.map((block) => block.title).join(" · ")}</p>
              </div>
              <span><AppIcon name="laptop" />Participant view</span>
            </div>
            <ParticipantScreen block={activeBlock} editable onUpdate={(patch) => updateBlock(activeBlock.id, patch)} />
            <p className={styles.canvasNote}>This is how participants will see this screen. Edits update the preview immediately.</p>
          </section>

          <BlockSettings
            block={activeBlock}
            blocks={studio.blocks}
            onDelete={() => deleteBlock(activeBlock.id)}
            onUpdate={(patch) => updateBlock(activeBlock.id, patch)}
          />
        </main>
      ) : null}

      {activeTab === "trials" ? (
        <ExperimentTrialsPanel
          onChange={changeStudio}
          onOpenBlock={(blockId) => {
            setActiveBlockId(blockId);
            setActiveTab("builder");
          }}
          studio={studio}
        />
      ) : null}

      {activeTab === "logic" ? (
        <ExperimentLogicPanel
          activeBlockId={activeBlock?.id ?? ""}
          onActiveBlockIdChange={setActiveBlockId}
          onChange={changeStudio}
          studio={studio}
        />
      ) : null}

      {activeTab === "rehearse" ? (
        <main className={styles.previewWorkspace}>
          <div className={styles.previewNotice}>
            <div>
              <strong>Safe rehearsal · {assignedCondition.name}</strong>
              <span>Answers and timing logs stay in memory for this rehearsal only and are never saved.</span>
            </div>
            <label>
              <span>Rehearsal number</span>
              <input
                min={1}
                onChange={(event) => restartRehearsal(Number(event.target.value))}
                type="number"
                value={rehearsalNumber}
              />
            </label>
            <button onClick={() => restartRehearsal()} type="button"><AppIcon name="refresh" />Restart</button>
          </div>
          <section className={styles.previewFrame}>
            {previewComplete || !previewBlock ? (
              <div className={styles.previewComplete}>
                <AppIcon name="check-square" />
                <h2>Rehearsal complete</h2>
                <p>No participant responses or timing logs were stored.</p>
                {rehearsalTimings.length > 0 ? (
                  <div className={styles.timingSummary}>
                    <h3>Rehearsal timing summary</h3>
                    <table>
                      <thead><tr><th>Screen</th><th>Observed</th><th>Deadline</th><th>Result</th></tr></thead>
                      <tbody>
                        {rehearsalTimings.map((timing) => (
                          <tr key={timing.blockId}>
                            <td>{timing.blockTitle}</td>
                            <td>{timing.durationMs.toLocaleString()} ms</td>
                            <td>{timing.deadlineMs > 0 ? `${timing.deadlineMs.toLocaleString()} ms` : "None"}</td>
                            <td>{timing.deadlineExceeded ? "Exceeded" : "Within setting"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <button onClick={() => restartRehearsal(rehearsalNumber + 1)} type="button">Run another rehearsal</button>
              </div>
            ) : (
              <>
                {previewBlock.displayDurationMs > 0 || previewBlock.responseDeadlineMs > 0 ? (
                  <div className={styles.rehearsalTimingBar}>
                    <span>Display: {previewBlock.displayDurationMs > 0 ? `${previewBlock.displayDurationMs.toLocaleString()} ms` : "manual"}</span>
                    <span>Response deadline: {previewBlock.responseDeadlineMs > 0 ? `${previewBlock.responseDeadlineMs.toLocaleString()} ms` : "none"}</span>
                    <small>Browser rehearsal estimate</small>
                  </div>
                ) : null}
                <ParticipantScreen
                  block={previewBlock}
                  onResponse={(value) => setPreviewResponses((current) => ({ ...current, [previewBlock.id]: value }))}
                  response={previewResponses[previewBlock.id]}
                />
                <div className={styles.previewNavigation}>
                  <button
                    disabled={!studio.execution.allowBackNavigation || rehearsalHistory.length === 0}
                    onClick={goBackInRehearsal}
                    type="button"
                  ><AppIcon name="arrow-left" />Back</button>
                  <span>{Math.min(previewIndex + 1, rehearsalBlocks.length)} of {rehearsalBlocks.length}</span>
                  <button
                    disabled={previewBlock.required && !previewResponses[previewBlock.id]}
                    onClick={advanceRehearsal}
                    type="button"
                  >
                    {previewBlock.responseType === "consent" && previewResponses[previewBlock.id] === previewBlock.choices[1] ? "End rehearsal" : "Next"}
                    <AppIcon name="arrow-right" />
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      ) : null}

      {activeTab === "variables" ? (
        <main className={styles.tableWorkspace}>
          <header><h1>Variables</h1><p>Every participant response has one analysis-ready variable name.</p></header>
          <table>
            <thead><tr><th>Variable</th><th>Source block</th><th>Response type</th><th>Required</th></tr></thead>
            <tbody>
              {variables.map((variable) => (
                <tr key={`${variable.blockId}-${variable.name}`}>
                  <td><code>{variable.name}</code></td>
                  <td>{variable.blockTitle}</td>
                  <td>{RESPONSE_LABELS[variable.responseType]}</td>
                  <td>{variable.required ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {variables.length === 0 ? <p className={styles.emptyMessage}>Add a response block to create the first variable.</p> : null}
        </main>
      ) : null}

      {activeTab === "diagnostics" ? (
        <ExperimentTimingDiagnosticsPanel
          frozenSummary={studio.timingDiagnostic}
          onSummaryChange={(summary) => changeStudio((current) => ({
            ...current,
            timingDiagnostic: summary,
          }))}
          projectId={projectId}
        />
      ) : null}

      {activeTab === "checks" ? (
        <main className={styles.checksWorkspace}>
          <header>
            <div><h1>Study checks</h1><p>Resolve errors before completing Stage 3. Warnings require a documented research decision.</p></div>
            <strong className={ready ? styles.readyState : styles.blockedState}>
              {ready ? "Ready for Stage 3" : `${errorCount} error${errorCount === 1 ? "" : "s"}`}
            </strong>
          </header>
          {issues.length > 0 ? (
            <ul className={styles.issueList}>
              {issues.map((issue) => (
                <li key={issue.id}>
                  <AppIcon name={issue.severity === "error" ? "alert" : "help"} />
                  <div><strong>{issue.severity === "error" ? "Required fix" : "Review warning"}</strong><p>{issue.message}</p></div>
                  {issue.blockId ? <button onClick={() => { setActiveBlockId(issue.blockId ?? ""); setActiveTab("builder"); }} type="button">Open block</button> : null}
                </li>
              ))}
            </ul>
          ) : <p className={styles.emptyMessage}>No issues found. The specification is ready for Stage 3 completion.</p>}
        </main>
      ) : null}

      {activeTab === "package" ? (
        <ExperimentPackagePanel
          onDuplicateRelease={(release) => {
            changeStudio(() => ({
              ...release.studio,
              projectId,
              updatedAt: new Date().toISOString(),
            }));
            setActiveBlockId(release.studio.blocks[0]?.id ?? "");
            setActiveTab("builder");
          }}
          onOpenChecks={() => setActiveTab("checks")}
          studio={packagedStudio}
        />
      ) : null}

      <footer className={`${styles.statusBar} ${activeTab === "package" ? styles.statusBarPackage : ""}`}>
        {activeTab === "package" ? (
          <>
            <div><AppIcon name="file" /><span><strong>{studio.blocks.length} blocks</strong><small>Included in runner</small></span></div>
            <div><AppIcon name="sliders" /><span><strong>{variables.length} variables</strong><small>JSON and CSV outputs</small></span></div>
            <button onClick={() => setActiveTab("package")} type="button">
              <AppIcon name="lock" />
              <span><strong>Local package only</strong><small>No network or cloud responses</small></span>
              <AppIcon name="arrow-right" />
            </button>
          </>
        ) : activeTab === "logic" ? (
          <>
            <div><AppIcon name="users" /><span><strong>{studio.conditions.length} condition{studio.conditions.length === 1 ? "" : "s"}</strong><small>Total in study</small></span></div>
            <div><AppIcon name="sliders" /><span><strong>{studio.branchRules.length} branching rule{studio.branchRules.length === 1 ? "" : "s"}</strong><small>Response-based paths</small></span></div>
          </>
        ) : activeTab === "trials" ? (
          <>
            <div><AppIcon name="file" /><span><strong>{studio.trialTables.length} trial table{studio.trialTables.length === 1 ? "" : "s"}</strong><small>Frozen source tables</small></span></div>
            <div><AppIcon name="sliders" /><span><strong>{studio.trialTables.reduce((sum, table) => sum + table.rows.length, 0).toLocaleString()} source rows</strong><small>Before repetitions and conditions</small></span></div>
          </>
        ) : activeTab === "diagnostics" ? (
          <>
            <div>
              <AppIcon name="clock" />
              <span>
                <strong>{studio.timingDiagnostic ? "Benchmark recorded" : "No benchmark yet"}</strong>
                <small>Current representative browser</small>
              </span>
            </div>
            <div>
              <AppIcon name="shield" />
              <span>
                <strong>Browser-measured only</strong>
                <small>No certified timing claim</small>
              </span>
            </div>
          </>
        ) : (
          <>
            <div><AppIcon name="file" /><span><strong>{studio.blocks.length} blocks</strong><small>Total in study</small></span></div>
            <div><AppIcon name="sliders" /><span><strong>{variables.length} variables</strong><small>Analysis-ready names</small></span></div>
          </>
        )}
        <button onClick={() => setActiveTab("checks")} type="button">
          <AppIcon name={errorCount > 0 ? "alert" : "check-square"} />
          <span><strong>{issues.length} checks to review</strong><small>{errorCount} errors · {warningCount} warnings</small></span>
          <AppIcon name="arrow-right" />
        </button>
      </footer>
      </div>
      {assistantOpen ? (
        <ExperimentAiAssistant
          activeBlockId={activeBlock?.id ?? ""}
          onAddBlock={addSuggestedBlock}
          onApplyPatch={(blockId, patch) => {
            updateBlock(blockId, patch);
            setActiveBlockId(blockId);
            setActiveTab("builder");
          }}
          onClose={() => setAssistantOpen(false)}
          projectId={projectId}
          studio={studio}
          studyDesign={studyDesign}
        />
      ) : null}
    </div>
  );
}
