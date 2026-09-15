# Worthlane Google Workspace setup

Verified September 15, 2026 through Google Admin, Gmail, authoritative DNS,
and a user-approved round-trip email test.

## Mailboxes and support workflow

- Primary login/mailbox: `tyler@worthlane.app`; active Business Starter account.
- Existing `support@worthlane.app` alias delivers to the primary mailbox. No
  additional user, paid seat, delegation, or forwarding destination was created.
- Tyler completed Gmail's separate send-as popup. The saved sender is currently
  `Tyler Medina <support@worthlane.app>`; the suggested display name is
  `Worthlane Support`. The actual support address is verified working.
- Gmail now replies from the same address the incoming message was sent to.
  New-message default remains the primary Tyler address.
- Saved filter: `{to:support@worthlane.app deliveredto:support@worthlane.app}`
  applies the `Worthlane Support` label. It does not archive, mark read, delete,
  forward, or bypass spam protection.

## Domain authentication

Existing Google MX and DKIM were preserved. Google Admin reports
`Authenticating email with DKIM`; its public key matches the existing DNS record.
Added the missing SPF and monitoring-only DMARC records to Vercel DNS under the
user's Workspace setup authorization:

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| apex | TXT | `v=spf1 include:_spf.google.com ~all` | 60 |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:tyler@worthlane.app` | 60 |

Both Vercel authoritative nameservers returned the new records. DMARC is in
monitoring mode; it does not yet request quarantine or rejection. Review real
reports and all legitimate sending services before enforcing a stricter policy.
The app's separate Resend transactional-email implementation is not validated by
this Gmail test. Do not add a second apex SPF record when configuring it.

Reference: [Google SPF setup](https://support.google.com/a/answer/33786),
[DKIM setup](https://support.google.com/a/answer/174124), and
[DMARC setup](https://knowledge.workspace.google.com/admin/security/set-up-dmarc).

## End-to-end evidence

The user explicitly approved a simple test between their personal Gmail and the
support alias. At approximately 10:01 AM Arizona time, the test arrived in the
Worthlane inbox with the support label. A reply sent from `support@worthlane.app`
at 10:03 AM arrived in the personal Gmail inbox. The receiving service's
`Authentication-Results` reported **SPF pass, DKIM pass, DMARC pass** with
`header.from=worthlane.app`. Only setup-test text was sent; no customer or financial
data was included. Full message headers and personal mailbox identifiers are not
committed as evidence.

Live `/support`, `/privacy`, and `/terms` each return HTTP 200 and already link to
`support@worthlane.app`. No website code change or redeployment was necessary.

## Remaining user action and limits

Google Admin showed two-step verification **off**, not enforced, and no registered
passkeys/security keys. Tyler has been asked to enroll through their own Google
Account Security settings; credential enrollment must be completed by the user.
Recovery contact information is already configured and was left unchanged.
Do not mark the internal MFA control verified until enrollment is read back.

No Workspace plan upgrade, new paid service, store submission, bank connection,
or production application configuration change was performed in this milestone.

Undo: remove only the two newly added TXT records from Vercel DNS; remove the
support-label filter in Gmail if desired. Preserve the existing MX, DKIM,
verification records, mailbox, and support alias.
