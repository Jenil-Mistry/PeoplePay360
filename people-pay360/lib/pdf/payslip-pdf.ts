import PDFDocument from "pdfkit";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface PayslipPdfData {
  id: number | string;
  payrunName?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  employeeName?: string | null;
  empId?: string | null;
  email?: string | null;
  jobPosition?: string | null;
  departmentName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  contractRef?: string | null;
  workedDays?: number | string | null;
  basicWage?: number | string | null;
  grossSalary?: number | string | null;
  netSalary?: number | string | null;
  lines: Array<{
    ruleCode?: string | null;
    ruleName: string;
    category: string;
    amount: string | number;
  }>;
}

/**
 * Generates an official, beautifully styled PDF payslip buffer using PDFKit.
 */
export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const employeeName = data.employeeName || "Employee";
      const empId = data.empId || `EMP-${data.id}`;

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Payslip - ${employeeName} - ${data.payrunName || "Period"}`,
          Author: "PeoplePay360 Operations",
          Subject: "Salary Payslip",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width - 80; // 595.28 - 80 = 515.28 pt
      const left = 40;
      let y = 40;

      // ── Header ──────────────────────────────────────────
      doc.rect(left, y, pageWidth, 4).fill("#2563eb");
      y += 14;

      doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text("PeoplePay360 Technologies", left, y);
      doc.fillColor("#2563eb").fontSize(13).font("Helvetica-Bold").text("OFFICIAL PAYSLIP", left, y, {
        align: "right",
        width: pageWidth,
      });

      y += 22;
      doc.fillColor("#64748b").fontSize(8.5).font("Helvetica").text(
        "Integrated HR & Payroll Management • CIN: U72900MH2026PTC012345 • Mumbai / Bengaluru, India",
        left,
        y
      );

      const periodStr = `Period: ${data.periodStart ? formatDate(data.periodStart) : "—"} to ${
        data.periodEnd ? formatDate(data.periodEnd) : "—"
      }`;
      doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold").text(
        `${data.payrunName || "Monthly Payroll"} (${periodStr})`,
        left,
        y,
        { align: "right", width: pageWidth }
      );

      y += 18;
      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(left, y).lineTo(left + pageWidth, y).stroke();
      y += 12;

      // ── Employee & Contract Summary Box ─────────────────
      const infoBoxHeight = 82;
      doc.roundedRect(left, y, pageWidth, infoBoxHeight, 6).fillAndStroke("#f8fafc", "#cbd5e1");

      const colWidth = pageWidth / 4;
      const maskedAccount = data.bankAccountNumber
        ? `••••${String(data.bankAccountNumber).slice(-4)}`
        : "Not Provided";

      const renderMetaItem = (label: string, value: string | null | undefined, col: number, row: number) => {
        const itemX = left + 12 + col * colWidth;
        const itemY = y + 10 + row * 24;
        doc.fillColor("#64748b").fontSize(7.5).font("Helvetica-Bold").text(label.toUpperCase(), itemX, itemY);
        doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica-Bold").text(value || "—", itemX, itemY + 10, {
          width: colWidth - 14,
          lineBreak: false,
          ellipsis: true,
        });
      };

      // Row 1
      renderMetaItem("Employee Name", employeeName, 0, 0);
      renderMetaItem("Employee ID", empId, 1, 0);
      renderMetaItem("Department", data.departmentName || "Operations", 2, 0);
      renderMetaItem("Designation", data.jobPosition || "Specialist", 3, 0);

      // Row 2
      renderMetaItem("Bank Name", data.bankName || "Direct Transfer", 0, 1);
      renderMetaItem("Account Number", maskedAccount, 1, 1);
      renderMetaItem("Contract Ref", data.contractRef || "Standard Contract", 2, 1);
      renderMetaItem("Worked Days", `${data.workedDays} Days`, 3, 1);

      // Row 3
      renderMetaItem("Email Address", data.email || "—", 0, 2);
      renderMetaItem("Basic Wage Rate", formatCurrency(Number(data.basicWage)), 1, 2);
      renderMetaItem("Payment Status", "SALARY CREDITED (PAID)", 2, 2);
      renderMetaItem("Disbursement", "Direct Bank Account Credit", 3, 2);

      y += infoBoxHeight + 16;

      // ── Split Earnings and Deductions ────────────────────
      const earnings = data.lines.filter((l) => l.category === "BASIC" || l.category === "ALLOWANCE");
      const deductions = data.lines.filter((l) => l.category === "DEDUCTION");

      const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
      const totalDeductions = deductions.reduce((sum, d) => sum + Math.abs(parseFloat(String(d.amount))), 0);

      const tableGap = 12;
      const tableWidth = (pageWidth - tableGap) / 2;
      const tableStartY = y;

      // --- Left: Earnings Table ---
      const earningsX = left;
      doc.roundedRect(earningsX, tableStartY, tableWidth, 22, 4).fill("#0284c7");
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text("EARNINGS & ALLOWANCES", earningsX + 10, tableStartY + 6);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text("AMOUNT", earningsX + 10, tableStartY + 6, {
        align: "right",
        width: tableWidth - 20,
      });

      let ey = tableStartY + 26;
      earnings.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(earningsX, ey, tableWidth, 20).fill(rowBg);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(item.ruleName, earningsX + 10, ey + 5, {
          width: tableWidth - 100,
          ellipsis: true,
        });
        doc.fillColor("#047857").fontSize(8.5).font("Helvetica-Bold").text(
          formatCurrency(parseFloat(String(item.amount))),
          earningsX + 10,
          ey + 5,
          { align: "right", width: tableWidth - 20 }
        );
        ey += 20;
      });

      // Total Gross Row
      doc.rect(earningsX, ey, tableWidth, 24).fill("#f0fdf4");
      doc.strokeColor("#86efac").lineWidth(1).rect(earningsX, ey, tableWidth, 24).stroke();
      doc.fillColor("#166534").fontSize(9).font("Helvetica-Bold").text("Total Gross Salary", earningsX + 10, ey + 7);
      doc.fillColor("#166534").fontSize(9).font("Helvetica-Bold").text(
        formatCurrency(totalEarnings || Number(data.grossSalary)),
        earningsX + 10,
        ey + 7,
        { align: "right", width: tableWidth - 20 }
      );
      const earningsBottomY = ey + 24;

      // --- Right: Deductions Table ---
      const deductionsX = left + tableWidth + tableGap;
      doc.roundedRect(deductionsX, tableStartY, tableWidth, 22, 4).fill("#e11d48");
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text("DEDUCTIONS & TAXES", deductionsX + 10, tableStartY + 6);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text("AMOUNT", deductionsX + 10, tableStartY + 6, {
        align: "right",
        width: tableWidth - 20,
      });

      let dy = tableStartY + 26;
      if (deductions.length === 0) {
        doc.rect(deductionsX, dy, tableWidth, 20).fill("#ffffff");
        doc.fillColor("#94a3b8").fontSize(8.5).font("Helvetica-Oblique").text("No standard deductions applied", deductionsX + 10, dy + 5);
        dy += 20;
      } else {
        deductions.forEach((item, index) => {
          const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
          doc.rect(deductionsX, dy, tableWidth, 20).fill(rowBg);
          doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(item.ruleName, deductionsX + 10, dy + 5, {
            width: tableWidth - 100,
            ellipsis: true,
          });
          const amt = Math.abs(parseFloat(String(item.amount)));
          doc.fillColor("#b91c1c").fontSize(8.5).font("Helvetica-Bold").text(`-${formatCurrency(amt)}`, deductionsX + 10, dy + 5, {
            align: "right",
            width: tableWidth - 20,
          });
          dy += 20;
        });
      }

      // Total Deductions Row
      doc.rect(deductionsX, dy, tableWidth, 24).fill("#fef2f2");
      doc.strokeColor("#fca5a5").lineWidth(1).rect(deductionsX, dy, tableWidth, 24).stroke();
      doc.fillColor("#991b1b").fontSize(9).font("Helvetica-Bold").text("Total Deductions", deductionsX + 10, dy + 7);
      doc.fillColor("#991b1b").fontSize(9).font("Helvetica-Bold").text(
        `-${formatCurrency(totalDeductions)}`,
        deductionsX + 10,
        dy + 7,
        { align: "right", width: tableWidth - 20 }
      );
      const deductionsBottomY = dy + 24;

      // Pick deepest Y
      y = Math.max(earningsBottomY, deductionsBottomY) + 18;

      // ── Net Salary Callout Box ────────────────────────────
      const netBoxHeight = 52;
      doc.roundedRect(left, y, pageWidth, netBoxHeight, 6).fillAndStroke("#eff6ff", "#93c5fd");

      doc.fillColor("#1e40af").fontSize(10).font("Helvetica-Bold").text("NET TAKE-HOME SALARY", left + 16, y + 12);
      doc.fillColor("#3b82f6").fontSize(8).font("Helvetica").text(
        "Directly Credited to Verified Bank Account (Electronic Fund Transfer)",
        left + 16,
        y + 28
      );

      doc.fillColor("#1e3a8a").fontSize(18).font("Helvetica-Bold").text(
        formatCurrency(Number(data.netSalary)),
        left,
        y + 14,
        { align: "right", width: pageWidth - 16 }
      );

      y += netBoxHeight + 20;

      // ── Compliance / Signature Notice ────────────────────
      doc.rect(left, y, pageWidth, 42).fill("#f8fafc");
      doc.strokeColor("#e2e8f0").rect(left, y, pageWidth, 42).stroke();
      doc.fillColor("#64748b").fontSize(7.5).font("Helvetica").text(
        "Important Notice: This salary slip is a confidential computer-generated electronic record authenticated under PeoplePay360 Enterprise Payroll Services. It does not require a physical signature. For any tax declarations, discrepancies, or queries, please contact your HR or Payroll department.",
        left + 10,
        y + 8,
        { width: pageWidth - 20, align: "center", lineGap: 2 }
      );

      // ── Footer ───────────────────────────────────────────
      const footerY = doc.page.height - 35;
      doc.strokeColor("#e2e8f0").lineWidth(0.75).moveTo(left, footerY - 8).lineTo(left + pageWidth, footerY - 8).stroke();
      doc.fillColor("#94a3b8").fontSize(7.5).font("Helvetica").text(
        `PeoplePay360 Technologies Pvt Ltd • Generated on ${new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} • Private & Confidential`,
        left,
        footerY,
        { align: "center", width: pageWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
