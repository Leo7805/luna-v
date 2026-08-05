/** Renders and persists grouped runtime controls for LunaV. */
import { useEffect, useState } from 'react';
import { DEFAULT_VIDEO_CONTROL_CONFIG } from '@/entrypoints/content/config';
import {
  getPlaybackRateRangeValidationError,
  getPlaybackRateStepValidationError,
  getSeekDurationValidationError,
  getVolumeStepValidationError,
  formatCompactNumber,
  roundToTwoDecimals,
  readSettings,
  writeSettings,
  type VideoControlSettings,
} from '@/utils/settings';

const SEEK_FIELDS = [
  ['fineSeconds', 'Fine seek', [',', '.']],
  ['nearSeconds', 'Medium seek', ['←', '→']],
  ['farSeconds', 'Large seek', ['↑', '↓']],
] as const;

/** Represents editable string values for the playback-speed controls. */
interface PlaybackRateDraft {
  step: string;
  min: string;
  max: string;
}

/** Represents the single editable volume value. */
interface VolumeDraft {
  step: string;
}

/** Represents editable string values for the three seek-duration controls. */
interface SeekDraft {
  fineSeconds: string;
  nearSeconds: string;
  farSeconds: string;
}

/** Creates editable strings from persisted playback-rate values. */
function getPlaybackRateDraft(settings: VideoControlSettings): PlaybackRateDraft {
  const { max, min, step } = settings.playbackRate;
  return { step: formatCompactNumber(step), min: formatCompactNumber(min), max: formatCompactNumber(max) };
}

/** Creates an editable string from the persisted volume-step value. */
function getVolumeDraft(settings: VideoControlSettings): VolumeDraft {
  return { step: formatCompactNumber(settings.volume.step) };
}

/** Creates editable strings from persisted seek-duration values. */
function getSeekDraft(settings: VideoControlSettings): SeekDraft {
  const { farSeconds, fineSeconds, nearSeconds } = settings.seek;
  return {
    fineSeconds: String(fineSeconds),
    nearSeconds: String(nearSeconds),
    farSeconds: String(farSeconds),
  };
}

/** Converts a manually entered decimal string to a finite number. */
function parseDecimal(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  const number = Number(trimmedValue);
  return Number.isFinite(number) ? number : null;
}

/** Returns the current user-facing validation error for the playback-speed step draft. */
function getStepDraftValidationError(draft: PlaybackRateDraft): string | null {
  const step = parseDecimal(draft.step);
  if (step === null) return 'Enter a valid step.';
  return getPlaybackRateStepValidationError(step);
}

/** Returns the current user-facing validation error for the playback-speed range draft. */
function getRangeDraftValidationError(
  draft: PlaybackRateDraft,
  settings: VideoControlSettings,
): string | null {
  const min = parseDecimal(draft.min);
  if (min === null) return 'Enter a valid minimum speed.';
  const max = parseDecimal(draft.max);
  if (max === null) return 'Enter a valid maximum speed.';
  return getPlaybackRateRangeValidationError({ ...settings.playbackRate, min, max });
}

/** Returns the current user-facing validation error for the volume-step draft. */
function getVolumeDraftValidationError(draft: VolumeDraft): string | null {
  const step = parseDecimal(draft.step);
  if (step === null) return 'Enter a valid volume step.';
  return getVolumeStepValidationError(step);
}

/** Returns the current user-facing validation error for one seek-duration draft value. */
function getSeekDraftValidationError(
  key: keyof SeekDraft,
  value: string,
): string | null {
  const seconds = parseDecimal(value);
  if (seconds === null) return 'Enter a valid seek duration.';
  return getSeekDurationValidationError(key, seconds);
}

/** Returns field-specific errors for the three seek-duration draft values. */
function getSeekDraftValidationErrors(draft: SeekDraft): Record<keyof SeekDraft, string | null> {
  const fineSeconds = parseDecimal(draft.fineSeconds);
  const nearSeconds = parseDecimal(draft.nearSeconds);
  const farSeconds = parseDecimal(draft.farSeconds);
  const errors = {
    fineSeconds: getSeekDraftValidationError('fineSeconds', draft.fineSeconds),
    nearSeconds: getSeekDraftValidationError('nearSeconds', draft.nearSeconds),
    farSeconds: getSeekDraftValidationError('farSeconds', draft.farSeconds),
  };
  if (errors.nearSeconds === null && fineSeconds !== null && nearSeconds !== null && nearSeconds <= fineSeconds) {
    errors.nearSeconds = 'Medium seek must be greater than Fine seek.';
  }
  if (errors.farSeconds === null && nearSeconds !== null && farSeconds !== null && farSeconds <= nearSeconds) {
    errors.farSeconds = 'Large seek must be greater than Medium seek.';
  }
  return errors;
}

