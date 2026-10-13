This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Virtual Field Geology Basecamp is a 3-week virtual geology field camp. Assignment content lives in `data/assignments.json`.

## Licenses

Two licenses cover this repository. This split is a suggestion for Andrew Laskowski to confirm.

| What | License | File |
| --- | --- | --- |
| Application code | MIT | [LICENSE](LICENSE) |
| Exercise text, images, and documentation | CC BY 4.0 | [LICENSE-CONTENT](LICENSE-CONTENT) |

Third-party worksheets and virtual landscapes keep the attributions already printed on each assignment. To cite the project, use [CITATION.cff](CITATION.cff).

## Study surveys and usage metrics

Both hooks are configured in [`data/study.json`](data/study.json). With the URLs left empty, exercise pages show no survey link and the usage metric makes no network call.

### Surveys

Set `survey.baseUrl` to the https address of the survey form. `survey.placeholderUrl` is a labeled example of the query string the app adds:

`?ex=<n>&phase=<pre|mid|post>&v=<version>`

- `ex` is the assignment sequence number (1–12).
- `phase` is `pre` (Before you start), `mid` (Check in), or `post` (Exit ticket).
- `v` is included only after `version` is set in the same file. Leave `version` empty until a release is tagged.

Each exercise page shows the three phases as plain links once `baseUrl` is a real https URL. A locked exercise shows none. The links are anchors. The page does not embed the survey in a frame.

The survey URL carries the exercise number, the phase, and the version when one is set. Student names, IDs, emails, and self-generated codes stay out of the URL. A student who needs a linking code enters it on the survey form itself.

An empty `baseUrl`, or a placeholder host such as `PLACEHOLDER.example`, keeps the links hidden.

### Usage metrics

Leave `metrics.endpoint` empty to keep metrics off. Set it to an https collector you operate when you want aggregate exercise-open counts. `metrics.placeholderEndpoint` is a labeled example and is never requested.

Opening an unlocked exercise then sends one event to that endpoint:

```json
{ "event": "exercise_open", "exercise": 1 }
```

Once `version` is set, the same event also includes `"version": "<version>"`. Until then, `version` is omitted. The browser posts only the exercise number to this app at `/api/usage`. The server adds the event name and version, then forwards that aggregate body. The event has no student identifier. The request uses no metric cookie and no browser fingerprint. The app loads no third-party tracker, pixel, or beacon.

Point `metrics.endpoint` at a collector you run. The route does not attach the student session to the outbound request.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
