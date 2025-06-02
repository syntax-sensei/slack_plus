# Slack AI Clone

A Slack clone application enhanced with experimental AI features.

## Features

This project replicates core Slack functionalities and integrates several AI-powered features using the GPT API.

### Core Features

- Channel browsing and messaging
- Threaded replies
- User mentions
- Message reactions
- Message pinning

### AI Features

Below are the AI features implemented in this project:

#### 1. AI Reply Suggestions

Provides AI-generated reply suggestions for messages. When you click the sparkles icon (✨) on a message, the AI generates a few potential responses based on the message content and thread context. Selecting a suggestion populates the message input box, allowing you to review and edit before sending.

- **Current Scope:** Available on messages in the main channel view.

#### 2. Tone & Impact Meter

Analyzes the tone and potential impact of the message you are currently typing in the input box. It provides a concise assessment using labels like Aggressive, Weak, Confusing, High-Impact, Low-Impact, Neutral, Positive, or Negative.

- **UI:** The analysis is shown as a small, colored tag below the message input box. Colors indicate the tone (e.g., red for aggressive, green for high-impact).

#### 3. Org Brain Plugin

Allows users to ask questions about the content of public channels and pinned documents within the workspace. The AI will attempt to provide a summary based on the available information.

- **Current Scope:** Fetches data from all public channels and their pinned messages.
- **How to use:** Click the "Org Brain" button in the chat header, type your question in the modal, and click "Ask".

## Setup Instructions (How to run locally)

Follow these steps to get the project running on your local machine:

**Prerequisites:**

*   Node.js (v18 or later recommended)
*   pnpm package manager (`npm install -g pnpm` if you don't have it)
*   A Supabase project set up with the necessary database schema (channels, messages, users, reactions tables). Ensure your `invite-codes-schema.sql` is applied.
*   An OpenAI API key.

**Steps:**

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd slack_ai
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**

    Create a `.env.local` file in the root of the project. Add your Supabase and OpenAI API keys:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    OPENAI_API_KEY=YOUR_OPENAI_API_KEY
    ```

    Replace `YOUR_SUPABASE_URL`, `YOUR_SUPABASE_ANON_KEY`, and `YOUR_OPENAI_API_KEY` with your actual credentials.

4.  **Run the development server:**

    ```bash
    pnpm dev
    ```

    The application should now be running at `http://localhost:3000` (or the next available port).

