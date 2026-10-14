"""Synthetic original-PDF fixture, not a corpus or correctness claim."""
import io
import sys
from reportlab.pdfgen import canvas

buffer = io.BytesIO()
pdf = canvas.Canvas(buffer)
pdf.setFont("Helvetica", 10 + int(sys.argv[2]))
pdf.drawString(40, 750, "Original criminal source paper for extraction review.")
y = 725
if int(sys.argv[2]) % 2:
    pdf.showPage()
    pdf.setFont("Helvetica", 12)
    y = 750
for line in [f"Defendant named: {sys.argv[1]}",
             "These papers record identity only. No plea or court conclusion is established.",
             "The original document remains available for review before confirming any correction."]:
    pdf.drawString(40, y, line)
    y -= 24
pdf.save()
sys.stdout.buffer.write(buffer.getvalue())
