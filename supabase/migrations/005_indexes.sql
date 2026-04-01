-- ============================================
-- Cerise Scholar — Performance Indexes
-- Adds indexes on foreign key columns used in WHERE/ORDER BY clauses.
-- ============================================

-- PDFs: queried by project_id in DocumentPanel, project workspace
CREATE INDEX IF NOT EXISTS idx_pdfs_project_id ON public.pdfs(project_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON public.pdfs(user_id);

-- Highlights: queried by pdf_id in useHighlights
CREATE INDEX IF NOT EXISTS idx_highlights_pdf_id ON public.highlights(pdf_id);

-- Annotations: queried by pdf_id and highlight_id in useAnnotations, useLiteratureReview
CREATE INDEX IF NOT EXISTS idx_annotations_pdf_id ON public.annotations(pdf_id);
CREATE INDEX IF NOT EXISTS idx_annotations_highlight_id ON public.annotations(highlight_id);

-- Literature Review Entries: queried by project_id with ordering in useLiteratureReview
CREATE INDEX IF NOT EXISTS idx_lit_review_project_id ON public.literature_review_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_lit_review_pdf_id ON public.literature_review_entries(pdf_id);
CREATE INDEX IF NOT EXISTS idx_lit_review_highlight_id ON public.literature_review_entries(highlight_id);

-- Codes: queried by project_id in useCodes
CREATE INDEX IF NOT EXISTS idx_codes_project_id ON public.codes(project_id);

-- Paper Sections: queried by project_id in usePaperWriter
CREATE INDEX IF NOT EXISTS idx_paper_sections_project_id ON public.paper_sections(project_id);
