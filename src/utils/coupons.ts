// Extra: cupons. Regras puras de exibição; quem decide o desconto é o banco.

// Mesmo formato aceito pelo banco: letras e números, sem espaços, em maiúsculas.
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isCouponCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{3,20}$/.test(code);
}

// Total mostrado no checkout depois da prévia do cupom (em centavos, para não errar).
export function totalWithDiscount(total: number, discount: number): number {
  const cents = Math.round(total * 100) - Math.round(Math.max(0, discount) * 100);
  return Math.max(0, cents) / 100;
}
