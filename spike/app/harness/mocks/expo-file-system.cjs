// Node stand-in for expo-file-system's File/Directory/Paths, limited to the
// surface engine/shims/fs.ts uses.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

const toPath = uri => fileURLToPath(uri);

class File {
  constructor(uri) { this.uri = uri; this.path = toPath(uri); }
  get name() { return path.basename(this.path); }
  get exists() { return fs.existsSync(this.path) && fs.statSync(this.path).isFile(); }
  get size() { return fs.statSync(this.path).size; }
  get modificationTime() { return fs.statSync(this.path).mtimeMs; }
  create() { fs.writeFileSync(this.path, '', { flag: 'wx' }); }
  write(contents) { fs.writeFileSync(this.path, contents); }
  textSync() { return fs.readFileSync(this.path, 'utf8'); }
  bytesSync() { return new Uint8Array(fs.readFileSync(this.path)); }
  delete() { fs.unlinkSync(this.path); }
  copySync(dest) { fs.copyFileSync(this.path, dest.path, fs.constants.COPYFILE_EXCL); }
  moveSync(dest) {
    if (fs.existsSync(dest.path)) throw new Error('Destination already exists');
    fs.renameSync(this.path, dest.path);
  }
}

class Directory {
  constructor(uri) { this.uri = uri; this.path = toPath(uri); }
  get name() { return path.basename(this.path); }
  get exists() { return fs.existsSync(this.path) && fs.statSync(this.path).isDirectory(); }
  create({ intermediates = false, idempotent = false } = {}) {
    if (idempotent && this.exists) return;
    fs.mkdirSync(this.path, { recursive: intermediates });
  }
  list() {
    return fs.readdirSync(this.path, { withFileTypes: true }).map(entry => {
      const uri = pathToFileURL(path.join(this.path, entry.name)).href;
      return entry.isDirectory() ? new Directory(uri) : new File(uri);
    });
  }
  delete() { fs.rmSync(this.path, { recursive: true }); }
}

const Paths = {
  get document() { return new Directory(pathToFileURL(process.env.HARNESS_DOCUMENT_DIR).href + '/'); },
  info(uri) {
    const p = toPath(uri);
    const exists = fs.existsSync(p);
    return { exists, isDirectory: exists ? fs.statSync(p).isDirectory() : null };
  },
};

module.exports = { File, Directory, Paths };
