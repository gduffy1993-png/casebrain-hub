# Stage 2 Router Test Prompts

Use this list to quickly validate routing quality for the Stage 2.5 chat layer.

## How to use

1. Ask each prompt in chat.
2. Check the response shape against "Expected intent" and "Good output should include".
3. Mark pass/fail.
4. If a prompt fails, note what it routed to and what was missing.

---

## Prompts

### 1) Biggest risk
- Prompt: `What's our biggest risk right now?`
- Expected intent: `risk`
- Good output should include:
  - one clear primary risk,
  - what happens if not addressed.

### 2) Risk this week
- Prompt: `What's the danger if we do nothing this week?`
- Expected intent: `risk`
- Good output should include:
  - immediate risk framing,
  - consequence language tied to timing.

### 3) Cross-exam focus
- Prompt: `What should my cross-examination focus be?`
- Expected intent: `cross_exam`
- Good output should include:
  - single cross-exam theme,
  - vulnerable witness angle.

### 4) Attack witness
- Prompt: `How do I challenge this witness effectively?`
- Expected intent: `cross_exam`
- Good output should include:
  - vulnerability rationale,
  - tactical pressure points.

### 5) Disclosure chase
- Prompt: `What disclosure should I chase first?`
- Expected intent: `disclosure`
- Good output should include:
  - priority material list,
  - Crown likely repair moves.

### 6) Missing evidence
- Prompt: `Which missing evidence matters most here?`
- Expected intent: `disclosure`
- Good output should include:
  - concrete missing items,
  - why each changes leverage.

### 7) Next action
- Prompt: `What should I do next on this file?`
- Expected intent: `next_step`
- Good output should include:
  - immediate action list,
  - practical sequencing.

### 8) Next 48 hours
- Prompt: `Give me actions for the next 48 hours.`
- Expected intent: `next_step`
- Good output should include:
  - urgent action items,
  - prevention of Crown clean-up.

### 9) Defence strength
- Prompt: `What are our strongest defence points?`
- Expected intent: `defence_strength`
- Good output should include:
  - top defence angles,
  - evidence-tied reasoning.

### 10) Can we win
- Prompt: `Can we win this case?`
- Expected intent: `defence_strength` (or `general` fallback)
- Good output should include:
  - current position,
  - risk + action caveat.

### 11) General summary
- Prompt: `Give me the overall position on this case.`
- Expected intent: `general`
- Good output should include:
  - strengths,
  - main risk,
  - next actions.

### 12) What matters most
- Prompt: `What matters most right now?`
- Expected intent: `general`
- Good output should include:
  - concise triage output,
  - action orientation.

### 13) Crown repair concern
- Prompt: `What will the Crown try to fix before hearing?`
- Expected intent: `disclosure` (or `risk` depending phrasing)
- Good output should include:
  - repair targets,
  - defence pre-emption.

### 14) Prevent cleanup
- Prompt: `How do we stop the Crown cleaning this up?`
- Expected intent: `next_step`
- Good output should include:
  - correspondence/disclosure locking actions,
  - timing urgency.

### 15) Witness reliability
- Prompt: `Is the witness reliable enough for trial?`
- Expected intent: `cross_exam` (or `risk`)
- Good output should include:
  - reliability pressure points,
  - cross-exam leverage.

### 16) Timeline weakness
- Prompt: `Where is the timeline weakest?`
- Expected intent: `cross_exam` (or `disclosure`)
- Good output should include:
  - chronology/continuity gaps,
  - impact on challenge strategy.

### 17) Immediate checklist
- Prompt: `Give me an immediate checklist before next hearing.`
- Expected intent: `next_step`
- Good output should include:
  - short action checklist,
  - priority ordering.

### 18) Best disclosure lever
- Prompt: `What's the best disclosure lever to press now?`
- Expected intent: `disclosure`
- Good output should include:
  - specific disclosure ask,
  - leverage impact.

### 19) What could hurt us
- Prompt: `What could hurt us most if we delay?`
- Expected intent: `risk`
- Good output should include:
  - delay risk,
  - loss-of-leverage framing.

### 20) Practical briefing
- Prompt: `Brief me like I have 60 seconds before conference.`
- Expected intent: `general`
- Good output should include:
  - concise strengths/risk/actions,
  - no filler.

---

## Pass criteria

- Intent matches expected in at least 16/20 prompts.
- Each response is grounded in case material (no invented facts).
- Action-oriented prompts return practical steps, not generic summaries.
- No API/format regression (still returns standard `reply`).
