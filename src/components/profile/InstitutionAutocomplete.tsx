"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  loadUsInstitutionDirectory,
  searchUsInstitutions,
  type UsInstitutionDirectoryEntry,
  type UsInstitutionSuggestion,
} from "@/lib/profile/institutions";

type EntryMode = "us" | "manual";
type DirectoryStatus = "idle" | "loading" | "ready" | "error";

type InstitutionAutocompleteProps = {
  className?: string;
  label?: string;
  onChange: (name: string, unitId: string | null) => void;
  selectedUnitId: string | null;
  size?: "compact" | "standard";
  value: string;
};

function helperMessage({
  directoryStatus,
  mode,
  query,
  resultCount,
  selectedUnitId,
}: {
  directoryStatus: DirectoryStatus;
  mode: EntryMode;
  query: string;
  resultCount: number;
  selectedUnitId: string | null;
}) {
  if (mode === "manual") return "Enter any institution name. It will be saved exactly as written.";
  if (selectedUnitId) return "U.S. institution selected from the official NCES/IPEDS directory.";
  if (directoryStatus === "loading") return "Loading the U.S. institution directory…";
  if (directoryStatus === "error") return "The directory could not load. Use Outside U.S. / Not listed to enter the name.";
  if (query.trim().length < 2) return "";
  if (directoryStatus === "ready" && resultCount === 0) return "No U.S. match found. You can enter the institution manually.";
  return "Choose a matching institution, or use manual entry if it is not listed.";
}

export default function InstitutionAutocomplete({
  className = "",
  label = "Organization / Institution",
  onChange,
  selectedUnitId,
  size = "compact",
  value,
}: InstitutionAutocompleteProps) {
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const mountedRef = useRef(true);
  const [chosenMode, setChosenMode] = useState<EntryMode | null>(null);
  const [directory, setDirectory] = useState<readonly UsInstitutionDirectoryEntry[] | null>(null);
  const [directoryStatus, setDirectoryStatus] = useState<DirectoryStatus>("idle");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(value);
  const compact = size === "compact";
  const mode = chosenMode ?? (selectedUnitId || !value ? "us" : "manual");

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const suggestions = useMemo(
    () => mode === "us" && directory && !selectedUnitId
      ? searchUsInstitutions(directory, deferredQuery)
      : [],
    [deferredQuery, directory, mode, selectedUnitId]
  );
  const open = mode === "us" && focused && !selectedUnitId && suggestions.length > 0;
  const helperText = helperMessage({
    directoryStatus,
    mode,
    query: value,
    resultCount: suggestions.length,
    selectedUnitId,
  });

  function ensureDirectoryLoaded() {
    if (directory || directoryStatus === "loading") return;
    setDirectoryStatus("loading");
    void loadUsInstitutionDirectory()
      .then((entries) => {
        if (!mountedRef.current) return;
        setDirectory(entries);
        setDirectoryStatus("ready");
      })
      .catch(() => {
        if (mountedRef.current) setDirectoryStatus("error");
      });
  }

  function selectSuggestion(suggestion: UsInstitutionSuggestion) {
    setChosenMode("us");
    onChange(suggestion.name, suggestion.unitId);
    setActiveIndex(-1);
    setFocused(false);
  }

  function chooseMode(nextMode: EntryMode) {
    setChosenMode(nextMode);
    setActiveIndex(-1);
    onChange(value, null);
    if (nextMode === "us") ensureDirectoryLoaded();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? suggestions.length - 1 : current - 1);
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setFocused(false);
      setActiveIndex(-1);
    }
  }

  const inputClassName = compact
    ? "mt-1.5 h-9 w-full rounded-[8px] border border-[#d8d3ce] bg-white px-3 text-[11px] font-semibold text-[#17120d] outline-none focus:border-[#17120d]"
    : "mt-2 h-11 w-full rounded-[8px] border border-[#d4cdc5] bg-white px-3 text-sm text-[#1a1208] outline-none focus:border-[#1a1208]";
  const modeButtonClassName = compact
    ? "h-[18px] px-1 text-[8px] leading-none"
    : "min-h-8 px-3 py-1.5 text-[11px]";

  return (
    <div
      className={`relative min-w-0 ${compact ? "text-[10px] font-bold text-[#4f4842]" : "text-xs font-semibold text-[#5f5248]"} ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
          setActiveIndex(-1);
        }
      }}
    >
      <div className={compact ? "relative" : ""}>
        <span className={compact ? "min-w-0" : ""}>{label}</span>
        <div className={`${compact ? "absolute -top-1 right-0 w-[86px] p-px" : "mt-1.5 p-0.5"} grid grid-cols-2 rounded-[8px] border border-[#d8d3ce] bg-[#f7f5f2]`} role="group" aria-label="Institution location">
          <button
            className={`${modeButtonClassName} rounded-[6px] font-semibold ${mode === "us" ? "bg-white text-[#17120d] shadow-sm" : "text-[#6f6760]"}`}
            data-testid="institution-mode-us"
            aria-label="U.S. institution"
            title="U.S. institution"
            type="button"
            onClick={() => chooseMode("us")}
          >
            {compact ? "U.S." : "U.S. institution"}
          </button>
          <button
            className={`${modeButtonClassName} rounded-[6px] font-semibold ${mode === "manual" ? "bg-white text-[#17120d] shadow-sm" : "text-[#6f6760]"}`}
            data-testid="institution-mode-manual"
            aria-label="Outside U.S. or not listed"
            title="Outside U.S. / Not listed"
            type="button"
            onClick={() => chooseMode("manual")}
          >
            {compact ? "Other" : "Outside U.S. / Not listed"}
          </button>
        </div>
      </div>

      <label className="sr-only" htmlFor={inputId}>
        {mode === "us" ? "Search U.S. college or university" : "Institution name"}
      </label>
      <input
        id={inputId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-autocomplete={mode === "us" ? "list" : "none"}
        aria-controls={mode === "us" ? listboxId : undefined}
        aria-expanded={mode === "us" ? open : undefined}
        autoComplete={mode === "manual" ? "organization" : "off"}
        className={inputClassName}
        maxLength={120}
        placeholder={mode === "us" ? "Begin typing a U.S. institution" : "Enter your institution name"}
        role={mode === "us" ? "combobox" : undefined}
        spellCheck={false}
        value={value}
        onChange={(event) => {
          setChosenMode(mode);
          setActiveIndex(-1);
          onChange(event.target.value, null);
        }}
        onFocus={() => {
          setFocused(true);
          if (mode === "us") ensureDirectoryLoaded();
        }}
        onKeyDown={handleKeyDown}
      />

      {open ? (
        <ul
          id={listboxId}
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-[8px] border border-[#d8d3ce] bg-white py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.unitId} role="presentation">
              <button
                id={`${listboxId}-${index}`}
                aria-selected={activeIndex === index}
                className={`w-full px-3 py-2 text-left ${compact ? "text-[11px]" : "text-sm"} ${activeIndex === index ? "bg-[#f2eee8]" : "hover:bg-[#f7f5f2]"}`}
                role="option"
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="block font-semibold text-[#17120d]">{suggestion.name}</span>
                <span className="mt-0.5 block font-normal text-[#6f6760]">{suggestion.state}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {helperText ? (
        <p className={`${compact ? "mt-1 text-[9px] leading-3" : "mt-1.5 text-[11px] leading-4"} font-normal text-[#766d65]`} aria-live="polite">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
