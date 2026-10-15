// supabase.ts — Centralized Supabase client and persistence layer for TamilVault AI
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PageData } from './App';
import type { PageResult } from './api';

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cxuvnzwzacdinifulnjc.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_FRCfum7b8elSUHHpGh2I_w_v_QK_n13';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Centralized client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Unique stable client ID stored in localStorage to correlate anonymous sessions & preferences
export function getClientId(): string {
  try {
    let cid = localStorage.getItem('tamilvault_client_id');
    if (!cid) {
      cid = 'client_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('tamilvault_client_id', cid);
    }
    return cid;
  } catch {
    return 'client_session';
  }
}

export interface SavedDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  total_pages: number;
  status: string;
  ocr_language: string;
  created_at: string;
  updated_at: string;
  saved_pages_count?: number;
}

// ── Cache for database schema capabilities ────────────────────────────────────
let cachedSupportsHindiColumn: boolean | null = null;

// ── Document Operations ───────────────────────────────────────────────────────

/**
 * Creates or registers a new document record in Supabase.
 * Returns the document UUID.
 */
export async function createDocumentRecord(doc: {
  filename: string;
  file_type: string;
  file_size: number;
  total_pages: number;
  status?: string;
  ocr_language?: string;
}): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        filename: doc.filename,
        file_type: doc.file_type,
        file_size: doc.file_size,
        total_pages: doc.total_pages,
        status: doc.status || 'pending',
        ocr_language: doc.ocr_language || 'tam+eng',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Supabase createDocumentRecord error:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.warn('Supabase createDocumentRecord exception:', err);
    return null;
  }
}

/**
 * Updates document-level status (e.g. 'completed', 'partial', 'failed')
 */
export async function updateDocumentStatus(
  documentId: string,
  status: string,
): Promise<void> {
  if (!supabase || !documentId) return;
  try {
    await supabase
      .from('documents')
      .update({ status })
      .eq('id', documentId);
  } catch (err) {
    console.warn('Supabase updateDocumentStatus exception:', err);
  }
}

/**
 * Updates document total_pages once PDF page count is determined
 */
export async function updateDocumentTotalPages(
  documentId: string,
  totalPages: number,
): Promise<void> {
  if (!supabase || !documentId || totalPages <= 0) return;
  try {
    await supabase
      .from('documents')
      .update({ total_pages: totalPages })
      .eq('id', documentId);
  } catch (err) {
    console.warn('Supabase updateDocumentTotalPages exception:', err);
  }
}

/**
 * Upserts a page record into document_pages.
 * Automatically updates existing page records on retries without duplicating.
 * Includes graceful retry if the optional 'hindi_translation' column has not been migrated yet.
 */
