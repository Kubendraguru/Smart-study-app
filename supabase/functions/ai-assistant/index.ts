// Supabase Edge Function: ai-assistant
// Handles secure student queries with optional PDF or screenshot attachments using Google Gemini API.
// Secret API key (GEMINI_API_KEY) is stored safely in Supabase Environment Secrets and NEVER sent to the client.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_INSTRUCTION = `You are an expert AI Study Assistant for the Smart Study college learning platform.
Your goals:
1. Explain difficult academic topics, computer science concepts, mathematics, and engineering theories in simple, crystal-clear language.
2. If a study material (PDF document or screenshot) is provided:
   - Ground your answers firmly in the content of that material.
   - Summarize, explain key concepts, or solve questions based directly on what is written or illustrated.
   - Clearly distinguish between facts found in the provided material vs. general academic knowledge.
   - If the material does not contain the answer, say so honestly, then provide the general answer if appropriate.
   - Do NOT invent or hallucinate contents of a document.
3. Formatting: Use neat formatting with bullet points, bold key terms, and short readable paragraphs to make learning easy for students.
4. Tone: Encouraging, concise, structured, and academically accurate.`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY is not configured in Supabase secrets. Please set your key in the Secrets tab.",
          isConfigMissing: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { message, history = [], attachment } = body;

    if (!message && !attachment) {
      return new Response(
        JSON.stringify({ error: "Please enter a question or attach study material." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build Gemini contents array
    const contents: any[] = [];

    // Add prior conversation history (keep last 6 turns to keep context lightweight and fast)
    const recentHistory = history.slice(-6);
    for (const turn of recentHistory) {
      contents.push({
        role: turn.role === "user" ? "user" : "model",
        parts: [{ text: turn.text }],
      });
    }

    // Prepare current user turn
    const currentParts: any[] = [];

    // Attach document or screenshot if provided
    if (attachment && attachment.data) {
      const mimeType =
        attachment.mimeType ||
        (attachment.type === "pdf" ? "application/pdf" : "image/jpeg");

      currentParts.push({
        inlineData: {
          mimeType,
          data: attachment.data,
        },
      });

      currentParts.push({
        text: `[Attached Material: "${attachment.name}" (${attachment.type.toUpperCase()})]\n\nStudent question: ${message || "Please summarize and explain the main concepts in this material."}`,
      });
    } else {
      currentParts.push({
        text: message,
      });
    }

    contents.push({
      role: "user",
      parts: currentParts,
    });

    const requestPayload = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    };

    // Candidate models to try in order of preference.
    // gemini-2.0-flash-lite and gemini-2.0-flash provide high throughput to avoid traffic spikes.
    const candidateModels = [
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-3.6-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
    ];

    let geminiResponse: Response | null = null;
    let lastErrorText = "";

    // Try candidate models with instant failover on traffic spikes or model unavailability
    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (res.ok) {
        geminiResponse = res;
        break;
      } else {
        lastErrorText = await res.text();
        console.warn(`Model ${model} returned ${res.status}: ${lastErrorText}`);

        // Fail over immediately if model is experiencing high demand (503), rate limit (429), or is retired/not found (404/400)
        const shouldFailover =
          res.status === 503 ||
          res.status === 429 ||
          res.status === 404 ||
          lastErrorText.includes("high demand") ||
          lastErrorText.includes("overloaded") ||
          lastErrorText.includes("exhausted") ||
          lastErrorText.includes("no longer available") ||
          lastErrorText.includes("not found");

        if (shouldFailover) {
          continue; // Instantly try the next available model
        } else {
          geminiResponse = res;
          break;
        }
      }
    }

    // Dynamic model discovery if all hardcoded candidate models were unavailable
    if (!geminiResponse || !geminiResponse.ok) {
      if (
        lastErrorText.includes("not found") ||
        lastErrorText.includes("404") ||
        lastErrorText.includes("no longer available") ||
        lastErrorText.includes("high demand")
      ) {
        try {
          const listRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          if (listRes.ok) {
            const listData = await listRes.json();
            const supported = (listData.models || []).find((m: any) =>
              (m.supportedGenerationMethods || []).includes("generateContent") &&
              m.name?.includes("gemini")
            );

            if (supported?.name) {
              const modelPath = supported.name.replace(/^models\//, "");
              const dynamicUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:generateContent?key=${apiKey}`;
              const dynRes = await fetch(dynamicUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestPayload),
              });

              if (dynRes.ok) {
                geminiResponse = dynRes;
              } else {
                lastErrorText = await dynRes.text();
              }
            }
          }
        } catch (e) {
          console.error("Error querying models.list fallback:", e);
        }
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      let parsedErrMessage = "AI service request failed";
      try {
        const parsed = JSON.parse(lastErrorText);
        parsedErrMessage = parsed.error?.message || parsedErrMessage;
      } catch {
        if (lastErrorText) parsedErrMessage = lastErrorText;
      }

      return new Response(
        JSON.stringify({
          error: `Gemini API Error: ${parsedErrMessage}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const candidate = geminiData.candidates?.[0];
    const answer =
      candidate?.content?.parts?.map((p: any) => p.text).join("\n") ||
      "No response generated. Please rephrase your question.";

    return new Response(
      JSON.stringify({
        success: true,
        answer,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
