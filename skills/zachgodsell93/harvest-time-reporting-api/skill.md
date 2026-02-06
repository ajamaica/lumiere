---
slug: harvest-time-tracking
display_name: Harvest Time Tracking
version: 1.0.0
tags: [latest]
---

# Harvest API

## Description

Integration with Harvest time tracking software (API v2).

## Setup

### Environment Variables

- `HARVEST_ACCESS_TOKEN` - Get from https://id.getharvest.com/developers
- `HARVEST_ACCOUNT_ID` - Your Harvest account ID

### Authentication

All requests require these headers:

```
Authorization: Bearer $HARVEST_ACCESS_TOKEN
Harvest-Account-Id: $HARVEST_ACCOUNT_ID
User-Agent: YourApp (your@email.com)
```

## API Reference

Base URL: `https://api.harvestapp.com/v2`

### Time Entries

#### List Time Entries

```bash
curl "https://api.harvestapp.com/v2/time_entries" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `user_id`, `client_id`, `project_id`, `task_id`, `external_reference_id`, `is_billed`, `is_running`, `updated_since`, `from`, `to`, `page`, `per_page`

#### Create Time Entry (duration)

```bash
curl "https://api.harvestapp.com/v2/time_entries" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"project_id":12345,"task_id":67890,"spent_date":"2024-01-15","hours":2.5}'
```

#### Create Time Entry (start/end time)

```bash
curl "https://api.harvestapp.com/v2/time_entries" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"project_id":12345,"task_id":67890,"spent_date":"2024-01-15","started_time":"9:00am","ended_time":"11:30am"}'
```

#### Get Time Entry

```bash
curl "https://api.harvestapp.com/v2/time_entries/{TIME_ENTRY_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Update Time Entry

```bash
curl "https://api.harvestapp.com/v2/time_entries/{TIME_ENTRY_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"hours":3.0,"notes":"Updated notes"}'
```

#### Delete Time Entry

```bash
curl "https://api.harvestapp.com/v2/time_entries/{TIME_ENTRY_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

#### Restart a Stopped Timer

```bash
curl "https://api.harvestapp.com/v2/time_entries/{TIME_ENTRY_ID}/restart" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X PATCH
```

#### Stop a Running Timer

```bash
curl "https://api.harvestapp.com/v2/time_entries/{TIME_ENTRY_ID}/stop" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X PATCH
```

### Projects

#### List Projects

```bash
curl "https://api.harvestapp.com/v2/projects" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `is_active`, `client_id`, `updated_since`, `page`, `per_page`

#### Get Project

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Project

```bash
curl "https://api.harvestapp.com/v2/projects" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"client_id":12345,"name":"New Project","is_billable":true,"bill_by":"Project","budget_by":"project"}'
```

#### Update Project

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"name":"Updated Project Name"}'
```

#### Delete Project

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### Project User Assignments

#### List User Assignments for Project

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}/user_assignments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create User Assignment

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}/user_assignments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"user_id":12345}'
```

### Project Task Assignments

#### List Task Assignments for Project

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}/task_assignments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Task Assignment

```bash
curl "https://api.harvestapp.com/v2/projects/{PROJECT_ID}/task_assignments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"task_id":12345}'
```

### Tasks

#### List Tasks

```bash
curl "https://api.harvestapp.com/v2/tasks" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `is_active`, `updated_since`, `page`, `per_page`

#### Get Task

```bash
curl "https://api.harvestapp.com/v2/tasks/{TASK_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Task

```bash
curl "https://api.harvestapp.com/v2/tasks" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"New Task","default_hourly_rate":100.0}'
```

#### Update Task

```bash
curl "https://api.harvestapp.com/v2/tasks/{TASK_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"name":"Updated Task Name"}'
```

#### Delete Task

```bash
curl "https://api.harvestapp.com/v2/tasks/{TASK_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### Clients

#### List Clients

```bash
curl "https://api.harvestapp.com/v2/clients" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `is_active`, `updated_since`, `page`, `per_page`

#### Get Client

