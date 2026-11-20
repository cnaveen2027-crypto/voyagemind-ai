import { jsPDF } from 'jspdf';
import { TripRecord } from '../types/travel';
import { formatCurrency } from './currency';

export function exportTripToPdf(trip: TripRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 44;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed = 40) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      y = 52;
    }
  };

  // Header
  doc.setFillColor(16, 36, 58);
  doc.rect(0, 0, pageWidth, 88, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('VoyageMind AI — Travel Itinerary', margin, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(
    `${trip.origin} to ${trip.destination}  |  ${trip.departureDate} – ${trip.returnDate}  |  ${trip.travellers} Traveller(s)`,
    margin,
    62
  );

  y = 114;
  doc.setTextColor(24, 43, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    `Target Budget: ${formatCurrency(trip.budget, trip.currency)}   |   Status: ${trip.status.toUpperCase()}`,
    margin,
    y
  );
  y += 26;

  // Itinerary Days
  for (const day of trip.itinerary) {
    ensureSpace(80);
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y - 14, maxWidth, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 36, 58);
    doc.text(
      `Day ${day.day}${day.date ? ` (${day.date})` : ''}: ${day.theme}`,
      margin + 8,
      y + 2
    );
    y += 22;

    for (const act of day.activities) {
      ensureSpace(56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(36, 123, 160);
      doc.text(
        `${act.timeSlot.toUpperCase()} · ${act.title} (${formatCurrency(act.estimatedCost, trip.currency)} est.)`,
        margin + 8,
        y
      );
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 75, 90);
      doc.setFontSize(9.5);
      const descLines = doc.splitTextToSize(
        `${act.location} · ${act.travelTime} (${act.transportMode}) — ${act.description}`,
        maxWidth - 16
      );
      doc.text(descLines, margin + 8, y);
      y += descLines.length * 12 + 8;
    }

    if (day.suggestedRestaurants?.length) {
      ensureSpace(26);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(90, 105, 120);
      const restText = `Dining: ${day.suggestedRestaurants.map((r) => `${r.name} (${r.cuisine})`).join(', ')}`;
      const restLines = doc.splitTextToSize(restText, maxWidth - 16);
      doc.text(restLines, margin + 8, y);
      y += restLines.length * 11 + 10;
    }
    y += 8;
  }

  // Budget Summary if present
  if (trip.budgetBreakdown?.categories?.length) {
    ensureSpace(120);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(16, 36, 58);
    doc.text('Estimated Budget Breakdown (Illustrative Estimates)', margin, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const cat of trip.budgetBreakdown.categories) {
      ensureSpace(18);
      doc.text(
        `${cat.category}: ${formatCurrency(cat.estimatedAmount, trip.currency)} (${cat.percentage}%)`,
        margin + 8,
        y
      );
      y += 15;
    }
  }

  doc.save(`VoyageMind-${trip.destination.replace(/\s+/g, '-')}-Itinerary.pdf`);
}
