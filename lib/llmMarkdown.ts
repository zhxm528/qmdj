export function extractMarkdownFromLLMResponse(data: unknown): string | null {
  const content = (data as any)?.choices?.[0]?.message?.content;
  let text = content;

  if (Array.isArray(text)) {
    text = text
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        if (chunk && typeof chunk === "object" && "text" in chunk) {
          return (chunk as any).text || "";
        }
        return "";
      })
      .join("");
  } else if (text && typeof text === "object" && "text" in text) {
    text = (text as any).text;
  }

  if (typeof text !== "string") {
    return null;
  }

  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}
