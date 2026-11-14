import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

/**
 * Generates a thumbnail from a video file using ffmpeg.
 * Captures a frame at 1 second (or first frame if video is shorter).
 * Output: 320x180 JPEG thumbnail.
 *
 * @param {string} videoPath - Full path to the video file
 * @param {string} outputDir - Directory to save thumbnail
 * @param {string} filename - Output filename (without extension)
 * @returns {Promise<string|null>} - Thumbnail filename or null on failure
 */
export async function generateThumbnail(videoPath, outputDir, filename) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const thumbFilename = `${filename}_thumb.jpg`;
    const outputPath = path.join(outputDir, thumbFilename);

    // Generate thumbnail: capture frame at 1 second, scale to 320x180
    // execFile: arguments are passed directly to ffmpeg, never through a shell.
    await execFileAsync("ffmpeg", [
      "-i", videoPath,
      "-ss", "00:00:01",
      "-vframes", "1",
      "-vf", "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:color=black",
      "-q:v", "3",
      "-y", outputPath,
    ], { timeout: 15000 });

    // Verify file was created
    if (fs.existsSync(outputPath)) {
      console.log(`✅ Thumbnail generated: ${thumbFilename}`);
      return thumbFilename;
    }

    return null;
  } catch (err) {
    const reason = (err.stderr || err.message || "").trim().split("\n").pop();
    console.error(`⚠️ Thumbnail generation failed for ${path.basename(videoPath)}: ${reason}`);
    return null;
  }
}

/**
 * Check if a file is a video based on MIME type
 */
export function isVideo(mimeType) {
  return mimeType && mimeType.startsWith("video/");
}
