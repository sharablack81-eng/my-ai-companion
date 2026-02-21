import { Message } from '@/types/chat';

export async function sendMessage(messages: Message[]): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    // If the response is not OK, we need to handle it as an error.
    if (!response.ok) {
      // Try to get a more detailed error message from the response body.
      const errorData = await response.json().catch(() => null); // Gracefully handle if the body isn't JSON
      if (errorData && errorData.error) {
        throw new Error(`Server error: ${errorData.error}`);
      }
      // Fallback to the status text if there's no JSON body.
      throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.reply) {
      return data.reply;
    } else if (data.error) {
      // This handles cases where the server sends a 200 OK status but indicates an error in the JSON body.
      throw new Error(data.error);
    } else {
      // This is a fallback for unexpected successful response structures.
      throw new Error('Received an unexpected response format from the server.');
    }

  } catch (error) {
    // This will catch network errors and errors thrown from the response handling above.
    console.error("Error sending message:", error);
    // We re-throw the error so the UI layer can catch it and display an appropriate message.
    throw error;
  }
}
