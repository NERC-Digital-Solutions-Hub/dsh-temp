export type ContentConfig = {
	content: {
		organisation: string;
		repo: string;
		relativePath: string;
		research: {
			dir: string;
			main: string;
			articles: {
				dir: string;
				index: string;
			};
		};
	};
};