/** Builds validated setting values from the form drafts, or null while a value is incomplete. */
function getDraftSettings(
  settings: VideoControlSettings,
  playbackRateDraft: PlaybackRateDraft,
  volumeDraft: VolumeDraft,
  seekDraft: SeekDraft,
): VideoControlSettings | null {
  const step = parseDecimal(playbackRateDraft.step);
  const min = parseDecimal(playbackRateDraft.min);
  const max = parseDecimal(playbackRateDraft.max);
  const volumeStep = parseDecimal(volumeDraft.step);
  const fineSeconds = parseDecimal(seekDraft.fineSeconds);
  const nearSeconds = parseDecimal(seekDraft.nearSeconds);
  const farSeconds = parseDecimal(seekDraft.farSeconds);
  if (step === null || min === null || max === null || volumeStep === null || fineSeconds === null || nearSeconds === null || farSeconds === null) return null;

  return {
    ...settings,
    playbackRate: {
      ...settings.playbackRate,
      step: roundToTwoDecimals(step),
      min: roundToTwoDecimals(min),
      max: roundToTwoDecimals(max),
    },
    volume: { ...settings.volume, step: roundToTwoDecimals(volumeStep) },
    seek: { ...settings.seek, fineSeconds, nearSeconds, farSeconds },
  };
}

/** Compares every Settings value that users can edit in the options interface. */
function haveEditableSettingsChanged(
  current: VideoControlSettings,
  next: VideoControlSettings | null,
): boolean {
  if (!next) return false;
  return (
    current.playbackRate.step !== next.playbackRate.step ||
    current.playbackRate.min !== next.playbackRate.min ||
    current.playbackRate.max !== next.playbackRate.max ||
    current.volume.step !== next.volume.step ||
    current.seek.fineSeconds !== next.seek.fineSeconds ||
    current.seek.nearSeconds !== next.seek.nearSeconds ||
    current.seek.farSeconds !== next.seek.farSeconds
  );
}

