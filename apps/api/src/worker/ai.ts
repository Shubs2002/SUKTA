export async function askAI(
  content: string,
  question: string
): Promise<string> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that answers questions about website content. Be concise and accurate.",
            },
            {
              role: "user",
              content: `Based on the following website content, answer the question.\n\nWebsite Content:\n${content}\n\nQuestion: ${question}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No answer generated";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`AI processing failed: ${message}`);
  }
}
