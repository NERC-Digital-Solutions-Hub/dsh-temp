import type {
	AiUprnChatbotEndpoints,
	AiUprnChatbotHealthResponse,
	AiUprnChatbotRequest,
	AiUprnChatbotResponse
} from '$lib/types/uprn';

// TODO: Each endpoint needs to be moved into their own class so loading and error can be handled
// more gracefully and consistently across the app.

/**
 * Service for managing the AI UPRN chatbot.
 */
export class AiUprnChatbotService {
	#endpoints: AiUprnChatbotEndpoints;

	constructor(endpoints: AiUprnChatbotEndpoints) {
		this.#endpoints = endpoints;
	}

	/**
	 * Check the health status of the AI UPRN chatbot service.
	 * @returns true if the service is healthy, false otherwise
	 */
	public async getHealth(): Promise<boolean> {
		try {
			const url = `${this.#endpoints.baseUrl}${this.#endpoints.healthRoute}`;
			const response = await fetch(url);

			if (!response.ok) {
				return false;
			}

			const data: AiUprnChatbotHealthResponse = await response.json();
			return data.status === 'ok';
		} catch (error) {
			console.error('Health check failed:', error);
			return false;
		}
	}

	/**
	 * Send a chat query and receive a complete response.
	 * @param query - The user's query string
	 * @returns The chatbot response, or undefined if the request failed
	 */
	public async chat(query: string): Promise<AiUprnChatbotResponse | undefined> {
		try {
			const url = `${this.#endpoints.baseUrl}${this.#endpoints.chatRoute}`;
			const request: AiUprnChatbotRequest = { query };

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			});

			if (!response.ok) {
				console.error('Failed to send chat query:', response.statusText);
				return undefined;
			}

			const data: AiUprnChatbotResponse = await response.json();
			return data;
		} catch (error) {
			console.error('Error sending chat query:', error);
			return undefined;
		}
	}

	/**
	 * Send a chat query and receive a streaming response.
	 * @param query - The user's query string
	 * @param onChunk - Callback function to handle each chunk of streamed text
	 * @returns true if the stream completed successfully, false otherwise
	 */
	public async chatStream(query: string, onChunk: (chunk: string) => void): Promise<boolean> {
		try {
			const url = `${this.#endpoints.baseUrl}${this.#endpoints.chatStreamRoute}`;
			const request: AiUprnChatbotRequest = { query };

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			});

			if (!response.ok) {
				console.error('Failed to start chat stream:', response.statusText);
				return false;
			}

			const reader = response.body?.getReader();
			if (!reader) {
				console.error('No response body reader available');
				return false;
			}

			const decoder = new TextDecoder();
			let done = false;

			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;

				if (value) {
					const chunk = decoder.decode(value, { stream: !done });
					onChunk(chunk);
				}
			}

			return true;
		} catch (error) {
			console.error('Error during chat stream:', error);
			return false;
		}
	}
}
