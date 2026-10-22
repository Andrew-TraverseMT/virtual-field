This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Virtual Field Geology Basecamp is a 3-week virtual geology field camp. Assignment content lives in `data/assignments.json`.

## Licenses

Two licenses cover this repository. Andrew Laskowski confirmed this split.

| What | License | File |
| --- | --- | --- |
| Application code | MIT | [LICENSE](LICENSE) |
| Exercise text, images, and documentation | CC BY 4.0 | [LICENSE-CONTENT](LICENSE-CONTENT) |

Third-party worksheets and virtual landscapes keep their own licenses. The CC BY 4.0 grant covers original exercise text, images, and documentation in this repository. It does not relicense the University of Leeds or Visible Geology SERC files. To cite the project, use [CITATION.cff](CITATION.cff).

## Source attribution

Mapping landscapes, field slips, and topographic sheets come from the University of Leeds Virtual Landscapes project (Jacqueline Houghton and colleagues), hosted on SERC. Several Visible Geology exercises follow activities in the SERC Visible Geology teaching-materials collection (Abbey, Blatchford, and Weislogel). Verified page URLs, the CC BY-NC-SA terms on those SERC files, and the two pages this pass could not match to a standalone activity are in [NOTICE](NOTICE).

## Accounts

There is no demo login and no seeded student. Public registration is off.

1. Create the first instructor with `POST /api/setup` while the database has no instructor. The request needs `Authorization: Bearer <CRON_SECRET>` and a JSON body with `name`, `email`, and a password of at least 12 characters. Known demo passwords are rejected.
2. That instructor creates later instructor accounts and student accounts from the roster. Each new account receives its own temporary password. The roster cannot create a researcher, and an instructor cannot grant that role to themselves.
3. The researcher account is created once, on the server, and is not seeded:

```bash
npm run create-researcher -- --email <email> --name "Devon Orme" --affiliation "Montana State University"
```

The command prints a random temporary password once on the operator's terminal. The database stores only the hash. The password is not written to the repo or to application logs. The account must replace it on first sign-in. An unused temporary password stops working after 7 days. Run the command again to reissue one only while that flag is still set.
4. Students change the temporary password after signing in.

Details are in [SETUP.md](SETUP.md).

## Research consent and in-app surveys

Consent and the before, during, and after surveys live in the app. They use the existing sign-in, roles, and database. There is no external survey URL.

### Consent

A student grants or declines research consent on the dashboard and chooses a linking code of 8–40 letters, numbers, or hyphens. The code cannot be the student's name, email, or account id.

The server encrypts the decision, the linking code, and the student's name and email with AES-256-GCM before the row is stored. The database stores the ciphertext, the algorithm id, a receipt hash, and a timestamp. It does not store the decision or the name in plaintext. Collection is refused when `CONSENT_ENCRYPTION_KEY` is missing or is not 32 bytes.

Generate that key on the host and put only the base64 value in the environment. Do not commit it.

```bash
openssl rand -base64 32
```

Only the researcher role can view or export the decrypted records, and only while grades are not marked posted. Instructors and students cannot. Decrypting for view or export, and purging, each write an audit row with the action, the actor, the time, and a count. The audit row does not contain the records. Purge deletes the ciphertext and the de-identified survey responses. It does not delete participation credit or the gradebook.

### When grades are marked posted

The app has no course-wide "grades posted" event. Only the instructor sets the one-way flag, from the instructor portal (`POST /api/study/release`). The researcher cannot. That sets `study_settings.grades_posted`. It closes consent view, export, and new consent submissions. It does not decrypt records and it does not delete survey responses. The researcher purges those separately.

### Surveys

Each exercise has a pre, mid, and post form. Question text is in `data/surveys.json` and must match the IRB-approved text if that text differs. A response is stored in `survey_responses` with the linking code, exercise number, phase, and answers. The table has no student name, email, or id column.

The three phases open from the due window the app already stores. Creating a student sets `enrolled_at` and `deadline_at` (the roster start date plus three weeks). That span is split across the assignment's existing week, and the exercises in that week share the week in sequence order. Pre is the first third of the exercise slot, mid the second, post the third. There is no separate survey calendar. A submission outside the open third is rejected by the server.

Students may submit a survey whether or not they grant research consent. The link between a person and a code exists only inside the encrypted consent record.

The researcher sees `/study`. Instructors do not. That page shows counts and numeric summaries (mean, min, max). It does not show individual rows. Free-text answers are omitted. A group with fewer than 5 responses is reported as hidden, including the exact count. `canViewSurveyRows` is always false. Opening the page writes an audit row.

The same page shows an aggregate comparison of the Gemini draft grade and the instructor's final grade: how many pairs, the two means, and the mean absolute difference. Fewer than 5 pairs is hidden. Finalizing a grade writes `instructor_grade` and leaves `ai_grade`, `ai_model`, and `ai_graded_at` in place.

### Optional participation credit

Participation credit is 1% of the course grade by default, set by `participationCredit.percentOfCourseGrade` in `data/study.json`. A student earns it by completing the pre, mid, and post survey on every exercise, or by submitting the course reflection. Both write the same `participation_credit` row and the same point value. That row has no column for which option was used and no consent field. The roster shows "Recorded" or nothing. The course total includes those points in the denominator. The numerator includes them only when credit is recorded. The reflection text is visible to the student who wrote it.

### Usage metrics

Leave `metrics.endpoint` empty in [`data/study.json`](data/study.json). Metrics stay off, and the app makes no outbound call, until that value is an https collector you operate. `metrics.placeholderEndpoint` is a labeled example and is never requested.

Opening an unlocked exercise then sends one event to that endpoint:

```json
{ "event": "exercise_open", "exercise": 1 }
```

Once `version` is set, the same event also includes `"version": "<version>"`. Until then, `version` is omitted. Leave `version` empty until a release is tagged. The browser posts only the exercise number to this app at `/api/usage`. The server adds the event name and version, then forwards that aggregate body. The event has no student identifier. The request uses no metric cookie and no browser fingerprint. The app loads no third-party tracker, pixel, or beacon. The route does not attach the student session to the outbound request.

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
