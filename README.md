# Firestore JSON Importer

Import JSON files into a Firestore collection. Each file becomes a document, using its name without `.json` as the document ID by default.

## Requirements

- Node.js 22 or later
- A Firebase project with Cloud Firestore
- A service account with access to the project

## Install

From the project directory, install the dependencies:

```powershell
npm install
```

Set the credentials file path in the current PowerShell session:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\service-account.json"
```

Keep the service account key private.

## Input files

Put one JSON object in each file. The file name without `.json` becomes the document ID:

```text
json/
  red-car.json  -> document "red-car"
  blue-car.json -> document "blue-car"
```

## Usage

Preview the files and IDs without writing to Firestore:

```powershell
npm run import -- "users/UID/cars" "C:\path\json" --dry-run
```

Import the files:

```powershell
npm run import -- "users/UID/cars" "C:\path\json"
```

The path must point to a collection, such as `cars` or `users/UID/cars`. By default, imported documents replace existing documents with the same ID.

## Options

- `--dry-run`: Validate files and show their IDs without importing.
- `--merge`: Update only fields present in the JSON.
- `--recursive`: Include JSON files in subdirectories.
- `--id-field id`: Use the value of the `id` field as the document ID.
- `--help`: Show help.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
