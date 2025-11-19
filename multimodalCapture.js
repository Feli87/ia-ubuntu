/**
 * Multimodal Capture
 *
 * Handles screenshot capture and image processing for AI analysis
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class ScreenshotCapture {
    constructor() {
        this._tempDir = GLib.build_filenamev([GLib.get_tmp_dir(), 'ai-search-screenshots']);
        this._ensureTempDir();
    }

    _ensureTempDir() {
        const dir = Gio.File.new_for_path(this._tempDir);

        try {
            if (!dir.query_exists(null)) {
                dir.make_directory_with_parents(null);
            }
        } catch (error) {
            console.error('[Screenshot Capture] Failed to create temp directory:', error);
        }
    }

    /**
     * Capture area of screen (interactive selection)
     */
    async captureArea() {
        console.log('[Screenshot Capture] Starting area capture');

        try {
            // Use GNOME Screenshot via shell command
            const filename = this._generateFilename();
            const filepath = GLib.build_filenamev([this._tempDir, filename]);

            // Try gnome-screenshot first (interactive area selection)
            const result = await this._executeCommand([
                'gnome-screenshot',
                '-a',
                '-f',
                filepath,
            ]);

            if (result.success) {
                console.log(`[Screenshot Capture] Saved to: ${filepath}`);
                return filepath;
            }

            // Fallback to import command (ImageMagick)
            const result2 = await this._executeCommand([
                'import',
                filepath,
            ]);

            if (result2.success) {
                console.log(`[Screenshot Capture] Saved to: ${filepath}`);
                return filepath;
            }

            throw new Error('Screenshot capture failed. Install gnome-screenshot or imagemagick.');

        } catch (error) {
            console.error('[Screenshot Capture] Capture error:', error);
            throw error;
        }
    }

    /**
     * Capture full screen
     */
    async captureFullScreen() {
        console.log('[Screenshot Capture] Capturing full screen');

        try {
            const filename = this._generateFilename();
            const filepath = GLib.build_filenamev([this._tempDir, filename]);

            const result = await this._executeCommand([
                'gnome-screenshot',
                '-f',
                filepath,
            ]);

            if (result.success) {
                console.log(`[Screenshot Capture] Saved to: ${filepath}`);
                return filepath;
            }

            throw new Error('Screenshot capture failed');

        } catch (error) {
            console.error('[Screenshot Capture] Capture error:', error);
            throw error;
        }
    }

    /**
     * Capture active window
     */
    async captureWindow() {
        console.log('[Screenshot Capture] Capturing active window');

        try {
            const filename = this._generateFilename();
            const filepath = GLib.build_filenamev([this._tempDir, filename]);

            const result = await this._executeCommand([
                'gnome-screenshot',
                '-w',
                '-f',
                filepath,
            ]);

            if (result.success) {
                console.log(`[Screenshot Capture] Saved to: ${filepath}`);
                return filepath;
            }

            throw new Error('Screenshot capture failed');

        } catch (error) {
            console.error('[Screenshot Capture] Capture error:', error);
            throw error;
        }
    }

    /**
     * Capture with delay
     */
    async captureWithDelay(seconds = 3) {
        console.log(`[Screenshot Capture] Capturing with ${seconds}s delay`);

        try {
            const filename = this._generateFilename();
            const filepath = GLib.build_filenamev([this._tempDir, filename]);

            const result = await this._executeCommand([
                'gnome-screenshot',
                '-d',
                seconds.toString(),
                '-f',
                filepath,
            ]);

            if (result.success) {
                console.log(`[Screenshot Capture] Saved to: ${filepath}`);
                return filepath;
            }

            throw new Error('Screenshot capture failed');

        } catch (error) {
            console.error('[Screenshot Capture] Capture error:', error);
            throw error;
        }
    }

    /**
     * Execute shell command
     * @private
     */
    async _executeCommand(argv) {
        return new Promise((resolve, reject) => {
            try {
                const proc = Gio.Subprocess.new(
                    argv,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        const success = proc.get_successful();

                        if (!success) {
                            console.error('[Screenshot Capture] Command failed:', stderr);
                        }

                        resolve({
                            success: success,
                            stdout: stdout,
                            stderr: stderr,
                        });

                    } catch (error) {
                        console.error('[Screenshot Capture] Command error:', error);
                        reject(error);
                    }
                });

            } catch (error) {
                console.error('[Screenshot Capture] Subprocess error:', error);
                reject(error);
            }
        });
    }

    /**
     * Generate unique filename for screenshot
     * @private
     */
    _generateFilename() {
        const timestamp = GLib.DateTime.new_now_local().format('%Y%m%d_%H%M%S');
        const random = Math.floor(Math.random() * 10000);
        return `ai-screenshot-${timestamp}-${random}.png`;
    }

    /**
     * Clean up old screenshots
     */
    cleanupOldScreenshots(olderThanHours = 24) {
        try {
            const dir = Gio.File.new_for_path(this._tempDir);
            const enumerator = dir.enumerate_children(
                'standard::*',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            const now = GLib.DateTime.new_now_local();
            let child = null;

            while ((child = enumerator.next_file(null)) !== null) {
                const name = child.get_name();

                if (!name.startsWith('ai-screenshot-')) {
                    continue;
                }

                const file = dir.get_child(name);
                const info = file.query_info(
                    'time::modified',
                    Gio.FileQueryInfoFlags.NONE,
                    null
                );

                const modifiedTime = info.get_modification_date_time();
                const diff = now.difference(modifiedTime);
                const hours = diff / (GLib.TIME_SPAN_HOUR);

                if (hours > olderThanHours) {
                    console.log(`[Screenshot Capture] Deleting old screenshot: ${name}`);
                    file.delete(null);
                }
            }

        } catch (error) {
            console.error('[Screenshot Capture] Cleanup error:', error);
        }
    }

    /**
     * Get image dimensions
     */
    getImageDimensions(filepath) {
        try {
            const file = Gio.File.new_for_path(filepath);

            if (!file.query_exists(null)) {
                throw new Error('File does not exist');
            }

            // Use identify command (ImageMagick)
            const result = GLib.spawn_command_line_sync(`identify -format "%wx%h" "${filepath}"`);
            const [success, stdout] = result;

            if (success) {
                const dimensions = new TextDecoder('utf-8').decode(stdout).trim();
                const [width, height] = dimensions.split('x').map(Number);
                return {width, height};
            }

            return null;

        } catch (error) {
            console.error('[Screenshot Capture] Get dimensions error:', error);
            return null;
        }
    }

    destroy() {
        // Cleanup old screenshots on destroy
        this.cleanupOldScreenshots(1); // Delete screenshots older than 1 hour
    }
}
