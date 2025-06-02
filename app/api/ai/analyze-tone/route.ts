import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messageContent } = await request.json();

    if (!messageContent || typeof messageContent !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: messageContent must be a non-empty string' },
        { status: 400 }
      );
    }

    const prompt = `Analyze the tone and impact of the following message. Provide a concise assessment using labels like: Aggressive, Weak, Confusing, High-Impact, Low-Impact, Neutral, Positive, Negative. If applicable, provide a brief (one sentence) explanation.

Message: "${messageContent}"

Analysis:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or a more suitable model if needed
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes the tone and impact of text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 100,
    });

    const analysis = completion.choices[0].message.content?.trim() || 'Could not analyze tone.';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing tone:', error);
    return NextResponse.json(
      { error: 'Failed to analyze tone' },
      { status: 500 }
    );
  }
} 