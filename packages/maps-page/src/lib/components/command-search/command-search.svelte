<script lang="ts">
	import * as Command from '$lib/components/shadcn/command/index.js';
	import CommandInputAlt from '$lib/components/command/command-input-alt.svelte';
	import CommandVariableContainer from '$lib/components/command/command-variable-container.svelte';
	import * as Card from '$lib/components/shadcn/card/index.js';
	import * as Alert from '$lib/components/shadcn/alert/index.js';
	import Spinner from '$lib/components/shadcn/spinner/spinner.svelte';
	import ScrollArea from '$lib/components/shadcn/scroll-area/scroll-area.svelte';
	import type { MapCommand, MapCommandRuntime, MapCommandSurface } from '$lib/types/maps';
	import CommandReturnButton from './command-return-button.svelte';
	import { cn } from '$lib/utils';
	import type { CommandSearchContext } from '$lib/services/command-search/command-search-context';
	import type { GlobalVariableService } from '$lib/services/command-search/global-variable-service';
	import { onMount } from 'svelte';

	type ClassType<T> = abstract new (...args: any[]) => T;

	type ActiveGlobalVariable = {
		displayName: string;
		id: string;
		classType: ClassType<GlobalVariableService>;
	};

	type Props = {
		ref?: HTMLElement | null;
		class?: string;
		commandSearchContext: CommandSearchContext;
		commands?: MapCommand[];
		placeholder?: string;
		emptyMessage?: string;
	};

	let {
		ref = $bindable<HTMLElement | null>(null),
		class: className,
		commandSearchContext,
		commands: providedCommands = [],
		placeholder = 'Commands... (Ctrl+P or Ctrl+/)',
		emptyMessage = 'No commands found.'
	}: Props = $props();

	let activeCommand = $state<MapCommand | null>(null);
	let activeRuntime = $state<MapCommandRuntime | null>(null);
	let inputSurface = $state<MapCommandSurface | null>(null);
	let contentSurface = $state<MapCommandSurface | null>(null);
	let pendingCommandId = $state<string | null>(null);
	let commandError = $state<Error | null>(null);

	let activeGlobalVariables: ActiveGlobalVariable[] = $state([]);

	let inputValue = $state('');
	let isOpen = $state(false);
	let commandInputPlaceholder = $state(placeholder);
	let activeInputHandler = $state<((value: string) => void) | null>(null);
	let suppressNextInputHandler = false;
	let inputRef = $state<HTMLInputElement | null>(null);
	let preserveActiveCommandOnClose = false;
	let containerRef: HTMLDivElement | null = null;

	let activeSessionCleanup: (() => void) | null = null;

	type RuntimeInputBindingState = {
		id: number;
		commandId: string;
		onInput: (value: string) => void;
		onDetach?: () => void;
		placeholderOverridden: boolean;
		resetValueOnDetach: boolean;
	};

	let runtimeInputBindingSeed = 0;
	let runtimeInputBindingState: RuntimeInputBindingState | null = null;

	$effect(() => {
		if (!inputValue) {
			return;
		}

		console.log('Input Value Changed:', inputValue);
	});

	const registry = $derived.by(() => {
		const deduped = new Map<string, MapCommand>();
		for (const command of providedCommands) {
			if(!command.id) {
				console.warn('Command is missing an id and will be skipped:', command);
				continue;
			}
			
			deduped.set(command.id, command);
		}
		return Array.from(deduped.values());
	});

	const groupedCommands = $derived.by(() => {
		const groups = new Map<string | null, MapCommand[]>();
		for (const command of registry) {
			const key = command.group ?? null;
			const bucket = groups.get(key);
			if (bucket) {
				bucket.push(command);
			} else {
				groups.set(key, [command]);
			}
		}

		return groups;
	});

	const currentPlaceholder = $derived(
		activeCommand
			? (activeCommand.inputPlaceholder ?? commandInputPlaceholder)
			: commandInputPlaceholder
	);

	onMount(() => {
		refreshActiveGlobalVariables();
	});

	function setInputValueInternal(value: string, suppressHandler = false) {
		if (suppressHandler) {
			suppressNextInputHandler = true;
		}
		inputValue = value;
	}

	// Central cleanup for any runtime that hooked into the shared command input.
	function clearRuntimeInputBinding(
		target: RuntimeInputBindingState | null = null,
		options?: { skipReset?: boolean; forceReset?: boolean }
	) {
		if (!runtimeInputBindingState) {
			return;
		}

		if (target && runtimeInputBindingState !== target) {
			return;
		}

		activeInputHandler = null;

		if (runtimeInputBindingState.placeholderOverridden) {
			commandInputPlaceholder = placeholder;
		}

		const shouldReset =
			options?.forceReset ??
			(options?.skipReset ? false : runtimeInputBindingState.resetValueOnDetach);

		if (shouldReset) {
			setInputValueInternal('', true);
			runtimeInputBindingState.onInput('');
		}

		runtimeInputBindingState.onDetach?.();
		runtimeInputBindingState = null;
	}

	function resetInputControlState() {
		clearRuntimeInputBinding(null, { forceReset: true });
		activeInputHandler = null;
		commandInputPlaceholder = placeholder;
		suppressNextInputHandler = false;
	}

	$effect(() => {
		const handler = activeInputHandler;
		if (!handler) {
			return;
		}

		if (suppressNextInputHandler) {
			suppressNextInputHandler = false;
			return;
		}

		handler(inputValue);
	});

	$effect(() => {
		if (!activeCommand) {
			commandInputPlaceholder = placeholder;
		}
	});

	function teardownActiveSession() {
		if (activeSessionCleanup) {
			try {
				activeSessionCleanup();
			} catch (error) {
				console.error('Failed to dispose command session', error);
			}
		}

		activeSessionCleanup = null;
		inputSurface = null;
		contentSurface = null;
		resetInputControlState();
		activeRuntime = null;
	}

	function deactivateActiveCommand() {
		if (!activeCommand) {
			return;
		}

		teardownActiveSession();
		activeCommand = null;
		commandError = null;
		pendingCommandId = null;
		setInputValueInternal('', true);
		isOpen = true;
	}

	function handleGlobalVariableClose(variable: ActiveGlobalVariable) {
		try {
			const service = commandSearchContext.get(variable.classType);
			service.clear();
		} catch (error) {
			console.error('Failed to clear global variable', error);
		} finally {
			refreshActiveGlobalVariables();
		}
	}

	function blurInput() {
		inputRef?.blur();
	}

	function createSurfaceFromCommand(
		command: MapCommand,
		runtime: MapCommandRuntime
	): MapCommandSurface | null {
		if (!command.component) {
			return null;
		}

		const propsFactory = command.props;
		if (!propsFactory) {
			return { component: command.component };
		}

		return {
			component: command.component,
			props: () => propsFactory(runtime)
		};
	}

	function initializeSession(command: MapCommand, runtime: MapCommandRuntime) {
		const session = command.createSession?.(runtime);

		if (session) {
			activeSessionCleanup = session.dispose ?? null;

			if (Object.prototype.hasOwnProperty.call(session, 'input')) {
				inputSurface = session.input ?? null;
			} else {
				inputSurface = null;
			}

			if (Object.prototype.hasOwnProperty.call(session, 'content')) {
				contentSurface = session.content ?? null;
			} else {
				contentSurface = createSurfaceFromCommand(command, runtime);
			}

			return;
		}

		activeSessionCleanup = null;
		inputSurface = null;
		contentSurface = createSurfaceFromCommand(command, runtime);
	}

	function createRuntime(command: MapCommand): MapCommandRuntime {
		const commandId = command.id;

		return {
			getContext: () => commandSearchContext,
			deactivate: () => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				deactivateActiveCommand();
				refreshActiveGlobalVariables();
			},
			isActive: (commandIdOverride?: string) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return false;
				}
				return commandIdOverride ? activeCommand.id === commandIdOverride : true;
			},
			setIsOpen: (open: boolean, options?: { preserveActive?: boolean }) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}

				if (open) {
					preserveActiveCommandOnClose = false;
					isOpen = true;
					return;
				}

				const preserveActive = options?.preserveActive ?? true;
				closePanel(preserveActive);
			},
			setInputSurface: (surface) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				inputSurface = surface;
			},
			setContentSurface: (surface) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				contentSurface = surface;
			},
			getInputValue: () => inputValue,
			setInputValue: (value) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				setInputValueInternal(value, true);
			},
			setInputHandler: (handler) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				clearRuntimeInputBinding(null, { skipReset: true });
				activeInputHandler = handler;
				if (!handler) {
					suppressNextInputHandler = false;
					return;
				}
				handler(inputValue);
			},
			setPlaceholder: (value) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				commandInputPlaceholder = value;
			},
			resetPlaceholder: () => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return;
				}
				commandInputPlaceholder = placeholder;
			},
			attachInputBinding: (options) => {
				if (!activeCommand || activeCommand.id !== commandId) {
					return () => {};
				}

				clearRuntimeInputBinding(null, { skipReset: true });

				const placeholderValue =
					options.placeholder ?? activeCommand.inputPlaceholder ?? placeholder;

				const bindingState: RuntimeInputBindingState = {
					id: ++runtimeInputBindingSeed,
					commandId,
					onInput: options.onInput,
					onDetach: options.onDetach,
					placeholderOverridden: Boolean(placeholderValue),
					resetValueOnDetach: options.resetValueOnDetach ?? true
				};

				runtimeInputBindingState = bindingState;

				if (bindingState.placeholderOverridden && placeholderValue) {
					commandInputPlaceholder = placeholderValue;
				}

				activeInputHandler = (value) => {
					if (!runtimeInputBindingState || runtimeInputBindingState.id !== bindingState.id) {
						return;
					}
					options.onInput(value);
				};

				const resetOnAttach = options.resetValueOnAttach ?? true;
				const replayInitialValue = options.replayInitialValue ?? !resetOnAttach;

				if (resetOnAttach) {
					setInputValueInternal('', true);
					options.onInput('');
				} else if (replayInitialValue) {
					options.onInput(inputValue);
				}

				return () => {
					clearRuntimeInputBinding(bindingState);
				};
			}
		};
	}

	function resolveSurfaceProps(surface: MapCommandSurface | null): Record<string, unknown> {
		const runtime = activeRuntime;

		if (!surface) {
			return runtime ? { runtime } : {};
		}

		if (!runtime) {
			return {};
		}

		const { props } = surface;

		if (!props) {
			return { runtime };
		}

		const resolved = typeof props === 'function' ? props(runtime) : props;
		return {
			...resolved,
			runtime
		};
	}

	function getCommandValue(command: MapCommand) {
		return `${command.name} ${command.id ?? ''}`.trim();
	}

	async function runCommand(command: MapCommand) {
		if (activeCommand?.id === command.id) {
			deactivateActiveCommand();
			return;
		}

		teardownActiveSession();
		commandError = null;
		pendingCommandId = command.id;
		isOpen = true;

		// Focus the input when activating a command
		if (inputRef) {
			inputRef.focus();
		}

		const runtime = createRuntime(command);
		activeRuntime = runtime;
		activeCommand = command;

		initializeSession(command, runtime);

		try {
			await command.execute(runtime);
		} catch (error) {
			commandError = error instanceof Error ? error : new Error('Failed to execute the command.');
		} finally {
			pendingCommandId = null;
			setInputValueInternal('', true);
			refreshActiveGlobalVariables();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		const key = event.key.toLowerCase();
		const isCommandShortcut = event.metaKey || event.ctrlKey;

		if (isCommandShortcut && (key === 'p' || key === '/')) {
			event.preventDefault();
			if (activeCommand) {
				deactivateActiveCommand();
				return;
			}
			// Focus input and let the focus handler open the panel
			if (inputRef) {
				inputRef.focus();
			}
			return;
		}

		if (key === 'escape') {
			if (activeCommand) {
				event.preventDefault();
				deactivateActiveCommand();
				return;
			}

			if (isOpen) {
				event.preventDefault();
				isOpen = false;
				blurInput();
			}
			return;
		}

		if (activeCommand) {
			return;
		}

		for (const command of registry) {
			if (!command.shortcut) {
				continue;
			}

			const shortcutString = command.shortcut.join(' ').toLowerCase();
			const pressedKeys = [];
			if (event.metaKey) pressedKeys.push('⌘');
			if (event.ctrlKey) pressedKeys.push('Ctrl');
			if (event.altKey) pressedKeys.push('Alt');
			if (event.shiftKey) pressedKeys.push('Shift');
			pressedKeys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
			const pressedString = pressedKeys.join(' ').toLowerCase();

			if (pressedString !== shortcutString.toLowerCase()) {
				continue;
			}

			event.preventDefault();
			runCommand(command);
			break;
		}
	}

	function handleInputFocus() {
		isOpen = true;
	}

	function closePanel(preserveActive = false) {
		preserveActiveCommandOnClose = preserveActive;
		isOpen = false;

		blurInput();
	}

	function handlePointerDown(event: PointerEvent) {
		const container = containerRef;
		if (!container) {
			return;
		}

		const target = event.target as Node | null;
		if (target && container.contains(target)) {
			return;
		}

		if (!isOpen) {
			return;
		}

		closePanel(Boolean(activeCommand));
	}

	$effect(() => {
		if (isOpen) {
			return;
		}

		setInputValueInternal('', true);

		if (!activeCommand) {
			preserveActiveCommandOnClose = false;
			return;
		}

		if (preserveActiveCommandOnClose) {
			preserveActiveCommandOnClose = false;
			return;
		}

		teardownActiveSession();
		activeCommand = null;
		commandError = null;
	});

	/**
	 * Refresh the list of active global variables from the command search context
	 */
	function refreshActiveGlobalVariables() {
		if (!commandSearchContext) {
			activeGlobalVariables = [];
			return;
		}

		const globals = commandSearchContext.getGlobalVariables();
		const nextVariables: ActiveGlobalVariable[] = [];
		for (const service of globals) {
			const id = service.getId();
			if (!id) {
				continue;
			}
			nextVariables.push({
				displayName: service.displayName,
				id,
				classType: service.constructor as ClassType<GlobalVariableService>
			});
		}
		activeGlobalVariables = nextVariables;
	}
</script>

<svelte:document onkeydown={handleKeydown} />
<svelte:window onpointerdown={handlePointerDown} />

<div class={cn('space-y-4', className)} bind:this={containerRef} bind:this={ref}>
	<Command.Root class="border-1 shadow-md">
		<CommandInputAlt
			placeholder={activeCommand
				? (activeCommand.inputPlaceholder ?? commandInputPlaceholder)
				: commandInputPlaceholder}
			bind:value={inputValue}
			bind:ref={inputRef}
			onfocus={() => handleInputFocus()}
			icon={activeCommand ? CommandReturnButton : undefined}
			iconProps={activeCommand
				? {
						onPress: deactivateActiveCommand,
						disabled: pendingCommandId === activeCommand.id
					}
				: undefined}
			commandId={activeCommand?.id}
			onCommandClose={activeCommand ? deactivateActiveCommand : null}
		/>
		{#if isOpen}
			{#if activeGlobalVariables.length}
				<div class="flex flex-wrap gap-2 px-2 py-0.5">
					{#each activeGlobalVariables as globalVar (globalVar.id)}
						<CommandVariableContainer
							value={`${globalVar.displayName}: ${globalVar.id}`}
							title={`${globalVar.displayName}: ${globalVar.id}`}
							onClose={() => handleGlobalVariableClose(globalVar)}
						/>
					{/each}
				</div>
				<!-- <div class="h-px bg-border"></div> -->
			{/if}
			{#if !activeCommand}
				<ScrollArea>
					<Command.List>
						<Command.Empty>{emptyMessage}</Command.Empty>

						{#each Array.from(groupedCommands.entries()) as [groupName, commands]}
							{#each commands as command (command.id)}
								<Command.Item value={getCommandValue(command)} onclick={() => runCommand(command)}>
									<div class="flex flex-col gap-0.5">
										<span class="text-sm leading-tight font-medium">{command.name}</span>
										{#if command.description}
											<span class="text-xs text-muted-foreground">{command.description}</span>
										{/if}
									</div>
									{#if pendingCommandId === command.id}
										<Spinner class="ml-auto size-4 text-muted-foreground" />
									{:else if command.shortcut?.length}
										<Command.Shortcut>
											{command.shortcut?.join(' + ')}
										</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						{/each}
					</Command.List>
				</ScrollArea>
			{:else}
				{#if inputSurface}
					{@const InputComponent = inputSurface.component}
					<div class="px-4 pb-3">
						<InputComponent {...resolveSurfaceProps(inputSurface)} />
					</div>
				{/if}

				{#if commandError}
					<div class="px-4 pb-3">
						<Alert.Root variant="destructive">
							<Alert.Title>{activeCommand.name} failed</Alert.Title>
							<Alert.Description>{commandError.message}</Alert.Description>
						</Alert.Root>
					</div>
				{/if}

				<ScrollArea>
					<div class="pr-2 pb-2 pl-2">
						{#if contentSurface}
							{@const ContentComponent = contentSurface.component}
							<ContentComponent {...resolveSurfaceProps(contentSurface)} />
						{:else}
							<Card.Content class="px-0">
								<p class="text-sm text-muted-foreground">No panel registered for this command.</p>
							</Card.Content>
						{/if}
					</div>
				</ScrollArea>
			{/if}
		{/if}
	</Command.Root>
</div>
