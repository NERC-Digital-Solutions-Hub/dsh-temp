<script lang="ts">
	import { Button } from '$lib/components/shadcn/button';
	import * as Chat from '$lib/components/shadcn/chat';
	import { Input } from '$lib/components/shadcn/input';
	import ScrollArea from '$lib/components/shadcn/scroll-area/scroll-area.svelte';
	import type { AiUprnChatbotService } from '$lib/services/ai-uprn-chatbot-service';
	import SendIcon from '@lucide/svelte/icons/send';

	// ============================================================================
	// Types
	// ============================================================================

	/**
	 * Props interface for the chat component.
	 */
	type Props = {
		/** The AI chatbot service instance for handling chat interactions */
		aiUprnChatbotService: AiUprnChatbotService;
	};

	/**
	 * Represents a single chat message in the conversation.
	 */
	type ChatMessage = {
		/** Unique identifier for the message sender (1 = bot, 2 = user) */
		senderId: 1 | 2;
		/** The text content of the message */
		message: string;
		/** Formatted timestamp when the message was sent */
		sentAt: string;
	};

	// ============================================================================
	// Constants
	// ============================================================================

	/** Identifier for bot messages */
	const BOT_SENDER_ID = 1;

	/** Identifier for user messages */
	const USER_SENDER_ID = 2;

	/** Default error message shown when AI request fails */
	const ERROR_MESSAGE = 'Sorry, I encountered an error processing your request.';

	/** Initial greeting message from the bot */
	const INITIAL_GREETING = `How can I help?`;

	// ============================================================================
	// Component Props
	// ============================================================================

	const { aiUprnChatbotService }: Props = $props();

	// ============================================================================
	// State
	// ============================================================================

	/** Current message being typed by the user */
	let message = $state('');

	/** Indicates whether the chatbot is currently processing a request */
	let isLoading = $state(false);

	/** Accumulates the streaming response from the AI as it arrives */
	let streamingMessage = $state('');

	/** Reference to the scroll container element */
	let scrollContainer: HTMLDivElement | null = $state(null);

	/** Reference to the form input element */
	let formElement: HTMLFormElement | null = $state(null);

	/** Reference to the message wrapper element for dynamic padding */
	let messageWrapper: HTMLDivElement | null = $state(null);

	/** Array of all messages in the chat conversation */
	const messages = $state<ChatMessage[]>([
		{
			senderId: BOT_SENDER_ID,
			message: INITIAL_GREETING,
			sentAt: formatShortTime(new Date())
		}
	]);

	// ============================================================================
	// Dynamic Height Effect
	// ============================================================================

	/**
	 * Updates the message wrapper's bottom padding based on the form's height.
	 */
	$effect(() => {
		if (formElement && messageWrapper) {
			// Capture references in local constants to satisfy TypeScript
			const form = formElement;
			const wrapper = messageWrapper;

			const updatePadding = () => {
				const formHeight = form.offsetHeight;
				wrapper.style.paddingBottom = `${formHeight}px`;
			};

			// Initial update
			updatePadding();

			// Update on resize
			const resizeObserver = new ResizeObserver(updatePadding);
			resizeObserver.observe(form);

			return () => {
				resizeObserver.disconnect();
			};
		}
	});

	// ============================================================================
	// Auto-scroll Effect
	// ============================================================================

	/**
	 * Automatically scrolls to the bottom when messages change or streaming updates occur.
	 */
	$effect(() => {
		// Track dependencies: messages array and streaming message
		messages.length;
		streamingMessage;

		// Scroll to bottom after a small delay to ensure DOM has updated
		if (scrollContainer) {
			setTimeout(() => {
				// Find the viewport element within the ScrollArea
				const viewport = scrollContainer?.querySelector('[data-slot="scroll-area-viewport"]');
				if (viewport) {
					viewport.scrollTop = viewport.scrollHeight;
				}
			}, 0);
		}
	});

	// ============================================================================
	// Helper Functions
	// ============================================================================

	/**
	 * Formats a Date object into a short time string with AM/PM indicator.
	 * Example output: "10:30 AM" or "3:45 PM"
	 *
	 * @param date - The date object to format
	 * @returns Formatted time string in 12-hour format with AM/PM
	 */
	function formatShortTime(date: Date): string {
		const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		const period = date.getHours() >= 12 ? 'PM' : 'AM';
		return `${time} ${period}`;
	}

	/**
	 * Creates a new chat message object with the current timestamp.
	 *
	 * @param content - The text content of the message
	 * @param senderId - The ID of the sender (BOT_SENDER_ID or USER_SENDER_ID)
	 * @returns A new ChatMessage object
	 */
	function createMessage(content: string, senderId: 1 | 2): ChatMessage {
		return {
			message: content,
			senderId,
			sentAt: formatShortTime(new Date())
		};
	}

	/**
	 * Adds a message to the conversation history.
	 *
	 * @param content - The text content of the message
	 * @param senderId - The ID of the sender (BOT_SENDER_ID or USER_SENDER_ID)
	 */
	function addMessage(content: string, senderId: 1 | 2): void {
		messages.push(createMessage(content, senderId));
	}

	/**
	 * Resets the loading state and clears the streaming message buffer.
	 */
	function resetLoadingState(): void {
		isLoading = false;
		streamingMessage = '';
	}

	// ============================================================================
	// Event Handlers
	// ============================================================================

	/**
	 * Handles streaming chunks of text from the AI response.
	 * Accumulates chunks into the streamingMessage state.
	 *
	 * @param chunk - A piece of the streaming response text
	 */
	function handleStreamChunk(chunk: string): void {
		streamingMessage += chunk;
	}

	/**
	 * Handles the form submission when the user sends a message.
	 * Manages the complete flow of:
	 * 1. Adding the user's message to the chat
	 * 2. Calling the AI service with streaming
	 * 3. Displaying the AI response
	 * 4. Handling errors gracefully
	 *
	 * @param event - The form submission event
	 */
	async function handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();

		// Validate input
		if (!message.trim() || isLoading) {
			return;
		}

		// Store and clear the user's message
		const userMessage = message.trim();
		message = '';

		// Add user's message to chat
		addMessage(userMessage, USER_SENDER_ID);

		// Initialize loading state
		isLoading = true;
		streamingMessage = '';

		try {
			// Call the AI service with streaming callback
			const success = await aiUprnChatbotService.chatStream(userMessage, handleStreamChunk);

			// Add the AI response to chat history
			if (success && streamingMessage) {
				addMessage(streamingMessage, BOT_SENDER_ID);
			} else {
				// Handle error case
				addMessage(ERROR_MESSAGE, BOT_SENDER_ID);
			}
		} catch (error) {
			// Handle unexpected errors
			console.error('Chat error:', error);
			addMessage(ERROR_MESSAGE, BOT_SENDER_ID);
		} finally {
			// Always reset loading state
			resetLoadingState();
		}
	}
