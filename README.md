# skm-lit

**skm-lit** _(secret key manager)_ is a library for retrieving secrets stored
in a Cloud Storage bucket.

## Installation

```bash
# Using npm
npm install skm-lit

# Using yarn
yarn add skm-lit
```

## Usage

Require **skm-lit** as early as possible:

```js
require(`skm-lit`);
```

Next, define an environment variable that references your secret stored in
a Google Storage bucket using **skm-lit's** special URL syntax.
Consult the [reference syntax](#reference-syntax) section for details.

```bash
# inside .env
MY_SECRET:skm-lit://mybucket/my-secret
```

After that you can access your secret through the corresponding environment
variable. In this case `MY_SECRET`.

## Setup a Cloud Storage bucket

This section describes the steps required to create a Cloud Storage bucket
manually and setting up the correct permissions.

> This is not required on order to use **skm-lit**. If you already have a
> Cloud Storage bucket provisioned, you can skip this section.

1. Install the [Google Cloud SDK][cloud-sdk]. If you are running from your local
   machine, you also need to set _Default Application Credentials_:

   ```bash
   gcloud auth application-default login
   ```

   This will open a web browser and prompt for a login to your Google account.
   After a successful login, the gcloud SDK has set your user account
   as the Default Application Credentials for your machine.

   To revoke the credentials, run `gcloud auth application-default revoke`.

2. Export your project ID as an environment variable. The rest of this setup
   guide assumes this environment variable is set:

   ```bash
   export PROJECT_ID=my-gcp-project-id
   ```

   Please note, this is the project _ID_, not the project _name_ or project
   _number_. You can find the project ID by running `gcloud projects list` or
   in the web UI.

3. Enable required services on the project:

   ```bash
   gcloud services enable --project ${PROJECT_ID} \
     storage-api.googleapis.com \
     storage-component.googleapis.com
   ```

4. Create a [Cloud Storage][cloud-storage] bucket for storing secrets:

   ```bash
   export BUCKET_ID=my-secrets
   ```

   Replace `my-secrets` with the name of your bucket. Bucket names must be
   globally unique across all of Google Cloud. You can also create a bucket
   using the Google Cloud Console from the web.

   ```bash
   gsutil mb -c standard -l europe-west3 -p ${PROJECT_ID} \
     gs://${BUCKET_ID}
   ```

   > It is strongly recommended that you create a new bucket instead of using
   > an existing one. **skm-lit** should be the only entity managing IAM
   > permissions on the bucket.

5. Set the default ACL permissions on the bucket to private:

   ```bash
   gsutil defacl set private gs://${BUCKET_ID}
   ```

   ```bash
   gsutil acl set private gs://${BUCKET_ID}
   ```

   The default permissions grant anyone with Owner/Editor access on the project
   access to the bucket and its objects. These commands restrict access to the
   bucket to project owners and access to bucket objects to only their owner.
   Everyone else must be granted explicit access via IAM to an object inside
   the bucket.

## Reference Syntax

This section describes the syntax for referencing a secret entity. These
references will live in environment variables and **skm-lit** will parse
them on library startup.

### Syntax

```text
skm-lit://[BUCKET]/[SECRET]?[OPTIONS]
```

- `BUCKET` - name of the Cloud Storage bucket where the secret is stored

- `SECRET` - name of the secret in the Cloud Storage bucket

- `OPTIONS` - options specified as URL query parameters

### Options

- `destination` - when specified as a URL query parameter, this controls how the
  secret is resolved:

  - `tempfile` - resolve the secret and write the contents to a tempfile,
    replacing the environment variable with the path to the tempfile

  - `[PATH]` - resolve the secret and write the contents to the specified file
    path

### Examples

Read a secret:

```text
skm-lit://my-bucket/my-secret
```

Read a secret into a tempfile:

```text
skm-lit://my-bucket/path/to/my-secret?destination=tempfile
```

Read a secret into `[project-root]/path/to/file` relative to the project root:

```text
skm-lit://my-bucket/path/to/my-secret?destination=path/to/file
```

Read a secret into `/path/to/file` absolute to the filesystem:

```text
skm-lit://my-bucket/path/to/my-secret?destination=/path/to/file
```

---

This project was bootstrapped with [jvdx](https://github.com/joelvoss/jvdx).

[cloud-sdk]: https://cloud.google.com/sdk
[twtbs-nexus]: https://nexus.cloud-dev.twt.de/repository/npm-public/