/** Displays grouped configuration fields and saves them to extension storage. */
export function SettingsApp() {
  const [settings, setSettings] = useState<VideoControlSettings>(
    structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG),
  );
  const [playbackRateDraft, setPlaybackRateDraft] = useState<PlaybackRateDraft>(() =>
    getPlaybackRateDraft(DEFAULT_VIDEO_CONTROL_CONFIG),
  );
  const [volumeDraft, setVolumeDraft] = useState<VolumeDraft>(() =>
    getVolumeDraft(DEFAULT_VIDEO_CONTROL_CONFIG),
  );
  const [seekDraft, setSeekDraft] = useState<SeekDraft>(() =>
    getSeekDraft(DEFAULT_VIDEO_CONTROL_CONFIG),
  );
  const [hasEditedPlaybackRate, setHasEditedPlaybackRate] = useState(false);
  const [hasEditedVolume, setHasEditedVolume] = useState(false);
  const [hasEditedSeek, setHasEditedSeek] = useState(false);
  const [status, setStatus] = useState('');
  const stepError = getStepDraftValidationError(playbackRateDraft);
  const rangeError = getRangeDraftValidationError(playbackRateDraft, settings);
  const volumeError = getVolumeDraftValidationError(volumeDraft);
  const seekErrors = getSeekDraftValidationErrors(seekDraft);
  const shouldShowStepError = hasEditedPlaybackRate && stepError !== null;
  const shouldShowRangeError = hasEditedPlaybackRate && rangeError !== null;
  const shouldShowVolumeError = hasEditedVolume && volumeError !== null;
  const hasPlaybackRateError = stepError !== null || rangeError !== null;
  const hasSeekError = Object.values(seekErrors).some((error) => error !== null);
  const draftSettings = getDraftSettings(settings, playbackRateDraft, volumeDraft, seekDraft);
  const hasUnsavedChanges = haveEditableSettingsChanged(settings, draftSettings);

  useEffect(() => {
    void readSettings().then((savedSettings) => {
      setSettings(savedSettings);
      setPlaybackRateDraft(getPlaybackRateDraft(savedSettings));
      setVolumeDraft(getVolumeDraft(savedSettings));
      setSeekDraft(getSeekDraft(savedSettings));
    });
  }, []);

  /** Updates one editable playback-speed value without restricting interim input. */
  function updatePlaybackRate(key: keyof PlaybackRateDraft, value: string): void {
    setPlaybackRateDraft((current) => ({ ...current, [key]: value }));
    setStatus('');
  }

  /** Rounds one completed playback-speed input to its compact two-decimal display value. */
  function formatPlaybackRateField(key: keyof PlaybackRateDraft): void {
    const value = parseDecimal(playbackRateDraft[key]);
    if (value !== null) updatePlaybackRate(key, formatCompactNumber(value));
  }

  /** Updates the editable volume step without restricting interim input. */
  function updateVolumeStep(value: string): void {
    setVolumeDraft({ step: value });
    setStatus('');
  }

  /** Rounds the completed volume-step input to its compact two-decimal display value. */
  function formatVolumeStep(): void {
    const value = parseDecimal(volumeDraft.step);
    if (value !== null) updateVolumeStep(formatCompactNumber(value));
  }

  /** Updates one editable seek duration without restricting interim input. */
  function updateSeekDuration(key: keyof SeekDraft, value: string): void {
    setSeekDraft((current) => ({ ...current, [key]: value }));
    setStatus('');
  }

  /** Saves validated settings to extension storage. */
  async function save(): Promise<void> {
    if (hasPlaybackRateError || volumeError || hasSeekError || !draftSettings) return;
    await writeSettings(draftSettings);
    setSettings(draftSettings);
    setStatus('Saved');
  }

  /** Restores default values in the form without saving them. */
  function reset(): void {
    const defaultSettings = structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG);
    setPlaybackRateDraft(getPlaybackRateDraft(defaultSettings));
    setVolumeDraft(getVolumeDraft(defaultSettings));
    setSeekDraft(getSeekDraft(defaultSettings));
    setHasEditedPlaybackRate(false);
    setHasEditedVolume(false);
    setHasEditedSeek(false);
    setStatus('Defaults restored — save to apply');
  }

  return (
    <main>
      <header>
        <p>LunaV</p>
        <div className="title-row"><h1>Settings</h1><span>{status}</span></div>
      </header>
      <section>
        <h2>Playback speed</h2>
        <div className="speed-controls">
          <span className="keys"><kbd>[</kbd><kbd>]</kbd></span>
          <div className="playback-fields">
            <label className="aligned-field"><span>Step</span><input aria-invalid={shouldShowStepError} inputMode="decimal" type="text" value={playbackRateDraft.step} onBlur={() => { setHasEditedPlaybackRate(true); formatPlaybackRateField('step'); }} onChange={(event) => updatePlaybackRate('step', event.target.value)} /></label>
            <label className="aligned-field"><span>Range</span><span className={`range-input${shouldShowRangeError ? ' has-error' : ''}`}><input aria-label="Minimum speed" inputMode="decimal" type="text" value={playbackRateDraft.min} onBlur={() => { setHasEditedPlaybackRate(true); formatPlaybackRateField('min'); }} onChange={(event) => updatePlaybackRate('min', event.target.value)} /><strong aria-hidden="true">–</strong><input aria-label="Maximum speed" inputMode="decimal" type="text" value={playbackRateDraft.max} onBlur={() => { setHasEditedPlaybackRate(true); formatPlaybackRateField('max'); }} onChange={(event) => updatePlaybackRate('max', event.target.value)} /></span></label>
          </div>
        </div>
        {(shouldShowStepError || shouldShowRangeError) && <div className="field-errors" role="alert">{shouldShowStepError && <p>{stepError}</p>}{shouldShowRangeError && <p>{rangeError}</p>}</div>}
      </section>
      <section>
        <h2>Volume</h2>
        <div className="speed-controls">
          <span className="keys"><kbd>;</kbd><kbd>'</kbd></span>
          <label className="aligned-field"><span>Step</span><input aria-invalid={shouldShowVolumeError} inputMode="decimal" type="text" value={volumeDraft.step} onBlur={() => { setHasEditedVolume(true); formatVolumeStep(); }} onChange={(event) => updateVolumeStep(event.target.value)} /></label>
        </div>
        {shouldShowVolumeError && <div className="field-errors" role="alert"><p>{volumeError}</p></div>}
      </section>
      <section>
        <h2>Seeking</h2>
        <div className="seek-controls">
          {SEEK_FIELDS.map(([key, label, keys]) => {
            const error = seekErrors[key];
            const shouldShowError = hasEditedSeek && error !== null;
            return <div className="seek-row" key={key}><span className="keys">{keys.map((shortcut) => <kbd key={shortcut}>{shortcut}</kbd>)}</span><label className="seek-field"><span>{label}</span><input aria-invalid={shouldShowError} inputMode="decimal" type="text" value={seekDraft[key]} onBlur={() => setHasEditedSeek(true)} onChange={(event) => updateSeekDuration(key, event.target.value)} />{shouldShowError && <p className="seek-field-error" role="alert">{error}</p>}</label></div>;
          })}
        </div>
      </section>
      <footer><button onClick={reset}>Reset</button><button className="primary" disabled={hasPlaybackRateError || volumeError !== null || hasSeekError || !hasUnsavedChanges} onClick={() => void save()}>Save</button></footer>
    </main>
  );
}
