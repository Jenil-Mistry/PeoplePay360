import nodemailer from "nodemailer";
import { formatCurrency } from "@/lib/utils";

export interface SendPayslipEmailParams {
  to: string;
  employeeName?: string | null;
  empId?: string | null;
  period: string;
  netSalary: number | string;
  pdfBuffer: Buffer;
}

let cachedTransporter: nodemailer.Transporter | null = null;

async function getEmailTransporter(): Promise<{ transporter: nodemailer.Transporter; isTestAccount: boolean }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";

  // If real SMTP credentials are provided, use them
  if (host && user && pass) {
    if (!cachedTransporter) {
      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    }
    return { transporter: cachedTransporter, isTestAccount: false };
  }

  // Fallback: create development test ethereal transporter or log
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return { transporter: testTransporter, isTestAccount: true };
  } catch {
    // If offline / unable to connect to Ethereal, use jsonTransport for dry-run
    const dryRunTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return { transporter: dryRunTransporter, isTestAccount: true };
  }
}

/**
 * Sends an official payslip email with the PDF document attached.
 */
export async function sendPayslipEmail(
  params: SendPayslipEmailParams
): Promise<{ success: boolean; messageId?: string; previewUrl?: string | false; error?: string }> {
  try {
    const { to, period, netSalary, pdfBuffer } = params;
    const employeeName = params.employeeName || "Employee";
    const empId = params.empId || "EMP";

    if (!to || !to.includes("@")) {
      return { success: false, error: `Invalid or missing recipient email for ${employeeName}` };
    }

    const { transporter, isTestAccount } = await getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM || `"PeoplePay360 Payroll" <payroll@peoplepay360.com>`;

    const safeFilename = `Payslip_${empId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${period.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .salary-card { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .salary-label { font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
    .salary-amount { font-size: 28px; font-weight: 800; color: #14532d; font-family: monospace; margin: 6px 0; }
    .salary-sub { font-size: 12px; color: #15803d; }
    .attachment-notice { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px; color: #334155; display: flex; align-items: center; margin-bottom: 24px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>PeoplePay360</h1>
      <p>Automated HR & Payroll Operations</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${employeeName},</div>
      <p class="message">
        We are pleased to inform you that your salary disbursement for <strong>${period}</strong> has been credited to your registered bank account.
      </p>
      <div class="salary-card">
        <div class="salary-label">Net Credited Salary</div>
        <div class="salary-amount">${formatCurrency(Number(netSalary))}</div>
        <div class="salary-sub">Status: Electronic Fund Transfer Completed</div>
      </div>
      <div class="attachment-notice">
        📄 <strong>Attached Payslip:</strong> Your itemized breakdown including earnings, allowances, statutory deductions, and tax compliance details has been generated and attached as <strong>${safeFilename}</strong>.
      </div>
      <p class="message" style="font-size: 12px; color: #64748b;">
        Please retain this payslip for your income tax filings and personal financial records. If you have any questions regarding your salary computation, kindly contact the HR or Payroll operations team.
      </p>
    </div>
    <div class="footer">
      PeoplePay360 Technologies Pvt Ltd • This is an automated corporate notification • Confidential
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `Salary Payslip for ${period} — ${employeeName}`,
      html: htmlContent,
      attachments: [
        {
          filename: safeFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    let previewUrl: string | false = false;
    if (isTestAccount) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Payslip Email Dev Preview] Recipient: ${to} -> Preview: ${previewUrl}`);
    } else {
      console.log(`[Payslip Email Sent] MessageId: ${info.messageId} to ${to}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err: any) {
    console.error(`Failed to send payslip email to ${params.to}:`, err);
    return {
      success: false,
      error: err.message || "Failed to send payslip email",
    };
  }
}
