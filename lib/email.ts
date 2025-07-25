import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: Number.parseInt(process.env.NODEMAILER_PORT || "587"),
  secure: Number.parseInt(process.env.NODEMAILER_PORT || "587") === 465,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
})

export async function sendCompletionEmail(to: string, jobId: string) {
  const reportUrl = `${process.env.BASE_URL}/report/${jobId}`
  console.log(`Sending completion email to ${to} for job ${jobId}`)
  await transporter.sendMail({
    from: process.env.NODEMAILER_FROM,
    to,
    subject: "Your Insight Engine Analysis is Complete!",
    text: `Your analysis for job ${jobId} is complete. View your report here: ${reportUrl}`,
    html: `<p>Your analysis for job ${jobId} is complete. <a href="${reportUrl}">View your report here</a>.</p>`,
  })
}

export async function sendErrorEmail(to: string, jobId: string, errorMessage: string) {
  console.log(`Sending error email to ${to} for job ${jobId}`)
  await transporter.sendMail({
    from: process.env.NODEMAILER_FROM,
    to,
    subject: "There was a problem with your Insight Engine Analysis",
    text: `We're sorry, but there was an error processing your document for job ${jobId}.\n\nError: ${errorMessage}\n\nPlease try again or contact support.`,
    html: `<p>We're sorry, but there was an error processing your document for job ${jobId}.</p><p><b>Error:</b> ${errorMessage}</p><p>Please try again or contact support.</p>`,
  })
}
