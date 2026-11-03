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

### Get the credentials file

In the Firebase Console, open **Project settings → Service accounts** and select **Generate new private key**. The JSON key file will be downloaded, usually to your Downloads folder.

Files such as `google-services.json` and `GoogleService-Info.plist` only configure the client app. They are not service account credentials and cannot be used by this importer.

Save the key file path in `firestore-importer.config.json` in the project folder:

```json
{
  "credentialsPath": "C:/Users/YourName/Downloads/service-account.json"
}
```

Replace the example with the actual path. This local config file is ignored by Git, so the path stays on your computer.

You can also set `GOOGLE_APPLICATION_CREDENTIALS` in PowerShell or Command Prompt (CMD); that environment variable takes priority over the config file and applies only to the current terminal session. Keep the service account key private.

## Input files

Put one JSON object in each file. The file name without `.json` becomes the document ID:

```text
json/
  red-car.json  -> document "red-car"
  blue-car.json -> document "blue-car"
```

## Usage

Preview the files and IDs without writing to Firestore. If you omit the collection path, the importer uses the JSON directory name as the collection name:

```powershell
npm run import -- "C:\path\json" --dry-run
```

Import the files into a collection named after the directory:

```powershell
npm run import -- "C:\path\json"
```

To choose a collection explicitly, provide its path first:

```powershell
npm run import -- "users/UID/cars" "C:\path\json"
```

The collection path can be a top-level collection such as `cars` or a nested path such as `users/UID/cars`. By default, imported documents replace existing documents with the same ID.

## Options

- `--dry-run`: Validate files and show their IDs without importing.
- `--merge`: Update only fields present in the JSON.
- `--recursive`: Include JSON files in subdirectories.
- `--id-field id`: Use the value of the `id` field as the document ID.
- `--help`: Show help.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
