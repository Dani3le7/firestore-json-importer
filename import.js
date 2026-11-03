import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const usage = `Import JSON files from a directory into a Firestore collection.

Usage:
  npm run import -- <collection-path> <json-directory> [options]

Options:
  --recursive          Include subdirectories
  --merge              Merge fields into existing documents
  --id-field <field>   Use a JSON field as the document ID
  --dry-run            Validate files without importing them
  --help               Show this help

Without --id-field, each document ID is the file name without .json.`;

function parseArgs(args) {
  const options = { recursive: false, merge: false, dryRun: false };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (['--recursive', '--merge', '--dry-run'].includes(arg)) {
      options[{ '--recursive': 'recursive', '--merge': 'merge', '--dry-run': 'dryRun' }[arg]] = true;
    } else if (arg === '--id-field') {
      options.idField = args[++i];
      if (!options.idField || options.idField.startsWith('-')) throw new Error('Provide a field name after --id-field.');
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (!options.help && positional.length !== 2) throw new Error('Provide a collection path and JSON directory.');
  return { ...options, collectionPath: positional[0], inputDirectory: positional[1] };
}

function validateCollectionPath(value) {
  const parts = value.split('/');
  if (value.startsWith('/') || value.endsWith('/') || parts.some((part) => !part) || parts.length % 2 !== 1) {
    throw new Error(`Invalid collection path: "${value}". Use an odd number of segments, such as "users/UID/cars".`);
  }
}

async function listJsonFiles(directory, recursive) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) files.push(file);
    else if (recursive && entry.isDirectory()) files.push(...await listJsonFiles(file, true));
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    if (options.help) return console.log(usage);
    validateCollectionPath(options.collectionPath);
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${usage}`);
    process.exitCode = 2;
    return;
  }

  const directory = path.resolve(options.inputDirectory);
  const files = await listJsonFiles(directory, options.recursive);
  if (!files.length) throw new Error(`No .json files found in ${directory}`);

  const ids = new Set();
  const documents = await Promise.all(files.map(async (file) => {
    const name = path.relative(directory, file);
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      throw new Error(`Invalid JSON in ${name}: ${error.message}`);
    }
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error(`${name} must contain a JSON object.`);

    const id = options.idField ? data[options.idField] : path.basename(file, path.extname(file));
    if (typeof id !== 'string' || !id || id.includes('/') || id === '.' || id === '..') {
      throw new Error(`Invalid document ID for ${name}${options.idField ? ` (field "${options.idField}")` : ''}.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate document ID "${id}".`);
    ids.add(id);
    return { file, name, id, data };
  }));

  if (options.dryRun) {
    console.log(`Dry run: validated ${documents.length} documents for ${options.collectionPath}.`);
    for (const { name, id } of documents) console.log(`  ${id} <- ${name}`);
    return;
  }

  let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    const configPath = path.resolve('firestore-importer.config.json');
    try {
      credentialsPath = JSON.parse(await readFile(configPath, 'utf8')).credentialsPath;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Could not read ${configPath}: ${error.message}`);
    }
  }
  if (credentialsPath) process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(credentialsPath);

  const [{ applicationDefault, initializeApp }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/firestore'),
  ]);
  const firestore = getFirestore(initializeApp({ credential: applicationDefault() }));
  const collection = firestore.collection(options.collectionPath);
  const writer = firestore.bulkWriter();
  const writes = documents.map(({ file, id, data }) =>
    writer.set(collection.doc(id), data, options.merge ? { merge: true } : undefined)
      .then(() => ({ file, id }), (error) => ({ file, id, error })));
  await writer.close();
  const results = await Promise.all(writes);

  const failed = results.filter((result) => result.error);
  for (const { file, id, error } of failed) console.error(`ERROR ${path.relative(directory, file)} -> ${id}: ${error.message}`);
  console.log(`Imported ${results.length - failed.length}/${documents.length} documents into ${options.collectionPath}.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
