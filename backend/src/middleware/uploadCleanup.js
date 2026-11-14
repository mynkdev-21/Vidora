import fs from "fs";

/**
 * Deletes the multipart file multer wrote if the request ends in an error
 * (status >= 400) or the client disconnects — so failed uploads never leave
 * orphaned files behind. Register it BEFORE the multer middleware.
 */
export function cleanupUploadOnFailure(req, res, next) {
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    const failed = res.statusCode >= 400 || !res.writableFinished;
    const files = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
    if (!failed) return;
    for (const f of files) {
      if (f.path) fs.promises.unlink(f.path).catch(() => {});
    }
  };
  res.on("finish", cleanup);
  res.on("close", cleanup);
  next();
}
