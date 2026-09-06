import { NextRequest, NextResponse } from "next/server";
import { getPayslipDetail } from "@/lib/actions/payroll";
import { getAuthenticatedUser, requireReadAccess } from "@/lib/actions/auth-helpers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generatePayslipPdf } from "@/lib/pdf/payslip-pdf";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const rawId = id.startsWith("PS-") ? id.replace("PS-", "") : id;
  const payslipId = parseInt(rawId, 10);

  if (isNaN(payslipId)) {
    return new NextResponse("Invalid Payslip ID", { status: 400 });
  }

  const payslip = await getPayslipDetail(payslipId);

  if (!payslip) {
    return new NextResponse("Payslip Not Found", { status: 404 });
  }

  // 1. Enforce PAID status
  if (payslip.status !== "PAID") {
    return new NextResponse("Payslip is not in PAID status", { status: 403 });
  }

  // 2. Enforce authorization
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  
  if (user.role === "EMPLOYEE") {
    // Employees can only view their own payslips
    await requireReadAccess("payroll_own_payslip");
    if (payslip.employeeId !== user.employeeDbId && payslip.empId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } else {
    await requireReadAccess("payroll_view");
  }

  // If binary PDF download is explicitly requested (?download=pdf)
  if (request.nextUrl.searchParams.get("download") === "pdf") {
    const pdfBuffer = await generatePayslipPdf({
      id: payslip.id,
      payrunName: payslip.payrunName,
      periodStart: payslip.periodStart,
      periodEnd: payslip.periodEnd,
      employeeName: payslip.employeeName,
      empId: payslip.empId,
      email: payslip.email,
      jobPosition: payslip.jobPosition,
      departmentName: payslip.departmentName,
      bankName: payslip.bankName,
      bankAccountNumber: payslip.bankAccountNumber,
      contractRef: payslip.contractRef,
      workedDays: payslip.workedDays,
      basicWage: payslip.basicWage,
      grossSalary: payslip.grossSalary,
      netSalary: payslip.netSalary,
      lines: payslip.lines,
    });

    const filename = `Payslip_${(payslip.empId || payslip.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const earnings = payslip.lines.filter((l) => l.category === "BASIC" || l.category === "ALLOWANCE");
  const deductions = payslip.lines.filter((l) => l.category === "DEDUCTION");

  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + Math.abs(parseFloat(d.amount)), 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${payslip.employeeName} - ${payslip.payrunName || "Period"}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #fff;
      margin: 0;
      padding: 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .payslip-box {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .company-title { font-size: 20px; font-weight: 800; color: #111827; }
    .company-sub { font-size: 11px; color: #6b7280; }
    .payslip-badge {
      text-align: right;
    }
    .payslip-title { font-size: 16px; font-weight: 700; color: #3b82f6; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #f9fafb;
      padding: 14px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      margin-bottom: 20px;
    }
    .meta-item { display: flex; justify-content: space-between; font-size: 12px; }
    .meta-label { color: #6b7280; font-weight: 500; }
    .meta-val { font-weight: 600; color: #111827; }
    .tables-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      background: #f3f4f6;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid #d1d5db;
      font-weight: 600;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
    .amount-col { text-align: right; font-family: monospace; font-weight: 600; }
    .net-salary-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 6px;
      padding: 16px;
      margin-top: 10px;
    }
    .net-label { font-size: 14px; font-weight: 700; color: #1e40af; }
    .net-amount { font-size: 22px; font-weight: 800; font-family: monospace; color: #1e3a8a; }
    .footer-note {
      text-align: center;
      margin-top: 24px;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }
    @media print {
      body { padding: 0; }
      .payslip-box { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 8px;">
    <a href="/api/payslips/${payslip.id}/pdf?download=pdf" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
      📥 Download PDF
    </a>
    <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
      🖨️ Print
    </button>
  </div>

  <div class="payslip-box">
    <div class="header">
      <div>
        <div class="company-title">PeoplePay360 Technologies Pvt Ltd</div>
        <div class="company-sub">Integrated HR & Payroll Operations • Corporate CIN: U72900MH2026PTC012345</div>
        <div class="company-sub">Mumbai / Bengaluru, India</div>
      </div>
      <div class="payslip-badge">
        <div class="payslip-title">SALARY PAYSLIP</div>
        <div style="font-weight: 600; font-size: 12px; color: #4b5563;">${payslip.payrunName || "Monthly Payroll"}</div>
        <div style="font-size: 11px; color: #9ca3af;">Period: ${formatDate(payslip.periodStart || "")} - ${formatDate(payslip.periodEnd || "")}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Employee Name:</span>
        <span class="meta-val">${payslip.employeeName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Employee ID:</span>
        <span class="meta-val">${payslip.empId || `EMP-${payslip.employeeId}`}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Designation:</span>
        <span class="meta-val">${payslip.jobPosition || "Specialist"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Department:</span>
        <span class="meta-val">${payslip.departmentName || "Operations"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Bank Name:</span>
        <span class="meta-val">${payslip.bankName || "—"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Account No:</span>
        <span class="meta-val">${payslip.bankAccountNumber ? `••••${payslip.bankAccountNumber.slice(-4)}` : "A/C Missing"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Contract Reference:</span>
        <span class="meta-val">${payslip.contractRef || "Standard"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Worked Days:</span>
        <span class="meta-val">${payslip.workedDays} Days</span>
      </div>
    </div>

    <div class="tables-container">
      <!-- Earnings Table -->
      <div>
        <table>
          <thead>
            <tr>
              <th>Earnings</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${earnings.map((e) => `
              <tr>
                <td>${e.ruleName}</td>
                <td class="amount-col">${formatCurrency(parseFloat(e.amount))}</td>
              </tr>
            `).join("")}
            <tr style="border-top: 1.5px solid #d1d5db; font-weight: 700;">
              <td>Total Gross Earnings</td>
              <td class="amount-col" style="color: #059669;">${formatCurrency(totalEarnings)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Deductions Table -->
      <div>
        <table>
          <thead>
            <tr>
              <th>Deductions</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${deductions.map((d) => `
              <tr>
                <td>${d.ruleName}</td>
                <td class="amount-col" style="color: #e11d48;">-${formatCurrency(Math.abs(parseFloat(d.amount)))}</td>
              </tr>
            `).join("")}
            <tr style="border-top: 1.5px solid #d1d5db; font-weight: 700;">
              <td>Total Deductions</td>
              <td class="amount-col" style="color: #e11d48;">-${formatCurrency(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="net-salary-box">
      <div>
        <div class="net-label">NET TAKE-HOME SALARY</div>
        <div style="font-size: 11px; color: #60a5fa;">Direct Transfer to Verified Bank Account</div>
      </div>
      <div class="net-amount">${formatCurrency(parseFloat(payslip.netSalary))}</div>
    </div>

    <div class="footer-note">
      This is a system-generated document authorized under PeoplePay360 Operations. No signature required.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
