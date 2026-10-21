"""OOP Invoice & Receipt Generator for settled Payment Transactions."""

from datetime import datetime, timezone
from typing import Any, Dict

from app.models import PaymentTransaction


class InvoiceGenerator:
    """Encapsulates structured receipt data and PDF-ready HTML/bytes generation for transactions."""

    def __init__(self, company_name: str = "RideEat Mobility & Food Delivery Co., Ltd.") -> None:
        self._company_name = company_name
        self._tax_rate = 0.08  # 8% VAT standard in Vietnam

    def generate_structured_invoice(self, tx: PaymentTransaction) -> Dict[str, Any]:
        """Generate structured JSON receipt representation with tax breakdown."""
        subtotal = round(tx.amount / (1.0 + self._tax_rate), 2)
        vat_amount = round(tx.amount - subtotal, 2)
        issued_at = datetime.now(timezone.utc).isoformat()
        invoice_number = f"INV-{tx.id[:8].upper()}"

        return {
            "invoice_number": invoice_number,
            "issuer": self._company_name,
            "issued_at": issued_at,
            "transaction_id": tx.id,
            "user_id": tx.user_id,
            "reference_id": tx.reference_id,
            "reference_type": tx.reference_type,
            "transaction_type": tx.transaction_type,
            "payment_method": tx.payment_method,
            "status": tx.status,
            "currency": "VND",
            "subtotal": subtotal,
            "vat_rate": "8%",
            "vat_amount": vat_amount,
            "total_amount": tx.amount,
            "description": tx.description or f"RideEat {tx.reference_type} #{tx.reference_id}",
            "created_at": tx.created_at.isoformat() if tx.created_at else issued_at,
            "html_receipt": self.generate_html_receipt(tx, invoice_number, subtotal, vat_amount),
        }

    def generate_html_receipt(
        self,
        tx: PaymentTransaction,
        invoice_number: str,
        subtotal: float,
        vat_amount: float,
    ) -> str:
        """Render a print/PDF-ready HTML invoice document."""
        created_str = (
            tx.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            if tx.created_at
            else datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        )
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice {invoice_number}</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 24px; }}
  .invoice-box {{ max-width: 640px; margin: auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }}
  .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 12px; }}
  .title {{ font-size: 20px; font-weight: bold; color: #047857; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
  th, td {{ text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; }}
  .total-row td {{ font-weight: bold; font-size: 16px; color: #0f172a; }}
</style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div>
        <div class="title">{self._company_name}</div>
        <div>Official Electronic Tax Invoice</div>
      </div>
      <div>
        <strong>{invoice_number}</strong><br/>
        <small>{created_str}</small>
      </div>
    </div>
    <table>
      <tr><th>Customer ID</th><td>{tx.user_id}</td></tr>
      <tr><th>Reference</th><td>{tx.reference_type.upper()} #{tx.reference_id}</td></tr>
      <tr><th>Payment Method</th><td>{tx.payment_method.upper()}</td></tr>
      <tr><th>Status</th><td>{tx.status.upper()}</td></tr>
      <tr><th>Subtotal (Excl. VAT)</th><td>{subtotal:,.0f} VND</td></tr>
      <tr><th>VAT (8%)</th><td>{vat_amount:,.0f} VND</td></tr>
      <tr class="total-row"><td>Total Paid</td><td>{tx.amount:,.0f} VND</td></tr>
    </table>
  </div>
</body>
</html>"""

    def generate_pdf_bytes(self, tx: PaymentTransaction) -> bytes:
        """Return UTF-8 encoded HTML/receipt bytes ready for download or printing."""
        invoice = self.generate_structured_invoice(tx)
        return str(invoice["html_receipt"]).encode("utf-8")