</script>

<!-- ============================================================================ -->
<!-- Chat Container -->
<!-- ============================================================================ -->

<div class="chat-container h-full w-full border border-border">
	<div class="message-wrapper" bind:this={messageWrapper}>
		<ScrollArea class="h-full w-full" bind:ref={scrollContainer}>
			<Chat.List>
				<!-- Chat Messages -->
				{#each messages as m (m)}
					<Chat.Bubble variant={m.senderId === USER_SENDER_ID ? 'sent' : 'received'}>
						<Chat.BubbleAvatar />
						<Chat.BubbleMessage class="flex flex-col gap-1">
							<p class="break-words whitespace-pre-wrap">{m.message}</p>
							<div class="w-full text-xs group-data-[variant='sent']/chat-bubble:text-end">
								{m.sentAt}
							</div>
						</Chat.BubbleMessage>
					</Chat.Bubble>
				{/each}

				<!-- Streaming Response Indicator -->
				{#if isLoading}
					<Chat.Bubble variant="received">
						<Chat.BubbleAvatar />
						<Chat.BubbleMessage class="flex flex-col gap-1">
							{#if streamingMessage}
								<p class="break-words whitespace-pre-wrap">{streamingMessage}</p>
							{:else}
								<Chat.BubbleMessage typing />
							{/if}
						</Chat.BubbleMessage>
					</Chat.Bubble>
				{/if}
			</Chat.List>
		</ScrollArea>
	</div>

	<div class="input-wrapper">
		<!-- Message Input Form -->
		<form
			bind:this={formElement}
			onsubmit={handleSubmit}
			class="flex shrink-0 items-center gap-2 border-t border-border bg-background p-2"
		>
			<Input
				bind:value={message}
				class="rounded-full"
				placeholder="Type a message..."
				disabled={isLoading}
			/>
			<Button
				type="submit"
				variant="default"
				size="icon"
				class="shrink-0 rounded-full"
				disabled={message.trim() === '' || isLoading}
			>
				<SendIcon />
			</Button>
		</form>
	</div>
</div>

<style>
	/* Position chat fixed at the bottom of the sidebar */
	.chat-container {
		position: relative;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.input-wrapper {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		background: inherit;
	}

	.message-wrapper {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		/* padding-bottom is set dynamically via JavaScript */
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}
</style>
