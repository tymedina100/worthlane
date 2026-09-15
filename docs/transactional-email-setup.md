# Transactional email setup

## September 15, 2026 — approved DNS publication

Tyler signed into the Worthlane Resend workspace with the existing Workspace
account and explicitly approved the three prepared sending-domain DNS records.
Published through Vercel DNS:

| Name within worthlane.app | Type | Value | TTL / priority |
| --- | --- | --- | --- |
| `resend._domainkey.mail` | TXT | Exact public DKIM key supplied by Resend for `mail.worthlane.app` | 60 |
| `send.mail` | MX | `feedback-smtp.us-east-1.amazonses.com.` | 60 / 10 |
| `send.mail` | TXT | `v=spf1 include:amazonses.com ~all` | 60 |

Both Vercel authoritative nameservers and the local recursive resolver returned
all three records. The root domain MX still returns `1 smtp.google.com.`;
Google Workspace DKIM/SPF/DMARC records were not changed by this step.

Clicked Resend's verification action after publication. Refreshed provider
readback at approximately 10:15 AM Arizona time confirms **Verified**, with
domain verification event at 10:14 AM. DKIM, MX and SPF each show **Verified**.
This closes DNS/provider domain verification, not actual API email delivery.

Resend domain: `mail.worthlane.app`, region North Virginia (`us-east-1`). Sending
is enabled for verification; receiving is **off**. No automatic Vercel integration
access was granted. No API key was created, no paid plan selected, no Resend email
sent, and no application configuration/deployment performed in this step.

## Next steps

1. Completed: provider domain and all three records read back as Verified.
2. Configure a domain-scoped sending-only API credential through a user credential
   handoff and obtain scoped authorization for production environment changes.
   Do not display or commit the credential.
3. Prepare explicit sender `Worthlane <no-reply@mail.worthlane.app>` and a support
   reply-to address. Review the domain's transport protection: the existing default
   is Opportunistic TLS, which can fall back to plaintext; Enforced TLS is not yet
   configured. Tracking has not been configured.
4. Finish PR16 CI, obtain production deployment approval, and verify actual reset
   delivery to an approved owned mailbox. A Gmail support-alias test is separate
   evidence and does not prove Resend delivery.

Undo: remove only the three added subdomain records. Preserve root Google mail
records, the support alias, and all website records.
