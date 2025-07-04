import jsPDF from 'jspdf';
import { Quote, QuoteItem } from '../types';

export const generateQuotePDF = async (quote: Quote, quoteItems: QuoteItem[], organizationName: string) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  let yPosition = 20;

  // Helper function to add text with automatic line wrapping
  const addText = (text: string, x: number, y: number, maxWidth?: number, fontSize = 10) => {
    pdf.setFontSize(fontSize);
    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    } else {
      pdf.text(text, x, y);
      return y + (fontSize * 0.4);
    }
  };

  // Header
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('QUOTE', pageWidth - 20, yPosition, { align: 'right' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  yPosition += 10;
  pdf.text(quote.quote_number, pageWidth - 20, yPosition, { align: 'right' });

  // Company Info
  yPosition = 20;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText(organizationName, 20, yPosition, undefined, 16);
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPosition = addText(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 20, yPosition);
  yPosition = addText(`Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}`, 20, yPosition);

  // Client Info
  yPosition += 15;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('Bill To:', 20, yPosition, undefined, 12);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPosition += 5;
  yPosition = addText(quote.client.name, 20, yPosition);
  
  if (quote.client.contact_person) {
    yPosition = addText(`Attn: ${quote.client.contact_person}`, 20, yPosition);
  }
  
  if (quote.client.email) {
    yPosition = addText(quote.client.email, 20, yPosition);
  }
  
  if (quote.client.phone) {
    yPosition = addText(quote.client.phone, 20, yPosition);
  }
  
  if (quote.client.address) {
    yPosition = addText(quote.client.address, 20, yPosition, pageWidth - 40);
  }

  // Items Table
  yPosition += 20;
  const tableStartY = yPosition;
  
  // Table headers
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.rect(20, yPosition - 5, pageWidth - 40, 10);
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
  
  pdf.text('Description', 25, yPosition);
  pdf.text('Qty', pageWidth - 120, yPosition, { align: 'center' });
  pdf.text('Unit Price', pageWidth - 90, yPosition, { align: 'center' });
  pdf.text('Discount', pageWidth - 60, yPosition, { align: 'center' });
  pdf.text('Total', pageWidth - 25, yPosition, { align: 'right' });
  
  yPosition += 10;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  quoteItems.forEach((item, index) => {
    const rowHeight = 15;
    
    // Alternate row colors
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(20, yPosition - 5, pageWidth - 40, rowHeight, 'F');
    }
    
    // Product name and description
    let itemText = item.product.name;
    if (item.product.description) {
      itemText += `\n${item.product.description}`;
    }
    
    const lines = pdf.splitTextToSize(itemText, 100);
    pdf.text(lines, 25, yPosition);
    
    // Quantity
    pdf.text(item.quantity.toString(), pageWidth - 120, yPosition, { align: 'center' });
    
    // Unit Price
    pdf.text(`$${item.unit_price.toFixed(2)}`, pageWidth - 90, yPosition, { align: 'center' });
    
    // Discount
    pdf.text(`${item.discount_percent}%`, pageWidth - 60, yPosition, { align: 'center' });
    
    // Total
    pdf.text(`$${item.total_amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
    
    yPosition += Math.max(rowHeight, lines.length * 4);
    
    // Add new page if needed
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
  });

  // Totals section
  yPosition += 10;
  const totalsX = pageWidth - 80;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', totalsX, yPosition);
  pdf.text(`$${quote.subtotal.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
  yPosition += 8;
  
  if (quote.discount_amount > 0) {
    pdf.text('Discount:', totalsX, yPosition);
    pdf.text(`-$${quote.discount_amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 8;
  }
  
  if (quote.tax_amount > 0) {
    pdf.text('Tax:', totalsX, yPosition);
    pdf.text(`$${quote.tax_amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 8;
  }
  
  // Total line
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.line(totalsX - 5, yPosition - 2, pageWidth - 20, yPosition - 2);
  pdf.text('Total:', totalsX, yPosition);
  pdf.text(`$${quote.total_amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });

  // Terms and conditions
  if (quote.terms_conditions) {
    yPosition += 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    yPosition = addText('Terms & Conditions:', 20, yPosition, undefined, 10);
    
    pdf.setFont('helvetica', 'normal');
    yPosition += 5;
    addText(quote.terms_conditions, 20, yPosition, pageWidth - 40);
  }

  // Notes
  if (quote.notes) {
    yPosition += 15;
    pdf.setFont('helvetica', 'bold');
    yPosition = addText('Notes:', 20, yPosition, undefined, 10);
    
    pdf.setFont('helvetica', 'normal');
    yPosition += 5;
    addText(quote.notes, 20, yPosition, pageWidth - 40);
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Generated on ${new Date().toLocaleDateString()} by ${organizationName}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Save the PDF
  pdf.save(`${quote.quote_number}.pdf`);
};