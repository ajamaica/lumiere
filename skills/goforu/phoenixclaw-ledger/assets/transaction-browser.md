---
date: { { GENERATED_DATE } }
type: transaction-browser
tags: [finance, ledger, transactions]
---

# 🔍 Transaction Browser

> [!info] Regeneration Strategy
> This file is a static snapshot of your financial history. It is regenerated periodically to reflect new transactions.
> Last updated: {{GENERATED_DATE}}

> [!tip] Search & Filter
> Since this is a static Markdown file, use **Ctrl+F** (or **Cmd+F** on Mac) to search for specific merchants, categories, or amounts.

## ⚡ Recent Activity (Last 7 Days)

{{#each RECENT_TRANSACTIONS}}

> [!expense] {{icon}} {{date}} {{description}}
> {{details}} | **{{currency}}{{amount}}** | {{category}}
> _Source: {{source}}_

{{/each}}

## 📅 Browse by Month

{{#each MONTHLY_SUMMARIES}}

- [[{{path}}|{{month_display}}]] — {{currency}}{{total_spending}}
  {{/each}}

## 🗂️ Browse by Category

_Grouped by category, sorted by total amount descending_

{{#each CATEGORY_GROUPS}}

### {{icon}} {{category_name}} ({{currency}}{{total_amount}})

| Date | Description | Amount |
| :--- | :---------- | :----- |

{{#each transactions}}
| {{date}} | {{description}} | {{currency}}{{amount}} |
{{/each}}

{{/each}}

## 🧾 All Transactions

_Reverse chronological order_

| Date | Description | Category | Amount |
| :--- | :---------- | :------- | :----- |

{{#each ALL_TRANSACTIONS}}
| {{date}} | {{description}} | {{category}} | {{currency}}{{amount}} |
{{/each}}
