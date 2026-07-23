import { useCallback, useState } from 'react';

import { ensureTitleReference } from '@/features/tracking/api';
import { supabase } from '@/lib/supabase/client';
import { tmdb } from '@/lib/tmdb/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import type { TitleSummary, WatchStatus } from '@/types/domain';

/** Cap per run — TMDB proxy allows ~60 searches/min; paste in chunks for more. */
const MAX_ROWS = 100;
const ROW_DELAY_MS = 150;

export interface ImportProgress {
  processed: number;
  total: number;
  imported: number;
}

export interface ImportResult {
  imported: number;
  failed: number;
  total: number;
}

/** Minimal RFC-4180 CSV parser (handles quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function validRating(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0.5 || n > 5 || n * 2 !== Math.floor(n * 2)) return null;
  return n;
}

function validDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^\d{4}-\d{2}-\d{2}$/);
  return m ? raw.trim() : null;
}

/**
 * Import a Letterboxd CSV export (diary/watched/ratings). Movies only. Writes
 * quiet watched + diary rows directly (no feed activity, no log_title rate cap),
 * matching titles via TMDB search + release-year.
 */
export function useLetterboxdImport() {
  const userId = useCurrentUserId();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importOne = useCallback(
    async (match: TitleSummary, rating: number | null, watchedAt: string | null, isRewatch: boolean) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      const titleId = await ensureTitleReference(match);
      await supabase.from('user_title_status').upsert(
        {
          user_id: userId,
          title_id: titleId,
          status: 'watched' as WatchStatus,
          rating,
          watched_at: watchedAt,
        },
        { onConflict: 'user_id,title_id' },
      );
      if (watchedAt) {
        await supabase.from('diary_entries').insert({
          user_id: userId,
          title_id: titleId,
          watched_at: watchedAt,
          rating,
          is_rewatch: isRewatch,
        });
      }
    },
    [userId],
  );

  const run = useCallback(
    async (csvText: string) => {
      setError(null);
      setResult(null);
      const rows = parseCsv(csvText).filter((r) => r.some((c) => c.trim() !== ''));
      if (rows.length < 2) {
        setError('That doesn’t look like a Letterboxd CSV export.');
        return;
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const col = (name: string) => header.indexOf(name);
      const iName = col('name');
      const iYear = col('year');
      const iRating = col('rating');
      const iRewatch = col('rewatch');
      const iWatched = col('watched date');
      const iDate = col('date');
      if (iName < 0) {
        setError('CSV is missing a “Name” column.');
        return;
      }

      const data = rows.slice(1).slice(0, MAX_ROWS);
      setRunning(true);
      setProgress({ processed: 0, total: data.length, imported: 0 });
      let imported = 0;
      let failed = 0;

      for (let i = 0; i < data.length; i++) {
        const r = data[i];
        const name = r[iName]?.trim();
        try {
          if (!name) {
            failed++;
          } else {
            const year = iYear >= 0 ? Number.parseInt(r[iYear] ?? '', 10) : undefined;
            const results = await tmdb.searchMovies(name);
            const match =
              (year ? results.results.find((t) => t.releaseYear === year) : undefined) ??
              results.results[0];
            if (!match) {
              failed++;
            } else {
              const rating = iRating >= 0 ? validRating(r[iRating]) : null;
              const watchedAt =
                (iWatched >= 0 ? validDate(r[iWatched]) : null) ??
                (iDate >= 0 ? validDate(r[iDate]) : null);
              const isRewatch = iRewatch >= 0 && /^y/i.test((r[iRewatch] ?? '').trim());
              await importOne(match, rating, watchedAt, isRewatch);
              imported++;
            }
          }
        } catch {
          failed++;
        }
        setProgress({ processed: i + 1, total: data.length, imported });
        await new Promise((resolve) => setTimeout(resolve, ROW_DELAY_MS));
      }

      setRunning(false);
      setResult({ imported, failed, total: data.length });
    },
    [importOne],
  );

  return { run, running, progress, result, error };
}
