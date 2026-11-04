// Uses only the authenticated company's existing, server-filtered project view.
export function bidResults(state) {
    if (!state?.me || state.host)
        return [];
    return state.projects.filter(p => p.state !== 'open' && p.myBid != null).map(p => {
        const winnerIds = p.joint?.members?.map(m => m.id) || (p.owner ? [p.owner] : []);
        return { id: p.id, name: p.name, status: p.cancelled ? 'cancelled' : winnerIds.includes(state.me.id) ? 'won' : 'lost', winners: winnerIds.map(id => state.teams.find(t => t.id === id)?.name || id), amount: p.owner && !p.cancelled ? p.price : null };
    });
}
