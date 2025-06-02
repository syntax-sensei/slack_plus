export async function generateReplySuggestions(
  messageContent: string,
  threadContext: string[],
  organizationContext?: string
): Promise<string[]> {
  try {
    const response = await fetch('/api/ai/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageContent,
        threadContext,
        organizationContext,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate suggestions');
    }

    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error('Error generating reply suggestions:', error);
    return [];
  }
} 