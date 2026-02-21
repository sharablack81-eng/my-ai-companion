import type { Message, Conversation } from '@/types/chat';

// --- Core Chat Streaming --- 

export async function streamChat(options: {
  messages: Omit<Message, 'id' | 'created_at'>[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  signal: AbortSignal;
}): Promise<void> {
  const { messages, onDelta, onDone, signal } = options;

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to fetch chat stream');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to read response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep any partial line for the next chunk

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonString = line.slice(6);
          if (jsonString === '[DONE]') {
            return; // Stream finished
          }
          try {
            const parsed = JSON.parse(jsonString);
            // This structure is based on the OpenAI streaming format
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              onDelta(chunk);
            }
          } catch (e) {
            console.error('Failed to parse stream chunk:', jsonString);
          }
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error("Error reading stream:", e);
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}


// --- Mock Conversation Management (for UI development) ---

export async function getConversations(): Promise<Conversation[]> {
  return Promise.resolve([]);
}

export async function createConversation(title: string): Promise<Conversation> {
  const newConversation: Conversation = {
    id: crypto.randomUUID(),
    title: title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return Promise.resolve(newConversation);
}

export async function deleteConversation(id: string): Promise<boolean> {
  console.log(`chat-api: deleteConversation with id "${id}" (mock)`);
  return Promise.resolve(true);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
    console.log(`chat-api: getMessages for conversation "${conversationId}" (mock)`);
    return Promise.resolve([]);
}

export async function saveMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  const newMessage: Message = {
    id: crypto.randomUUID(),
    ...message,
    created_at: new Date().toISOString(),
  };
  return Promise.resolve(newMessage);
}

export async function updateConversationTitle(id: string, title: string): Promise<Conversation> {
    console.log(`chat-api: updateConversationTitle with id "${id}" (mock)`);
    const updatedConversation: Conversation = {
        id: id,
        title: title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    return Promise.resolve(updatedConversation);
}