export async function upsertDocumentPage(
  documentId: string,
  page: PageResult | PageData,
): Promise<boolean> {
  if (!supabase || !documentId) return false;
  try {
    const pageNum = page.page_number;
    const rawText = page.raw_text || '';
    const cleanedText = page.cleaned_text || ('tamil_text' in page ? page.tamil_text : '') || '';
    const tamilText = ('tamil_text' in page ? page.tamil_text : cleanedText) || '';
    const translation = page.english_translation || null;
    const hindiTranslation = ('hindi_translation' in page ? page.hindi_translation : null) || null;
    const status = page.status || (page.success ? 'completed' : 'failed');
    const needsReview = Boolean(page.needs_review || status === 'needs_review');
    const source = page.source || 'ocr';
    const model = page.engine_model || ('final_model' in page ? page.final_model : '') || 'gemini';
    const errorDetails = page.error || null;
    const confidence = 'confidence_score' in page && page.confidence_score != null
      ? page.confidence_score
      : null;
    const corrections = 'suggested_corrections' in page && page.suggested_corrections != null
      ? page.suggested_corrections
      : null;

    const basePayload: Record<string, any> = {
      document_id: documentId,
      page_number: pageNum,
      status,
      raw_tamil_text: rawText,
      cleaned_tamil_text: tamilText,
      english_translation: translation,
      suggested_corrections: corrections,
      confidence_score: confidence,
      needs_review: needsReview,
      source,
      engine_model: model,
      error_details: errorDetails,
    };

    // If schema is known to support hindi_translation (or unverified), try with it
    if (cachedSupportsHindiColumn !== false && hindiTranslation !== undefined) {
      const fullPayload = { ...basePayload, hindi_translation: hindiTranslation };
      const { error } = await supabase
        .from('document_pages')
        .upsert(fullPayload, { onConflict: 'document_id, page_number' });

      if (!error) {
        cachedSupportsHindiColumn = true;
        return true;
      }

      // If error indicates column does not exist, cache and fallback without hindi_translation
      const errMsg = error.message || '';
      if (errMsg.includes('hindi_translation') || error.code === '42703' || error.code === 'PGRST204') {
        cachedSupportsHindiColumn = false;
        console.warn('Supabase: hindi_translation column not present in document_pages table; retrying without it.');
      } else {
        console.warn(`Supabase upsert page ${pageNum} error:`, errMsg);
        return false;
      }
    }

    // Upsert without hindi_translation
    const { error: retryErr } = await supabase
      .from('document_pages')
      .upsert(basePayload, { onConflict: 'document_id, page_number' });

    if (retryErr) {
      console.warn(`Supabase upsert page ${pageNum} retry error:`, retryErr.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase upsertDocumentPage exception:', err);
    return false;
  }
}

/**
 * Fetches recent documents saved in Supabase, along with saved OCR page counts.
 */
export async function fetchRecentDocuments(limit = 20): Promise<SavedDocument[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*, document_pages(count)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase fetchRecentDocuments error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => {
      const pageCountArr = row.document_pages;
      const count = Array.isArray(pageCountArr) && pageCountArr[0] && typeof pageCountArr[0].count === 'number'
        ? pageCountArr[0].count
        : 0;
      return {
        id: row.id,
        filename: row.filename,
        file_type: row.file_type,
        file_size: row.file_size,
        total_pages: row.total_pages,
        status: row.status,
        ocr_language: row.ocr_language,
        created_at: row.created_at,
        updated_at: row.updated_at,
        saved_pages_count: count,
      };
    }) as SavedDocument[];
  } catch (err) {
    console.warn('Supabase fetchRecentDocuments exception:', err);
    return [];
  }
}

export interface LoadPagesResult {
  pages: Record<number, PageData>;
  totalLoaded: number;
  error: string | null;
}

/**
 * Loads all saved pages for a document and reconstructs the pagesMap with honest status & integrity.
 */
