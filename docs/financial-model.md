# Financial model

All money is in USD 10,000 units. One round represents one financial year; time is compressed for play. This is a simulation, not an accounting, credit, surety or legal standard.

## Reports and budgets

Opening cash is contributed capital. Revenue and direct costs are recognized on completion. Paid construction costs remain WIP until completion or termination. Completed receivables use the same installment-by-installment cent allocation as joint-venture cash receipts. Advances, accrued operating costs, loans, loan interest and surety recourse are liabilities. Equipment net book value is a noncurrent asset. Equity is opening capital plus reported pretax profit, independently calculated; no balancing plug is used.

Operating budgets lock on the first award. Bid estimates lock separately for each partner. Financial reports include current/quick ratios, working capital, pretax ROA/ROE/ROS, debt/equity, cash ledger and a cost-to-cost revenue comparison. Forecast gains on unfinished work do not count toward the score; forecast losses do. Income tax, inventory, real-world insolvency and long-term funding are outside the model.

## Bank

The bank starts with 600 units of cash. Actual lending reduces that cash; fees, interest and repayments replenish it. Deposit interest is paid from the same cash pool; accrued deposit interest reserves reduce lending availability. Borrowed money and project advances do not earn deposit interest.

The risk index increases with leverage, cash shortage, incidents and backlog relative to crew capacity. Prior default, nonpositive equity, excessive risk, insufficient capital and a remaining round shorter than 120 seconds cause rejection. Working-capital limits depend on equity; equipment loans are capped at 65% of the purchase price. Total principal exposure per company is capped at 120. Rates and fees increase with risk and are fixed for each issued loan. The bank charges above its 4% deposit yield, with an additional risk margin and origination fee.

Interest accrues each second. Loans mature within 360 seconds; the bank then collects available cash above a 10-unit operating cushion. After 30 overdue seconds it liquidates pledged equipment at 40% of its condition-adjusted replacement value and applies proceeds to the loan. Unpaid residual debt remains; a default blocks new loans. At round end available company cash repays loans and unpaid amounts remain in the final balance sheet. No free bailout or random bank penalty is used.

## Equipment

The dealer supplies an excavator, crane and processing plant in new and 65% condition variants every 180 seconds. Replacement values are 48, 64 and 40. Unsold dealer inventory expires after 360 seconds. Player assets never expire.

Purchases capitalize cost. Straight-line depreciation has a two-round life and 20% residual. An available unlisted asset is assigned automatically to the next awarded job. Excavators, cranes and processing plants add 12%, 16% and 10% times condition to speed respectively, capped at 18% per project. Use reduces condition and incurs maintenance at 6% of replacement value per full round of use. These are operating expenses, not additional WIP costs.

Player asking prices must be 50–120% of condition-adjusted replacement value. The dealer buys at 45%, preventing buy-and-immediately-sell profit. Busy or pledged equipment cannot be listed or sold. Sales transfer ownership and record proceeds less carrying value as disposal gain/loss. Every transaction revalidates funds, ownership, listing status, lien and revision. The room database commits buyer, seller and bank changes in one optimistic compare-and-swap transaction. Request IDs suppress duplicate retries; stale asset revisions prevent repeated resale.

## Surety

Public work automatically requires underwriting at award. Each partner is reviewed separately for its share. The bond exposure is 30% of contract share. Outstanding exposure is limited by company equity and by the surety's 600-unit initial capital plus premiums and recoveries. Backlog, crew capacity, leverage, cash and incidents affect risk and premium. Negative equity, excessive risk, unpaid recourse or insufficient premium cash cause rejection. Funding checks reserve the premium before assessing start cash and full-cycle funding.

Premium = exposure × (1.5% + risk index × 8%). A bond does not add contractor cash and is not a loan. Completion releases exposure. If work terminates, compensation paid to the owner is the lesser of bond exposure and 25% of remaining estimated costs plus 5% of contract share. The same amount is expensed and owed by the contractor as recourse. Claims are recorded once. An active company can repay recourse; exited-company liabilities remain frozen for review.

## Compatibility and limitations

Existing full-mode saved rooms keep their earlier financing rules; institutions are enabled only in new rooms. Older records without opening capital do not receive fabricated historical reports. Unsupported room modes are rejected at the public API.

The simulation cannot prevent colluding players from deliberately transferring economic value through permitted prices. It does prevent the server from creating money through repeated asset sales, free borrowing or duplicate requests. Equipment benefits are deliberately generic rather than a detailed fleet scheduler. Bond claims use a disclosed formula rather than litigation or a replacement-contractor process.
