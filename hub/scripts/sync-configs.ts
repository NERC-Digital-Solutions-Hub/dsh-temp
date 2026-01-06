import fs from 'node:fs';
import path from 'node:path';

const packages = ['uprn-service', 'maps-page', 'research-page', 'ai-where-to-build'];

// Ensure we are using the project root (hub)
const projectRoot = process.cwd();
const targetDir = path.resolve(projectRoot, 'static/config');

if (fs.existsSync(targetDir)) {
	// Clean up formatting/stale files
	fs.rmSync(targetDir, { recursive: true, force: true });
}

fs.mkdirSync(targetDir, { recursive: true });

packages.forEach((pkg) => {
	// Resolve path to the package's static/config folder
	// Assumes folder structure: root/hub and root/packages
	const srcDir = path.resolve(projectRoot, `../packages/${pkg}/static/config`);

	if (fs.existsSync(srcDir)) {
		console.log(`Syncing config from ${pkg}...`);
		fs.cpSync(srcDir, targetDir, { recursive: true, force: true });
	}
});