```bash
curl "https://api.harvestapp.com/v2/clients/{CLIENT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Client

```bash
curl "https://api.harvestapp.com/v2/clients" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"New Client","currency":"USD"}'
```

#### Update Client

```bash
curl "https://api.harvestapp.com/v2/clients/{CLIENT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"name":"Updated Client Name"}'
```

#### Delete Client

```bash
curl "https://api.harvestapp.com/v2/clients/{CLIENT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### Contacts

#### List Contacts

```bash
curl "https://api.harvestapp.com/v2/contacts" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `client_id`, `updated_since`, `page`, `per_page`

#### Get Contact

```bash
curl "https://api.harvestapp.com/v2/contacts/{CONTACT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Contact

```bash
curl "https://api.harvestapp.com/v2/contacts" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"client_id":12345,"first_name":"John","last_name":"Doe","email":"john@example.com"}'
```

#### Update Contact

```bash
curl "https://api.harvestapp.com/v2/contacts/{CONTACT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"email":"newemail@example.com"}'
```

#### Delete Contact

```bash
curl "https://api.harvestapp.com/v2/contacts/{CONTACT_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### Users

#### List Users

```bash
curl "https://api.harvestapp.com/v2/users" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `is_active`, `updated_since`, `page`, `per_page`

#### Get Current User

```bash
curl "https://api.harvestapp.com/v2/users/me" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Get User

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create User

```bash
curl "https://api.harvestapp.com/v2/users" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"first_name":"Jane","last_name":"Doe","email":"jane@example.com"}'
```

#### Update User

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"first_name":"Janet"}'
```

#### Delete User

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### User Project Assignments

#### List Project Assignments for Current User

```bash
curl "https://api.harvestapp.com/v2/users/me/project_assignments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### List Project Assignments for User

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}/project_assignments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

### Billable Rates

#### List Billable Rates for User

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}/billable_rates" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Billable Rate

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}/billable_rates" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"amount":150.0,"start_date":"2024-01-01"}'
```

### Cost Rates

#### List Cost Rates for User

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}/cost_rates" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Cost Rate

```bash
curl "https://api.harvestapp.com/v2/users/{USER_ID}/cost_rates" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"amount":75.0,"start_date":"2024-01-01"}'
```

### Invoices

#### List Invoices

```bash
curl "https://api.harvestapp.com/v2/invoices" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `client_id`, `project_id`, `updated_since`, `from`, `to`, `state`, `page`, `per_page`

#### Get Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"client_id":12345,"subject":"Invoice for January","due_date":"2024-02-15","line_items":[{"kind":"Service","description":"Consulting","unit_price":150,"quantity":10}]}'
```

#### Update Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"subject":"Updated Invoice Subject"}'
```

#### Delete Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### Invoice Line Items

#### Create Invoice Line Item

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}/line_items" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"line_items":[{"kind":"Service","description":"Additional work","unit_price":100,"quantity":5}]}'
```

### Invoice Payments

#### List Payments for Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}/payments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Payment

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}/payments" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"amount":500.0,"paid_at":"2024-01-20T00:00:00Z"}'
```

### Invoice Messages

#### List Messages for Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}/messages" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Send Invoice

```bash
curl "https://api.harvestapp.com/v2/invoices/{INVOICE_ID}/messages" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"recipients":[{"email":"client@example.com"}],"subject":"Invoice #123","body":"Please find attached invoice."}'
```

### Invoice Item Categories

#### List Invoice Item Categories

```bash
curl "https://api.harvestapp.com/v2/invoice_item_categories" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

### Estimates

#### List Estimates

```bash
curl "https://api.harvestapp.com/v2/estimates" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `client_id`, `updated_since`, `from`, `to`, `state`, `page`, `per_page`

#### Get Estimate

```bash
curl "https://api.harvestapp.com/v2/estimates/{ESTIMATE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Estimate

```bash
curl "https://api.harvestapp.com/v2/estimates" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"client_id":12345,"subject":"Project Estimate","line_items":[{"kind":"Service","description":"Development","unit_price":150,"quantity":40}]}'
```

