# Android app flow audit (source-level, 2026-11-19)

This inventory describes code paths, not device-verified behavior. No emulator, ADB, production account, or production data was used.

## Architecture and navigation

The app has 24 Activities, no Fragments, and no Jetpack navigation graph. `AndroidManifest.xml` declares Splash as launcher and FileDetail as the exported custom/HTTPS deep-link destination. `NavHelper` handles the Home, Feed, Upload, Saved, and Profile bottom tabs using intents. Retrofit/OkHttp in `ApiClient` supplies most API calls; playback uses Media3's HTTP data source, images use Glide, downloads use Android DownloadManager, and uploads use an OkHttp multipart body. `PrefsManager` stores encrypted tokens in Keystore-backed preferences. The browser dashboard is a separate cookie session.

| Journey | Activities and destinations | Source-level status |
| --- | --- | --- |
| Launch/auth | Splash → Home; Profile → Login, Signup, ForgotPassword, Contact | Guest launch works by design. Login/signup store encrypted tokens. Expired access tokens now refresh on authenticated Retrofit/OkHttp requests; device behavior unverified. |
| Home/discovery | Home → PasteLink, Search, Notifications, Profile; bottom Feed, Upload, Saved, Profile | Home displays local history, not a public content grid. Search now calls public trending/search endpoints; Feed remains subscription-only and requires auth. |
| Shared media | FileDetail → Player or ImageViewer; app links `vidora://view`, `vidora://download`, configured web `/v/` | Deep links now validate/normalize token. Detail calls public metadata API. Player uses Media3 HTTP Range; image uses Glide. Ticket flow is server-authoritative. |
| Social | Feed → SubscriptionsList, CreatorProfile, FileDetail; Player → CreatorProfile | Subscription APIs are connected. Bell now uses authenticated PATCH and only changes UI after success. Some other subscribe callbacks still lack error feedback. |
| Saved/offline | Saved → FileDetail; Downloads → local Player/ImageViewer/system viewer | Bookmarks and history are local. Download history is recorded when queued, before DownloadManager reports success; offline file availability is not checked for video/image before launch. |
| Creator | Upload → system picker → multipart upload → share URL; Profile → browser dashboard | Upload progress/cancellation/retry and API URL were repaired. No Android My Videos, file deletion, visibility controls, or native earnings/payout screens exist. Browser dashboard requires its own sign-in. |
| Account/settings | Profile → Subscription, Downloads, Privacy, Help, About; Signup → Terms; About → external links | Profile uses backend profile/settings APIs; Subscription uses Google Billing. Terms/Privacy/Help load configured web content. |
| Notifications | Home → Notifications; FCM messaging service | List/read-all and token registration exist. Push delivery and runtime permission behavior need device testing. |

## API integration

Connected mobile endpoints include `/api/auth/{login,register,refresh,logout}`, `/api/share/view/:token`, `/api/play/:id`, `/api/view/:token/{ticket,redeem}`, `/api/files/{upload,trending,search}`, `/api/share/:fileId/generate`, `/api/subscribe/{feed,list,status/:id,:id,:id/bell}`, `/api/creators/:id{/files}`, `/api/users/profile`, `/api/notifications`, `/api/fcm/register`, `/api/contact`, and `/api/settings`. `ApiService.getFiles` and `getStreamUrl` are declared but unused. Earnings, payouts, referrals, payment methods, and creator file management have backend endpoints but no Android screen/API client integration.

## Fixed in this audit

1. Web deep links previously passed `v/TOKEN` to metadata lookup; a single validator now handles all accepted link forms and rejects unrelated hosts and extra path segments.
2. Expired mobile access tokens previously had no refresh call site; the API client now rotates refresh tokens once under a process lock and retries the original authorized call. Invalid refresh clears the session; transient failures leave the token for a later attempt.
3. Upload cancellation previously reset only the UI. The active call is now cancelled, the input stream is reopened for safe retry, and stale callbacks cannot overwrite the next attempt. Upload and media URLs use the configured API origin; share URLs use the configured web origin.
4. The subscription bell previously used an unchecked direct request and optimistic icon update. It now calls the backend PATCH endpoint through the authenticated client.
5. Search previously contained fixed example tags without any API call. It now displays public trending/search responses with loading, empty, and error states.

## Remaining work, ordered by impact

1. **Device validation:** Test login/Keystore migration, restart, expired tokens, guest video/image viewing, ticket issuance/delivery/redeem, seek/range, background/rotation, upload cancellation, downloads, and notifications on a device. Source inspection and backend tests cannot establish these outcomes.
2. **Native creator and money journeys:** Add My Videos, share management, deletion/visibility, earnings, referral, payout request/history screens backed by the existing authenticated endpoints. Never derive financial values in Android code.
3. **Playback recovery:** Media3 and Glide media requests do not share the API client's refresh authenticator; a token expiring midstream or network interruption can leave playback at an error toast without a retry/resume action. Ticket expiry and rejected redemption remain server decisions.
4. **Offline reliability:** Observe DownloadManager completion before adding history, use provider/MediaStore URIs for modern Android storage, and verify the file exists before opening local playback.
5. **Feedback and accessibility:** Several subscription/creator/profile callbacks silently ignore failures; some icon-only controls are 32dp and lack adequate touch targets or descriptions. Screen-size, theme, keyboard, TalkBack, and orientation behavior require device inspection.
6. **Dashboard handoff:** Opening the browser dashboard from Android does not transfer its mobile bearer session into the separate browser cookie session. The user must sign in there. A secure handoff requires an explicit server-issued one-time exchange flow.

## Verification performed

- Android `:app:compileDebugJavaWithJavac`, `:app:testDebugUnitTest`, and instrumentation-test source compilation passed on the host. Instrumentation tests were not executed.
- Backend media, view-ticket, upload, notification, and browser/mobile auth integration tests passed against an isolated MySQL `_test` database.
- No runtime playback, download, Billing, FCM, Keystore, or UI navigation claim is made.
