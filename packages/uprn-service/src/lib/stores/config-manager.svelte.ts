import { asset } from '$app/paths';

export class ConfigManager<T> {
	public value = $state<T>();
	public isLoading = $state(false);
	public error = $state<Error | null>(null);

	constructor(initialValue?: T) {
		this.value = initialValue;
	}

	public async loadFromUrl(url: string): Promise<void> {
		this.isLoading = true;
		this.error = null;

		if (url.startsWith('/')) {
			url = asset(url);
		}
		
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to load configuration from ${url}: ${response.statusText}`);
			}
			this.value = (await response.json()) as T;
		} catch (e) {
			this.error = e as Error;
			throw e;
		} finally {
			this.isLoading = false;
		}
	}

	public async loadFromFile(file: File): Promise<void> {
		this.isLoading = true;
		this.error = null;
		try {
			const text = await file.text();
			this.value = JSON.parse(text) as T;
		} catch (e) {
			this.error = e as Error;
			throw e;
		} finally {
			this.isLoading = false;
		}
	}
}
