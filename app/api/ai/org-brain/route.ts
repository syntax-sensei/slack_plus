import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase'; // Assuming supabase is initialized here

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      console.error('Org Brain API Error: Invalid input received', { query });
      return NextResponse.json(
        { error: 'Invalid input: query must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
       console.error('Org Brain API Error: OPENAI_API_KEY environment variable not set.');
       return NextResponse.json(
         { error: 'Server configuration error: OpenAI API key is missing.' },
         { status: 500 }
       );
    }

    // --- Data Fetching from all channels ---
    const { data: allChannels, error: allChannelsError } = await supabase
      .from('channels')
      .select('id, name'); // Fetch both id and name

    if (allChannelsError || !allChannels) {
      console.error('Org Brain API Error: Could not fetch all channels:', allChannelsError);
      return NextResponse.json(
        { error: 'Configuration error: Could not retrieve channels.' },
        { status: 500 }
      );
    }

    let combinedContent: string[] = [];

    for (const channel of allChannels) {
      // Fetch recent messages for this channel (e.g., last 50)
      const { data: recentMessages, error: messagesError } = await supabase
        .from('messages')
        .select('content, created_at, users(username)')
        .eq('channel_id', channel.id)
        .is('parent_message_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) {
        console.error(`Org Brain API Error: Error fetching recent messages for channel ${channel.name}:`, messagesError);
        // Continue even if fetching messages for one channel fails
      }

      // Fetch pinned messages for this channel
      const { data: pinnedMessages, error: pinnedError } = await supabase
        .from('messages')
        .select('content, created_at, users(username)')
        .eq('channel_id', channel.id)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });

      if (pinnedError) {
        console.error(`Org Brain API Error: Error fetching pinned messages for channel ${channel.name}:`, pinnedError);
        // Continue even if fetching pinned messages for one channel fails
      }

      // Format content for context, including channel name
      const formatMessageContent = (messages: any[] | null, channelName: string) => {
        if (!messages) return [];
        return messages.map(msg => {
           const username = msg.users?.username || 'Unknown User';
           const time = new Date(msg.created_at).toLocaleString();
           return `[${channelName}] ${username} (${time}): ${msg.content}`;
        });
      }

      const formattedRecentMessages = formatMessageContent(recentMessages, channel.name);
      const formattedPinnedMessages = formatMessageContent(pinnedMessages, channel.name);

      combinedContent = [
        ...combinedContent,
        ...formattedRecentMessages,
        ...formattedPinnedMessages,
      ];
    }

    const allContent = combinedContent.join('\n\n');

    if (!allContent.trim()) {
       console.warn('Org Brain API Warning: No relevant content found across all channels for analysis.');
       return NextResponse.json(
         { analysis: "Could not retrieve relevant information from public channels." },
         { status: 200 }
       );
    }

    // --- GPT API Call ---
    const prompt = `You are an AI assistant that answers questions based on the provided context from a Slack-like application.
    Analyze the following context from various chat channels and pinned documents to answer the user's query.
    Each message is prefixed with the channel name in brackets, like [channel-name]. Pay attention to which channel the information comes from.
    Focus on synthesizing information from the provided text. 
    If you cannot find relevant information in the context to fully answer the query, state that you don't have enough information in the provided context.
    Keep the answer concise.

    Context:
    ${allContent}

    User Query: "${query}"

    Answer:`;

    console.log('Org Brain API: Sending query to OpenAI:', query);

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Or a more suitable model
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant providing summaries based on organizational knowledge from chat logs across channels."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000, // Increased max tokens to handle more context
      });
    } catch (openaiError) {
       console.error('Org Brain API Error: OpenAI API call failed:', openaiError);
       const errorDetail = openaiError instanceof Error ? openaiError.message : 'An error occurred with the OpenAI API.';
       return NextResponse.json(
         { error: `AI processing failed: ${errorDetail}` },
         { status: 500 }
       );
    }

    const analysis = completion.choices[0].message.content?.trim() || "Could not generate a summary.";

    console.log('Org Brain API: Successfully generated analysis.');
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Org Brain API Error: Uncaught error processing request:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while processing your query.' },
      { status: 500 }
    );
  }
} 