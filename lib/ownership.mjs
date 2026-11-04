export const members = p => p.joint?.members || [{ id: p.owner, share: 100 }];
export const participates = (p, id) => !!id && members(p).some(m => m.id === id);
export const portion = (p, id, value) => { const rows = members(p); if (rows.length === 1)
    return rows[0].id === id ? value : 0; const first = Math.round(value * rows[0].share) / 100; return rows[0].id === id ? first : rows[1].id === id ? Math.round((value - first) * 100) / 100 : 0; };
export const slotsFor = (p, id) => participates(p, id) ? (p.joint ? Math.max(1, Math.ceil((p.crewSlots || 1) / 2)) : (p.crewSlots || 1)) : 0;
export const paidFor = (p, id) => (p.costPayments || []).filter(x => x.paid).reduce((n, x) => n + portion(p, id, x.paidAmount ?? x.amount), 0);
export const receivedFor = (p, id) => (p.receipts || []).filter(x => x.received).reduce((n, x) => n + portion(p, id, x.amount), 0);
