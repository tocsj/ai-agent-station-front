# Frontend Page Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure content automation, document workspace, resume evaluation, mock interview, and audit pages can restore active or recent backend state after route switching or browser refresh.

**Architecture:** Add a small restore utility for polling/session persistence, then update each page to hydrate from backend active/recent APIs on mount. Backend responses remain the source of truth; page-local state only mirrors backend state and controls polling/UI hints.

**Tech Stack:** React, TypeScript, fetch API, sessionStorage/localStorage, existing page components

---

### Task 1: Shared Restore Utilities

**Files:**
- Create: `src/utils/restore.ts`

- [ ] **Step 1: Add storage helpers for restore keys**
- [ ] **Step 2: Add polling helper with start/stop behavior**
- [ ] **Step 3: Add session id helper with unique timestamp format**

### Task 2: Content Automation Restore

**Files:**
- Modify: `src/pages/ContentAutomation.tsx`
- Use: `src/utils/restore.ts`

- [ ] **Step 1: Add active task restore request on page enter**
- [ ] **Step 2: Hydrate detail, steps, publish records from backend**
- [ ] **Step 3: Poll running task every 2-5 seconds**
- [ ] **Step 4: Stop polling on unmount and task completion**
- [ ] **Step 5: Update create/run flow to use unique sessionId**

### Task 3: Document Workspace Restore

**Files:**
- Modify: `src/pages/KnowledgeAssistant.tsx`
- Use: `src/utils/restore.ts`

- [ ] **Step 1: Add active workspace restore on page enter**
- [ ] **Step 2: Load recent document tasks for restored workspace**
- [ ] **Step 3: Restore center result and RAG panel from latest task**
- [ ] **Step 4: Keep history selection detail-only**

### Task 4: Resume Evaluation Restore

**Files:**
- Modify: `src/pages/ResumeAgent.tsx`
- Use: `src/utils/restore.ts`

- [ ] **Step 1: Load recent resume profiles and active evaluation on enter**
- [ ] **Step 2: Hydrate uploaded resume context and report from backend**
- [ ] **Step 3: Poll active evaluation while status is RUNNING**
- [ ] **Step 4: Update evaluation stream to use unique sessionId**

### Task 5: Mock Interview Restore

**Files:**
- Modify: `src/pages/MockInterview.tsx`
- Use: `src/utils/restore.ts`

- [ ] **Step 1: Load active interview session on enter**
- [ ] **Step 2: Hydrate rounds, messages, and analysis from backend**
- [ ] **Step 3: Show running state without auto-reconnecting stream**
- [ ] **Step 4: Update answer flow to use unique sessionId**

### Task 6: Audit Filter Restore

**Files:**
- Modify: `src/pages/Monitor.tsx`
- Use: `src/utils/restore.ts`

- [ ] **Step 1: Persist audit filters to sessionStorage**
- [ ] **Step 2: Restore filters on page enter**
- [ ] **Step 3: Re-fetch dashboard and events from restored filters**

### Task 7: Verification

**Files:**
- Verify: `src/pages/ContentAutomation.tsx`
- Verify: `src/pages/KnowledgeAssistant.tsx`
- Verify: `src/pages/ResumeAgent.tsx`
- Verify: `src/pages/MockInterview.tsx`
- Verify: `src/pages/Monitor.tsx`
- Verify: `src/utils/restore.ts`

- [ ] **Step 1: Run `npx.cmd tsc --noEmit --pretty false`**
- [ ] **Step 2: Smoke-check key routes through the dev server**
- [ ] **Step 3: Confirm unmount does not recreate or resume SSE automatically**