### Expenses

#### List Expenses

```bash
curl "https://api.harvestapp.com/v2/expenses" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `user_id`, `client_id`, `project_id`, `is_billed`, `updated_since`, `from`, `to`, `page`, `per_page`

#### Get Expense

```bash
curl "https://api.harvestapp.com/v2/expenses/{EXPENSE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Expense

```bash
curl "https://api.harvestapp.com/v2/expenses" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"project_id":12345,"expense_category_id":67890,"spent_date":"2024-01-15","total_cost":50.00,"notes":"Office supplies"}'
```

#### Update Expense

```bash
curl "https://api.harvestapp.com/v2/expenses/{EXPENSE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"notes":"Updated expense notes"}'
```

#### Delete Expense

```bash
curl "https://api.harvestapp.com/v2/expenses/{EXPENSE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -X DELETE
```

### Expense Categories

#### List Expense Categories

```bash
curl "https://api.harvestapp.com/v2/expense_categories" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

Query parameters: `is_active`, `updated_since`, `page`, `per_page`

#### Get Expense Category

```bash
curl "https://api.harvestapp.com/v2/expense_categories/{EXPENSE_CATEGORY_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Expense Category

```bash
curl "https://api.harvestapp.com/v2/expense_categories" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Travel"}'
```

### Reports

#### Time Reports - Clients

```bash
curl "https://api.harvestapp.com/v2/reports/time/clients" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Time Reports - Projects

```bash
curl "https://api.harvestapp.com/v2/reports/time/projects" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Time Reports - Tasks

```bash
curl "https://api.harvestapp.com/v2/reports/time/tasks" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Time Reports - Team

```bash
curl "https://api.harvestapp.com/v2/reports/time/team" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Uninvoiced Report

```bash
curl "https://api.harvestapp.com/v2/reports/uninvoiced" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Expense Reports - Clients

```bash
curl "https://api.harvestapp.com/v2/reports/expenses/clients" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Expense Reports - Projects

```bash
curl "https://api.harvestapp.com/v2/reports/expenses/projects" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Expense Reports - Categories

```bash
curl "https://api.harvestapp.com/v2/reports/expenses/categories" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Expense Reports - Team

```bash
curl "https://api.harvestapp.com/v2/reports/expenses/team" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -G \
  -d "from=2024-01-01" \
  -d "to=2024-01-31"
```

#### Project Budget Report

```bash
curl "https://api.harvestapp.com/v2/reports/project_budget" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

### Company

#### Get Company

```bash
curl "https://api.harvestapp.com/v2/company" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Update Company

```bash
curl "https://api.harvestapp.com/v2/company" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"wants_timestamp_timers":true}'
```

### Roles

#### List Roles

```bash
curl "https://api.harvestapp.com/v2/roles" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Get Role

```bash
curl "https://api.harvestapp.com/v2/roles/{ROLE_ID}" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)"
```

#### Create Role

```bash
curl "https://api.harvestapp.com/v2/roles" \
  -H "Authorization: Bearer $HARVEST_ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $HARVEST_ACCOUNT_ID" \
  -H "User-Agent: MyApp (me@example.com)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Developer","user_ids":[12345,67890]}'
```

## Pagination

All list endpoints support pagination with `page` and `per_page` parameters. Responses include:

- `page`: Current page number
- `total_pages`: Total number of pages
- `total_entries`: Total number of records
- `next_page`: Next page number (null if last page)
- `previous_page`: Previous page number (null if first page)

## Rate Limiting

Harvest API has a rate limit of 100 requests per 15 seconds. Response headers include:

- `X-Rate-Limit-Limit`: Request limit
- `X-Rate-Limit-Remaining`: Remaining requests
- `X-Rate-Limit-Reset`: Seconds until limit resets

## Changelog

### v1.0.0

- Initial release with full API v2 coverage
- Time entries, projects, tasks, clients, contacts
- Users, billable rates, cost rates
- Invoices, estimates, payments, messages
- Expenses and expense categories
- Reports (time, expense, project budget)
- Company and roles management
