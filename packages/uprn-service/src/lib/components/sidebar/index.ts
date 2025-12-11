/**
 * Sidebar Components
 *
 * A collection of components for creating resizable sidebars with various positioning options.
 * Provides layout management, positioning constants, and individual sidebar components.
 */

import SidebarPosition from '$lib/components/sidebar/sidebar-position';

export { default as Sidebar } from './sidebar.svelte';
export { default as Root } from './sidebar-root.svelte';
export { SidebarPosition } from './sidebar-position';
export type PositionType = (typeof SidebarPosition)[keyof typeof SidebarPosition];
