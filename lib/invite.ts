// ── sendInvite ─────────────────────────────────────────────────────────────────
// Stub: returns the invite link without sending anything.
// The confirmation screen displays it so clinic staff can share manually.
//
// To add real delivery, replace this function body only.
// The API route, form, and confirmation screen need zero changes.
//
//   Email (Resend):
//     import { Resend } from 'resend'
//     const resend = new Resend(process.env.RESEND_API_KEY)
//     await resend.emails.send({ to: params.contactValue, ... })
//
//   SMS (Twilio):
//     import twilio from 'twilio'
//     const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
//     await client.messages.create({ to: params.contactValue, ... })
// ─────────────────────────────────────────────────────────────────────────────

export interface InviteParams {
  contactMethod: 'email' | 'sms'
  contactValue:  string
  firstName:     string
  link:          string
}

export interface InviteResult {
  link: string
}

export async function sendInvite(params: InviteParams): Promise<InviteResult> {
  // Stub — no message sent. Drop real implementation in here when ready.
  return { link: params.link }
}
