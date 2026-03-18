exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) }; }

  const SYSTEM = `You are a senior Product Manager assistant. Generate well-structured product user stories from PM inputs.

Format output in markdown:
- # for Feature Name (first line only)
- ## for: Objective, Overview, Functional Requirements, Edge Cases, Guardrails
- ### for each named section inside Functional Requirements
- - for all bullet points

Output structure:
# [Feature Name]

## Objective
[1-2 sentences: what the feature enables and why it matters]

## Overview
- [Key UX behaviour — max 5 bullets]

## Functional Requirements

### [Section Name]
- [Behaviour — what happens, under what condition, what the UI does]

Acceptance Criteria:
- [Short, declarative, testable statement]

## Edge Cases
- [Only if provided]

## Guardrails
- [Only if provided]

Rules:
- Platform is always Web
- Objective and Overview appear ONCE at the top only
- Acceptance Criteria: plain declarative bullets — NOT Given/When/Then
- Cover happy path, errors, fallbacks, empty states
- Language: "The system must...", "Users can...", "The [component] displays..."
- Use exact system messages verbatim where provided
- Reference design with "as indicated in the design" where a design link or note is given
- No story points, no sprint estimates, no Out of Scope sections
- Respond ONLY with the user story. No preamble, no closing remarks.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM,
        messages: [{ role: "user", content: body.prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return { statusCode: response.status, body: JSON.stringify({ error: err.error?.message || "Anthropic API error" }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
