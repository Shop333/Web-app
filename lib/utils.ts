/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Format numeric value into Indonesian Rupiah (e.g., Rp 15.000)
export function formatRupiah(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(value)) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value).replace('IDR', 'Rp').trim();
}

// Generate invoice number like INV-YYYYMMDD-001
export function generateInvoiceNumber(sequence: number = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seqStr = String(sequence).padStart(3, '0');
  
  return `INV-${year}${month}${day}-${seqStr}`;
}

// Generate automatic SKU from product name
export function generateSKU(name: string): string {
  if (!name) return 'SKU-GEN-000';
  
  const cleanName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // remove special characters
    .split(/\s+/)
    .slice(0, 3); // pick up to 3 words

  let prefix = '';
  if (cleanName.length === 1) {
    prefix = cleanName[0].substring(0, 4);
  } else if (cleanName.length === 2) {
    prefix = cleanName[0].substring(0, 2) + cleanName[1].substring(0, 2);
  } else {
    prefix = cleanName.map(word => word[0]).join('');
  }
  
  prefix = prefix.padEnd(4, 'X').substring(0, 4);
  const randomNum = Math.floor(100 + Math.random() * 900); // 3 digit random
  return `SKU-${prefix}-${randomNum}`;
}

// Format SQLite text datetime (YYYY-MM-DD HH:MM:SS) to Indonesian display
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  
  // Handlers for SQLite datetime style or direct iso formats
  const t = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(t.getTime())) {
    const rawDate = new Date(dateStr);
    if (isNaN(rawDate.getTime())) return dateStr;
    return rawDate.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return t.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper to calculate exact change
export function calculateChange(total: number, paid: number): number {
  return Math.max(0, paid - total);
}

// Tailwind class merger helper (replaces clsx/tailwind-merge standard utility)
export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}