export async function loadDocumentPagesResult(
  documentId: string,
): Promise<LoadPagesResult> {
  if (!supabase || !documentId) {
    return { pages: {}, totalLoaded: 0, error: 'Database connection unavailable or invalid document ID.' };
  }
  try {
    const { data, error } = await supabase
      .from('document_pages')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (error) {
      console.warn('Supabase loadDocumentPagesMap error:', error.message);
      return { pages: {}, totalLoaded: 0, error: error.message };
    }

    const map: Record<number, PageData> = {};
    (data || []).forEach(row => {
      const pageNum = Number(row.page_number);
      const rawText = row.raw_tamil_text || '';
      const cleanedText = row.cleaned_tamil_text || '';
      const tamilText = cleanedText || rawText || '';
      const hasText = Boolean(tamilText.trim());

      // Honest status resolution matching Requirement 3
      let computedStatus: 'completed' | 'needs_review' | 'failed' | 'pending' = 'pending';
      if (row.status === 'failed' || (!hasText && row.error_details)) {
        computedStatus = 'failed';
      } else if (row.status === 'needs_review' || row.needs_review || (hasText && tamilText.includes('[unclear]'))) {
        computedStatus = 'needs_review';
      } else if (hasText) {
        computedStatus = 'completed';
      } else {
        computedStatus = 'pending';
      }

      map[pageNum] = {
        page_number: pageNum,
        status: computedStatus,
        raw_text: rawText,
        cleaned_text: cleanedText,
        tamil_text: tamilText,
        english_translation: row.english_translation || null,
        hindi_translation: row.hindi_translation || null,
        engine: 'gemini',
        engine_model: row.engine_model || '',
        language: 'tam+eng',
        source: row.source || 'ocr',
        error: row.error_details || null,
        error_category: null,
        needs_review: computedStatus === 'needs_review',
        confidence_score: row.confidence_score != null ? Number(row.confidence_score) : null,
        suggested_corrections: row.suggested_corrections || null,
      };
    });

    return {
      pages: map,
      totalLoaded: Object.keys(map).length,
      error: null,
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Supabase loadDocumentPagesMap exception:', msg);
    return { pages: {}, totalLoaded: 0, error: msg };
  }
}

/**
 * Convenience wrapper returning pages map.
 */
export async function loadDocumentPagesMap(
  documentId: string,
): Promise<Record<number, PageData>> {
  const res = await loadDocumentPagesResult(documentId);
  return res.pages;
}

// ── Document Integrity Checks ─────────────────────────────────────────────────

export interface DocumentIntegrityStats {
  totalExpected: number;
  totalSaved: number;
  completedCount: number;
  reviewCount: number;
  failedCount: number;
  pendingCount: number;
  isComplete: boolean;
  missingPages: number[];
}

export function computeDocumentIntegrity(
  totalExpectedPages: number,
  pagesMap: Record<number, PageData>,
): DocumentIntegrityStats {
  const pageNums = Object.keys(pagesMap).map(Number);
  const maxPage = Math.max(totalExpectedPages || 1, pageNums.length ? Math.max(...pageNums) : 1);
  let completed = 0;
  let review = 0;
  let failed = 0;
  let pending = 0;
  let savedWithContent = 0;
  const missingPages: number[] = [];

  for (let i = 1; i <= maxPage; i++) {
    const p = pagesMap[i];
    if (!p) {
      pending++;
      missingPages.push(i);
      continue;
    }
    const hasContent = Boolean((p.tamil_text || p.cleaned_text || p.raw_text || '').trim());
    if (hasContent) savedWithContent++;

    if (p.status === 'completed') completed++;
    else if (p.status === 'needs_review') review++;
    else if (p.status === 'failed') failed++;
    else {
      pending++;
      if (!hasContent) missingPages.push(i);
    }
  }

  return {
    totalExpected: maxPage,
    totalSaved: savedWithContent,
    completedCount: completed,
    reviewCount: review,
    failedCount: failed,
    pendingCount: pending,
    isComplete: pending === 0 && savedWithContent > 0,
    missingPages,
  };
}

// ── User Preferences ──────────────────────────────────────────────────────────

/**
 * Persists user preference (UI language, OCR default language) in Supabase.
 */
export async function saveUserPreference(prefs: {
  ui_language?: string;
  preferred_ocr_lang?: string;
  enhance_scans?: boolean;
  use_digital_text?: boolean;
}): Promise<void> {
  if (!supabase) return;
  try {
    const clientId = getClientId();
    await supabase
      .from('user_preferences')
      .upsert(
        {
          client_id: clientId,
          ...prefs,
        },
        { onConflict: 'client_id' },
      );
  } catch (err) {
    console.warn('Supabase saveUserPreference exception:', err);
  }
}

/**
 * Loads user preference from Supabase.
 */
export async function loadUserPreference(): Promise<{
  ui_language?: string;
  preferred_ocr_lang?: string;
  enhance_scans?: boolean;
  use_digital_text?: boolean;
} | null> {
  if (!supabase) return null;
  try {
    const clientId = getClientId();
    const { data, error } = await supabase
      .from('user_preferences')
      .select('ui_language, preferred_ocr_lang, enhance_scans, use_digital_text')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
