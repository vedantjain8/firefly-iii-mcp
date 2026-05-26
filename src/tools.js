/**
 * Complete Firefly III API v1 tool definitions.
 * Source of truth: https://github.com/firefly-iii/api-docs-generator (v6.x)
 *
 * SCHEMA NOTE:
 *   inputSchema.properties values must be valid JSON Schema property descriptors:
 *   { type, description } — NOT { name, type, description, required }.
 *   required fields go in the top-level inputSchema.required array.
 */

import { get, post, put, del, binary } from './client.js';

// ─── JSON Schema property builders ──────────────────────────────────────────
// Return a valid JSON Schema property descriptor: { type, description }

const str  = (desc, extra = {}) => ({ type: 'string',  description: desc, ...extra });
const num  = (desc, extra = {}) => ({ type: 'number',  description: desc, ...extra });
const bool = (desc, extra = {}) => ({ type: 'boolean', description: desc, ...extra });
const obj  = (desc, extra = {}) => ({ type: 'object',  description: desc, ...extra });
const arr  = (desc, items = { type: 'string' }, extra = {}) => ({ type: 'array', description: desc, items, ...extra });

// Reusable pagination property block
const PAGE_PROPS = {
  page:  num('Page number (1-based)'),
  limit: num('Items per page'),
};

// Helper: build a full inputSchema object
const schema = (props = {}, required = []) => ({
  type: 'object',
  properties: props,
  required,
});

// ─── tool registry ──────────────────────────────────────────────────────────

export const TOOLS = [

  // ════════════════════════════════════════════════════════════════════════
  // ABOUT
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'about_system',
    description: 'Returns system information about this Firefly III instance.',
    inputSchema: schema(),
    handler: () => get('/v1/about'),
  },
  {
    name: 'about_user',
    description: 'Returns the currently authenticated user.',
    inputSchema: schema(),
    handler: () => get('/v1/about/user'),
  },
  {
    name: 'cron_run',
    description: 'Triggers Firefly III cron jobs. Requires the CLI token.',
    inputSchema: schema({
      cliToken: str('CLI token from Firefly III administration panel'),
      date:     str('Override date (YYYY-MM-DD)'),
    }, ['cliToken']),
    handler: ({ cliToken, date }) => get(`/v1/cron/${cliToken}`, { date }),
  },

  // ════════════════════════════════════════════════════════════════════════
  // ACCOUNTS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'accounts_list',
    description: 'List all accounts.',
    inputSchema: schema({
      type: str('Filter by type: asset, expense, revenue, liabilities, cash, loan, mortgage, debt'),
      date: str('Balance date (YYYY-MM-DD)'),
      ...PAGE_PROPS,
    }),
    handler: (args) => get('/v1/accounts', args),
  },
  {
    name: 'accounts_get',
    description: 'Get a single account by ID.',
    inputSchema: schema({ id: str('Account ID'), date: str('Balance date (YYYY-MM-DD)') }, ['id']),
    handler: ({ id, date }) => get(`/v1/accounts/${id}`, { date }),
  },
  {
    name: 'accounts_create',
    description: 'Create a new account.',
    inputSchema: schema({
      name:                  str('Account name'),
      type:                  str('Account type: asset, expense, revenue, liabilities, cash, loan, mortgage, debt'),
      iban:                  str('IBAN'),
      bic:                   str('BIC'),
      account_number:        str('Account number'),
      opening_balance:       str('Opening balance amount'),
      opening_balance_date:  str('Opening balance date (YYYY-MM-DD)'),
      order:                 num('Sort order'),
      virtual_balance:       str('Virtual balance'),
      currency_id:           str('Currency ID'),
      currency_code:         str('Currency code (e.g. EUR)'),
      active:                bool('Is active'),
      include_net_worth:     bool('Include in net worth'),
      account_role:          str('Role: defaultAsset, sharedAsset, savingAsset, ccAsset, cashWalletAsset'),
      credit_card_type:      str('Credit card type: monthlyFull'),
      monthly_payment_date:  str('Monthly payment date for credit cards (YYYY-MM-DD)'),
      liability_type:        str('Liability type: loan, debt, mortgage'),
      liability_direction:   str('Liability direction: credit or debit'),
      interest:              str('Interest rate (decimal)'),
      interest_period:       str('Interest period: daily, monthly, yearly'),
      notes:                 str('Notes'),
      latitude:              num('Latitude'),
      longitude:             num('Longitude'),
      zoom_level:            num('Map zoom level'),
    }, ['name', 'type']),
    handler: (body) => post('/v1/accounts', body),
  },
  {
    name: 'accounts_update',
    description: 'Update an existing account.',
    inputSchema: schema({
      id:                   str('Account ID'),
      name:                 str('Account name'),
      type:                 str('Account type'),
      iban:                 str('IBAN'),
      active:               bool('Is active'),
      include_net_worth:    bool('Include in net worth'),
      account_role:         str('Account role'),
      notes:                str('Notes'),
      virtual_balance:      str('Virtual balance'),
      opening_balance:      str('Opening balance'),
      opening_balance_date: str('Opening balance date'),
      currency_id:          str('Currency ID'),
      currency_code:        str('Currency code'),
    }, ['id', 'name', 'type']),
    handler: ({ id, ...body }) => put(`/v1/accounts/${id}`, body),
  },
  {
    name: 'accounts_delete',
    description: 'Permanently delete an account.',
    inputSchema: schema({ id: str('Account ID') }, ['id']),
    handler: ({ id }) => del(`/v1/accounts/${id}`),
  },
  {
    name: 'accounts_transactions',
    description: 'List all transactions for an account.',
    inputSchema: schema({
      id:    str('Account ID'),
      start: str('Start date (YYYY-MM-DD)'),
      end:   str('End date (YYYY-MM-DD)'),
      type:  str('Transaction type: all, withdrawal, deposit, transfer, opening_balance, reconciliation'),
      ...PAGE_PROPS,
    }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/accounts/${id}/transactions`, params),
  },
  {
    name: 'accounts_attachments',
    description: 'List attachments for an account.',
    inputSchema: schema({ id: str('Account ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/accounts/${id}/attachments`, params),
  },
  {
    name: 'accounts_piggy_banks',
    description: 'List piggy banks related to an account.',
    inputSchema: schema({ id: str('Account ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/accounts/${id}/piggy-banks`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // ATTACHMENTS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'attachments_list',
    description: 'List all attachments.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/attachments', args),
  },
  {
    name: 'attachments_create',
    description: 'Store a new attachment metadata record (does not upload the file).',
    inputSchema: schema({
      filename:        str('Filename'),
      attachable_type: str('Parent type: Account, Bill, Budget, Category, Tag, PiggyBank, TransactionJournal'),
      attachable_id:   str('ID of the parent object'),
      title:           str('Title'),
      notes:           str('Notes'),
    }, ['filename', 'attachable_type', 'attachable_id']),
    handler: (body) => post('/v1/attachments', body),
  },
  {
    name: 'attachments_get',
    description: 'Get a single attachment.',
    inputSchema: schema({ id: str('Attachment ID') }, ['id']),
    handler: ({ id }) => get(`/v1/attachments/${id}`),
  },
  {
    name: 'attachments_update',
    description: 'Update an attachment\'s metadata.',
    inputSchema: schema({
      id:       str('Attachment ID'),
      filename: str('Filename'),
      title:    str('Title'),
      notes:    str('Notes'),
    }, ['id']),
    handler: ({ id, ...body }) => put(`/v1/attachments/${id}`, body),
  },
  {
    name: 'attachments_delete',
    description: 'Delete an attachment.',
    inputSchema: schema({ id: str('Attachment ID') }, ['id']),
    handler: ({ id }) => del(`/v1/attachments/${id}`),
  },
  {
    name: 'attachments_download',
    description: 'Download an attachment. Returns base64-encoded file content.',
    inputSchema: schema({ id: str('Attachment ID') }, ['id']),
    handler: async ({ id }) => {
      const buf = await binary(`/v1/attachments/${id}/download`);
      return { base64: Buffer.from(buf).toString('base64') };
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // AUTOCOMPLETE
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'autocomplete_accounts',
    description: 'Autocomplete account names.',
    inputSchema: schema({
      query: str('Search query'),
      limit: num('Max results'),
      date:  str('Optional date context'),
      types: str('Comma-separated account types to filter'),
    }),
    handler: (args) => get('/v1/autocomplete/accounts', args),
  },
  {
    name: 'autocomplete_bills',
    description: 'Autocomplete bill names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/bills', args),
  },
  {
    name: 'autocomplete_budgets',
    description: 'Autocomplete budget names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/budgets', args),
  },
  {
    name: 'autocomplete_categories',
    description: 'Autocomplete category names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/categories', args),
  },
  {
    name: 'autocomplete_currencies',
    description: 'Autocomplete currency names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/currencies', args),
  },
  {
    name: 'autocomplete_currencies_with_code',
    description: 'Autocomplete currencies including ISO code (deprecated by Firefly).',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/currencies-with-code', args),
  },
  {
    name: 'autocomplete_object_groups',
    description: 'Autocomplete object group names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/object-groups', args),
  },
  {
    name: 'autocomplete_piggy_banks',
    description: 'Autocomplete piggy bank names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/piggy-banks', args),
  },
  {
    name: 'autocomplete_piggy_banks_with_balance',
    description: 'Autocomplete piggy banks including current balance.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/piggy-banks-with-balance', args),
  },
  {
    name: 'autocomplete_recurring',
    description: 'Autocomplete recurring transaction titles.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/recurring', args),
  },
  {
    name: 'autocomplete_rule_groups',
    description: 'Autocomplete rule group titles.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/rule-groups', args),
  },
  {
    name: 'autocomplete_rules',
    description: 'Autocomplete rule titles.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/rules', args),
  },
  {
    name: 'autocomplete_subscriptions',
    description: 'Autocomplete subscriptions (alias for bills).',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/subscriptions', args),
  },
  {
    name: 'autocomplete_tags',
    description: 'Autocomplete tag names.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/tags', args),
  },
  {
    name: 'autocomplete_transaction_types',
    description: 'Returns all transaction types for autocomplete (English only).',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/transaction-types', args),
  },
  {
    name: 'autocomplete_transactions',
    description: 'Autocomplete transaction descriptions.',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/transactions', args),
  },
  {
    name: 'autocomplete_transactions_with_id',
    description: 'Autocomplete transactions including their ID (deprecated by Firefly).',
    inputSchema: schema({ query: str('Search query'), limit: num('Max results') }),
    handler: (args) => get('/v1/autocomplete/transactions-with-id', args),
  },

  // ════════════════════════════════════════════════════════════════════════
  // AVAILABLE BUDGETS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'available_budgets_list',
    description: 'List all available budget amounts.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)'), ...PAGE_PROPS }),
    handler: (args) => get('/v1/available-budgets', args),
  },
  {
    name: 'available_budgets_get',
    description: 'Get a single available budget amount.',
    inputSchema: schema({ id: str('Available budget ID') }, ['id']),
    handler: ({ id }) => get(`/v1/available-budgets/${id}`),
  },
  {
    name: 'available_budgets_create',
    description: 'Create a new available budget amount for a period.',
    inputSchema: schema({
      amount:        str('Budget amount'),
      start:         str('Start date (YYYY-MM-DD)'),
      end:           str('End date (YYYY-MM-DD)'),
      currency_id:   str('Currency ID'),
      currency_code: str('Currency code (e.g. EUR)'),
    }, ['amount', 'start', 'end']),
    handler: (body) => post('/v1/available-budgets', body),
  },
  {
    name: 'available_budgets_update',
    description: 'Update an available budget amount.',
    inputSchema: schema({
      id:            str('Available budget ID'),
      amount:        str('Budget amount'),
      start:         str('Start date (YYYY-MM-DD)'),
      end:           str('End date (YYYY-MM-DD)'),
      currency_id:   str('Currency ID'),
      currency_code: str('Currency code'),
    }, ['id', 'amount', 'start', 'end']),
    handler: ({ id, ...body }) => put(`/v1/available-budgets/${id}`, body),
  },
  {
    name: 'available_budgets_delete',
    description: 'Delete an available budget amount.',
    inputSchema: schema({ id: str('Available budget ID') }, ['id']),
    handler: ({ id }) => del(`/v1/available-budgets/${id}`),
  },

  // ════════════════════════════════════════════════════════════════════════
  // BILLS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'bills_list',
    description: 'List all bills.',
    inputSchema: schema({ start: str('Start date'), end: str('End date'), ...PAGE_PROPS }),
    handler: (args) => get('/v1/bills', args),
  },
  {
    name: 'bills_create',
    description: 'Create a new bill (recurring expected expense).',
    inputSchema: schema({
      name:               str('Bill name'),
      amount_min:         str('Minimum expected amount'),
      amount_max:         str('Maximum expected amount'),
      date:               str('First bill date (YYYY-MM-DD)'),
      end_date:           str('End date (YYYY-MM-DD)'),
      extension_date:     str('Extension date (YYYY-MM-DD)'),
      repeat_freq:        str('Frequency: weekly, monthly, quarterly, half-year, yearly'),
      skip:               num('Skip N occurrences'),
      active:             bool('Is active'),
      notes:              str('Notes'),
      object_group_id:    str('Object group ID'),
      object_group_title: str('Object group title (creates group if not found)'),
      currency_id:        str('Currency ID'),
      currency_code:      str('Currency code'),
    }, ['name', 'amount_min', 'amount_max', 'date', 'repeat_freq']),
    handler: (body) => post('/v1/bills', body),
  },
  {
    name: 'bills_get',
    description: 'Get a single bill.',
    inputSchema: schema({ id: str('Bill ID'), start: str('Start date'), end: str('End date') }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/bills/${id}`, params),
  },
  {
    name: 'bills_update',
    description: 'Update an existing bill.',
    inputSchema: schema({
      id:            str('Bill ID'),
      name:          str('Bill name'),
      amount_min:    str('Minimum amount'),
      amount_max:    str('Maximum amount'),
      date:          str('Date (YYYY-MM-DD)'),
      repeat_freq:   str('Frequency: weekly, monthly, quarterly, half-year, yearly'),
      skip:          num('Skip N occurrences'),
      active:        bool('Is active'),
      notes:         str('Notes'),
      currency_id:   str('Currency ID'),
      currency_code: str('Currency code'),
    }, ['id', 'name', 'amount_min', 'amount_max', 'date', 'repeat_freq']),
    handler: ({ id, ...body }) => put(`/v1/bills/${id}`, body),
  },
  {
    name: 'bills_delete',
    description: 'Delete a bill.',
    inputSchema: schema({ id: str('Bill ID') }, ['id']),
    handler: ({ id }) => del(`/v1/bills/${id}`),
  },
  {
    name: 'bills_attachments',
    description: 'List attachments for a bill.',
    inputSchema: schema({ id: str('Bill ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/bills/${id}/attachments`, params),
  },
  {
    name: 'bills_rules',
    description: 'List rules associated with a bill.',
    inputSchema: schema({ id: str('Bill ID') }, ['id']),
    handler: ({ id }) => get(`/v1/bills/${id}/rules`),
  },
  {
    name: 'bills_transactions',
    description: 'List transactions associated with a bill.',
    inputSchema: schema({
      id:    str('Bill ID'),
      start: str('Start date'),
      end:   str('End date'),
      type:  str('Transaction type'),
      ...PAGE_PROPS,
    }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/bills/${id}/transactions`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // BUDGETS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'budgets_list',
    description: 'List all budgets.',
    inputSchema: schema({ start: str('Start date'), end: str('End date'), ...PAGE_PROPS }),
    handler: (args) => get('/v1/budgets', args),
  },
  {
    name: 'budgets_create',
    description: 'Create a new budget.',
    inputSchema: schema({
      name:                       str('Budget name'),
      active:                     bool('Is active'),
      notes:                      str('Notes'),
      order:                      num('Sort order'),
      auto_budget_type:           str('Auto budget type: none, reset, rollover, adjusted'),
      auto_budget_currency_id:    str('Currency ID for auto budget'),
      auto_budget_currency_code:  str('Currency code for auto budget'),
      auto_budget_amount:         str('Auto budget amount'),
      auto_budget_period:         str('Auto budget period: daily, weekly, monthly, quarterly, half-year, yearly'),
    }, ['name']),
    handler: (body) => post('/v1/budgets', body),
  },
  {
    name: 'budgets_get',
    description: 'Get a single budget.',
    inputSchema: schema({ id: str('Budget ID'), start: str('Start date'), end: str('End date') }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/budgets/${id}`, params),
  },
  {
    name: 'budgets_update',
    description: 'Update a budget.',
    inputSchema: schema({
      id:                   str('Budget ID'),
      name:                 str('Budget name'),
      active:               bool('Is active'),
      notes:                str('Notes'),
      order:                num('Sort order'),
      auto_budget_type:     str('Auto budget type: none, reset, rollover, adjusted'),
      auto_budget_amount:   str('Amount'),
      auto_budget_period:   str('Period'),
    }, ['id', 'name']),
    handler: ({ id, ...body }) => put(`/v1/budgets/${id}`, body),
  },
  {
    name: 'budgets_delete',
    description: 'Delete a budget.',
    inputSchema: schema({ id: str('Budget ID') }, ['id']),
    handler: ({ id }) => del(`/v1/budgets/${id}`),
  },
  {
    name: 'budgets_transactions',
    description: 'List all transactions for a budget.',
    inputSchema: schema({
      id:    str('Budget ID'),
      start: str('Start date'),
      end:   str('End date'),
      type:  str('Transaction type'),
      ...PAGE_PROPS,
    }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/budgets/${id}/transactions`, params),
  },
  {
    name: 'budgets_attachments',
    description: 'List attachments for a budget.',
    inputSchema: schema({ id: str('Budget ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/budgets/${id}/attachments`, params),
  },
  {
    name: 'budgets_limits_list',
    description: 'Get all limits for a budget in a date range.',
    inputSchema: schema({
      id:    str('Budget ID'),
      start: str('Start date (YYYY-MM-DD)'),
      end:   str('End date (YYYY-MM-DD)'),
    }, ['id', 'start', 'end']),
    handler: ({ id, ...params }) => get(`/v1/budgets/${id}/limits`, params),
  },
  {
    name: 'budgets_limits_create',
    description: 'Create a new budget limit (spending cap for a period).',
    inputSchema: schema({
      id:            str('Budget ID'),
      start:         str('Start date (YYYY-MM-DD)'),
      end:           str('End date (YYYY-MM-DD)'),
      amount:        str('Limit amount'),
      currency_id:   str('Currency ID'),
      currency_code: str('Currency code'),
      period:        str('Period: daily, weekly, monthly, quarterly, half-year, yearly'),
    }, ['id', 'start', 'end', 'amount']),
    handler: ({ id, ...body }) => post(`/v1/budgets/${id}/limits`, body),
  },
  {
    name: 'budgets_limits_get',
    description: 'Get a single budget limit.',
    inputSchema: schema({ id: str('Budget ID'), limitId: str('Budget limit ID') }, ['id', 'limitId']),
    handler: ({ id, limitId }) => get(`/v1/budgets/${id}/limits/${limitId}`),
  },
  {
    name: 'budgets_limits_update',
    description: 'Update a budget limit.',
    inputSchema: schema({
      id:            str('Budget ID'),
      limitId:       str('Budget limit ID'),
      start:         str('Start date (YYYY-MM-DD)'),
      end:           str('End date (YYYY-MM-DD)'),
      amount:        str('Amount'),
      currency_id:   str('Currency ID'),
      currency_code: str('Currency code'),
    }, ['id', 'limitId', 'start', 'end', 'amount']),
    handler: ({ id, limitId, ...body }) => put(`/v1/budgets/${id}/limits/${limitId}`, body),
  },
  {
    name: 'budgets_limits_delete',
    description: 'Delete a budget limit.',
    inputSchema: schema({ id: str('Budget ID'), limitId: str('Budget limit ID') }, ['id', 'limitId']),
    handler: ({ id, limitId }) => del(`/v1/budgets/${id}/limits/${limitId}`),
  },
  {
    name: 'budgets_limits_transactions',
    description: 'List transactions for a specific budget limit.',
    inputSchema: schema({
      id:      str('Budget ID'),
      limitId: str('Budget limit ID'),
      start:   str('Start date'),
      end:     str('End date'),
      type:    str('Transaction type'),
      ...PAGE_PROPS,
    }, ['id', 'limitId']),
    handler: ({ id, limitId, ...params }) => get(`/v1/budgets/${id}/limits/${limitId}/transactions`, params),
  },
  {
    name: 'budget_limits_list_all',
    description: 'Get ALL budget limits across all budgets for a date range.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/budget-limits', args),
  },
  {
    name: 'budgets_transactions_without',
    description: 'List all transactions that have no budget assigned.',
    inputSchema: schema({ start: str('Start date'), end: str('End date'), type: str('Transaction type'), ...PAGE_PROPS }),
    handler: (args) => get('/v1/budgets/transactions-without-budget', args),
  },

  // ════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'categories_list',
    description: 'List all categories.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/categories', args),
  },
  {
    name: 'categories_create',
    description: 'Create a new category.',
    inputSchema: schema({ name: str('Category name'), notes: str('Notes') }, ['name']),
    handler: (body) => post('/v1/categories', body),
  },
  {
    name: 'categories_get',
    description: 'Get a single category.',
    inputSchema: schema({ id: str('Category ID'), start: str('Start date'), end: str('End date') }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/categories/${id}`, params),
  },
  {
    name: 'categories_update',
    description: 'Update a category.',
    inputSchema: schema({ id: str('Category ID'), name: str('Category name'), notes: str('Notes') }, ['id', 'name']),
    handler: ({ id, ...body }) => put(`/v1/categories/${id}`, body),
  },
  {
    name: 'categories_delete',
    description: 'Delete a category.',
    inputSchema: schema({ id: str('Category ID') }, ['id']),
    handler: ({ id }) => del(`/v1/categories/${id}`),
  },
  {
    name: 'categories_transactions',
    description: 'List transactions for a category.',
    inputSchema: schema({
      id:    str('Category ID'),
      start: str('Start date'),
      end:   str('End date'),
      type:  str('Transaction type'),
      ...PAGE_PROPS,
    }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/categories/${id}/transactions`, params),
  },
  {
    name: 'categories_attachments',
    description: 'List attachments for a category.',
    inputSchema: schema({ id: str('Category ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/categories/${id}/attachments`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'configuration_list',
    description: 'Get all Firefly III configuration values.',
    inputSchema: schema(),
    handler: () => get('/v1/configuration'),
  },
  {
    name: 'configuration_get',
    description: 'Get a single configuration value by key.',
    inputSchema: schema({ name: str('Configuration key') }, ['name']),
    handler: ({ name }) => get(`/v1/configuration/${name}`),
  },
  {
    name: 'configuration_update',
    description: 'Update a configuration value.',
    inputSchema: schema({ name: str('Configuration key'), value: str('New value') }, ['name', 'value']),
    handler: ({ name, value }) => put(`/v1/configuration/${name}`, { value }),
  },

  // ════════════════════════════════════════════════════════════════════════
  // CURRENCIES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'currencies_list',
    description: 'List all currencies.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/currencies', args),
  },
  {
    name: 'currencies_create',
    description: 'Create a new currency.',
    inputSchema: schema({
      name:           str('Currency name'),
      code:           str('ISO 4217 currency code (e.g. EUR)'),
      symbol:         str('Currency symbol (e.g. €)'),
      decimal_places: num('Decimal places (default 2)'),
      enabled:        bool('Is enabled'),
      default:        bool('Set as default currency'),
    }, ['name', 'code', 'symbol']),
    handler: (body) => post('/v1/currencies', body),
  },
  {
    name: 'currencies_get',
    description: 'Get a single currency by code.',
    inputSchema: schema({ code: str('Currency code (e.g. EUR)') }, ['code']),
    handler: ({ code }) => get(`/v1/currencies/${code}`),
  },
  {
    name: 'currencies_update',
    description: 'Update a currency.',
    inputSchema: schema({
      code:           str('Currency code'),
      name:           str('Currency name'),
      symbol:         str('Symbol'),
      decimal_places: num('Decimal places'),
      enabled:        bool('Is enabled'),
      default:        bool('Is default'),
    }, ['code', 'name', 'symbol']),
    handler: ({ code, ...body }) => put(`/v1/currencies/${code}`, body),
  },
  {
    name: 'currencies_delete',
    description: 'Delete a currency.',
    inputSchema: schema({ code: str('Currency code') }, ['code']),
    handler: ({ code }) => del(`/v1/currencies/${code}`),
  },
  {
    name: 'currencies_enable',
    description: 'Enable a currency.',
    inputSchema: schema({ code: str('Currency code') }, ['code']),
    handler: ({ code }) => post(`/v1/currencies/${code}/enable`, {}),
  },
  {
    name: 'currencies_disable',
    description: 'Disable a currency.',
    inputSchema: schema({ code: str('Currency code') }, ['code']),
    handler: ({ code }) => post(`/v1/currencies/${code}/disable`, {}),
  },
  {
    name: 'currencies_make_default',
    description: 'Make a currency the default.',
    inputSchema: schema({ code: str('Currency code') }, ['code']),
    handler: ({ code }) => post(`/v1/currencies/${code}/default`, {}),
  },
  {
    name: 'currencies_accounts',
    description: 'List accounts that use a specific currency.',
    inputSchema: schema({ code: str('Currency code'), type: str('Account type filter'), ...PAGE_PROPS }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/accounts`, params),
  },
  {
    name: 'currencies_available_budgets',
    description: 'List available budgets for a currency.',
    inputSchema: schema({ code: str('Currency code'), ...PAGE_PROPS }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/available-budgets`, params),
  },
  {
    name: 'currencies_bills',
    description: 'List bills denominated in a currency.',
    inputSchema: schema({ code: str('Currency code'), ...PAGE_PROPS }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/bills`, params),
  },
  {
    name: 'currencies_budget_limits',
    description: 'List budget limits for a currency.',
    inputSchema: schema({ code: str('Currency code'), start: str('Start date'), end: str('End date') }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/budget-limits`, params),
  },
  {
    name: 'currencies_recurrences',
    description: 'List recurring transactions for a currency.',
    inputSchema: schema({ code: str('Currency code'), ...PAGE_PROPS }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/recurrences`, params),
  },
  {
    name: 'currencies_rules',
    description: 'List rules for a currency.',
    inputSchema: schema({ code: str('Currency code'), ...PAGE_PROPS }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/rules`, params),
  },
  {
    name: 'currencies_transactions',
    description: 'List transactions for a currency.',
    inputSchema: schema({
      code:  str('Currency code'),
      start: str('Start date'),
      end:   str('End date'),
      type:  str('Transaction type'),
      ...PAGE_PROPS,
    }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/transactions`, params),
  },
  {
    name: 'currencies_exchange_rates',
    description: 'Get exchange rates for a currency.',
    inputSchema: schema({
      code:  str('Currency code'),
      date:  str('Date (YYYY-MM-DD)'),
      start: str('Start date'),
      end:   str('End date'),
      ...PAGE_PROPS,
    }, ['code']),
    handler: ({ code, ...params }) => get(`/v1/currencies/${code}/exchange-rates`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // DATA (export / bulk / destroy)
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'data_export_accounts',
    description: 'Export accounts as CSV. Returns CSV text.',
    inputSchema: schema({ type: str('Account type filter') }),
    handler: async ({ type } = {}) => {
      const buf = await binary('/v1/data/export/accounts', type ? { type } : undefined);
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_bills',
    description: 'Export bills as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/bills');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_budgets',
    description: 'Export budgets as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/budgets');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_categories',
    description: 'Export categories as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/categories');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_piggy_banks',
    description: 'Export piggy banks as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/piggy-banks');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_recurring',
    description: 'Export recurring transactions as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/recurring');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_rules',
    description: 'Export rules as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/rules');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_tags',
    description: 'Export tags as CSV.',
    inputSchema: schema(),
    handler: async () => {
      const buf = await binary('/v1/data/export/tags');
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_export_transactions',
    description: 'Export transactions as CSV for a date range.',
    inputSchema: schema({
      start:    str('Start date (YYYY-MM-DD)'),
      end:      str('End date (YYYY-MM-DD)'),
      accounts: str('Comma-separated account IDs to filter'),
    }, ['start', 'end']),
    handler: async (params) => {
      const buf = await binary('/v1/data/export/transactions', params);
      return { csv: Buffer.from(buf).toString('utf8') };
    },
  },
  {
    name: 'data_purge',
    description: 'Permanently delete all soft-deleted (trashed) records.',
    inputSchema: schema(),
    handler: () => del('/v1/data/purge'),
  },
  {
    name: 'data_destroy',
    description: '⚠️ DESTRUCTIVE: Permanently delete all data of selected types for the current user.',
    inputSchema: schema({
      objects: str('Types to destroy (comma-separated): budgets, bills, piggy_banks, rules, recurring, categories, tags, object_groups, all'),
    }, ['objects']),
    // Firefly expects DELETE /v1/data/destroy with query param
    handler: ({ objects }) => del(`/v1/data/destroy?objects=${encodeURIComponent(objects)}`),
  },
  {
    name: 'data_bulk_update',
    description: 'Bulk update transaction properties matching a search query.',
    inputSchema: schema({
      query:        str('Search query to select transactions'),
      transactions: obj('Object with fields to overwrite on matched transactions'),
    }, ['query']),
    handler: ({ query, transactions }) => post('/v1/data/bulk/transactions', { query, transactions }),
  },

  // ════════════════════════════════════════════════════════════════════════
  // EXCHANGE RATES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'exchange_rates_list',
    description: 'List exchange rates.',
    inputSchema: schema({
      from:  str('From currency code'),
      to:    str('To currency code'),
      date:  str('Date (YYYY-MM-DD)'),
      ...PAGE_PROPS,
    }),
    handler: (args) => get('/v1/exchange-rates', args),
  },

  // ════════════════════════════════════════════════════════════════════════
  // INSIGHT
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'insight_expense_asset',
    description: 'Expense insight grouped by asset account.',
    inputSchema: schema({
      start:    str('Start date (YYYY-MM-DD)'),
      end:      str('End date (YYYY-MM-DD)'),
      accounts: arr('Asset account IDs to include', { type: 'string' }),
    }, ['start', 'end']),
    // accounts[] must be repeated params — handled by buildQS in client
    handler: (params) => get('/v1/insight/expense/asset', params),
  },
  {
    name: 'insight_expense_bill',
    description: 'Expense insight grouped by bill.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/bill', args),
  },
  {
    name: 'insight_expense_budget',
    description: 'Expense insight grouped by budget.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/budget', args),
  },
  {
    name: 'insight_expense_category',
    description: 'Expense insight grouped by category.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/category', args),
  },
  {
    name: 'insight_expense_expense',
    description: 'Expense insight grouped by expense account.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/expense', args),
  },
  {
    name: 'insight_expense_no_bill',
    description: 'Expenses not associated with any bill.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/no-bill', args),
  },
  {
    name: 'insight_expense_no_budget',
    description: 'Expenses not assigned to any budget.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/no-budget', args),
  },
  {
    name: 'insight_expense_no_category',
    description: 'Expenses not assigned to any category.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/no-category', args),
  },
  {
    name: 'insight_expense_no_tag',
    description: 'Expenses with no tag.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/no-tag', args),
  },
  {
    name: 'insight_expense_tag',
    description: 'Expense insight grouped by tag.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/tag', args),
  },
  {
    name: 'insight_expense_total',
    description: 'Total expenses for a date range.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/expense/total', args),
  },
  {
    name: 'insight_income_asset',
    description: 'Income insight grouped by asset account.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/asset', args),
  },
  {
    name: 'insight_income_category',
    description: 'Income insight grouped by category.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/category', args),
  },
  {
    name: 'insight_income_no_category',
    description: 'Income not assigned to any category.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/no-category', args),
  },
  {
    name: 'insight_income_no_tag',
    description: 'Income with no tag.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/no-tag', args),
  },
  {
    name: 'insight_income_revenue',
    description: 'Income insight grouped by revenue account.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/revenue', args),
  },
  {
    name: 'insight_income_tag',
    description: 'Income insight grouped by tag.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/tag', args),
  },
  {
    name: 'insight_income_total',
    description: 'Total income for a date range.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/income/total', args),
  },
  {
    name: 'insight_transfer_asset',
    description: 'Transfer insight grouped by asset account.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/transfer/asset', args),
  },
  {
    name: 'insight_transfer_category',
    description: 'Transfer insight grouped by category.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/transfer/category', args),
  },
  {
    name: 'insight_transfer_no_category',
    description: 'Transfers not assigned to any category.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/transfer/no-category', args),
  },
  {
    name: 'insight_transfer_no_tag',
    description: 'Transfers with no tag.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/transfer/no-tag', args),
  },
  {
    name: 'insight_transfer_tag',
    description: 'Transfer insight grouped by tag.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/transfer/tag', args),
  },
  {
    name: 'insight_transfer_total',
    description: 'Total transfers for a date range.',
    inputSchema: schema({ start: str('Start date (YYYY-MM-DD)'), end: str('End date (YYYY-MM-DD)') }, ['start', 'end']),
    handler: (args) => get('/v1/insight/transfer/total', args),
  },

  // ════════════════════════════════════════════════════════════════════════
  // LINK TYPES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'link_types_list',
    description: 'List all link types.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/link-types', args),
  },
  {
    name: 'link_types_create',
    description: 'Create a new link type.',
    inputSchema: schema({
      name:     str('Link type name'),
      inward:   str('Inward label (e.g. "is paid by")'),
      outward:  str('Outward label (e.g. "pays for")'),
      editable: bool('Is editable by users'),
    }, ['name', 'inward', 'outward']),
    handler: (body) => post('/v1/link-types', body),
  },
  {
    name: 'link_types_get',
    description: 'Get a single link type.',
    inputSchema: schema({ id: str('Link type ID') }, ['id']),
    handler: ({ id }) => get(`/v1/link-types/${id}`),
  },
  {
    name: 'link_types_update',
    description: 'Update a link type.',
    inputSchema: schema({
      id:      str('Link type ID'),
      name:    str('Name'),
      inward:  str('Inward label'),
      outward: str('Outward label'),
    }, ['id', 'name', 'inward', 'outward']),
    handler: ({ id, ...body }) => put(`/v1/link-types/${id}`, body),
  },
  {
    name: 'link_types_delete',
    description: 'Delete a link type.',
    inputSchema: schema({ id: str('Link type ID') }, ['id']),
    handler: ({ id }) => del(`/v1/link-types/${id}`),
  },
  {
    name: 'link_types_transactions',
    description: 'List transactions that use a specific link type.',
    inputSchema: schema({ id: str('Link type ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/link-types/${id}/transactions`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // TRANSACTION LINKS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'transaction_links_list',
    description: 'List all transaction links.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/transaction-links', args),
  },
  {
    name: 'transaction_links_create',
    description: 'Create a link between two transaction journals.',
    inputSchema: schema({
      link_type_id: str('Link type ID'),
      inward_id:    str('Inward transaction journal ID'),
      outward_id:   str('Outward transaction journal ID'),
      notes:        str('Notes'),
    }, ['link_type_id', 'inward_id', 'outward_id']),
    handler: (body) => post('/v1/transaction-links', body),
  },
  {
    name: 'transaction_links_get',
    description: 'Get a single transaction link.',
    inputSchema: schema({ id: str('Transaction link ID') }, ['id']),
    handler: ({ id }) => get(`/v1/transaction-links/${id}`),
  },
  {
    name: 'transaction_links_update',
    description: 'Update a transaction link.',
    inputSchema: schema({
      id:           str('Transaction link ID'),
      link_type_id: str('Link type ID'),
      inward_id:    str('Inward journal ID'),
      outward_id:   str('Outward journal ID'),
      notes:        str('Notes'),
    }, ['id', 'link_type_id', 'inward_id', 'outward_id']),
    handler: ({ id, ...body }) => put(`/v1/transaction-links/${id}`, body),
  },
  {
    name: 'transaction_links_delete',
    description: 'Delete a transaction link.',
    inputSchema: schema({ id: str('Transaction link ID') }, ['id']),
    handler: ({ id }) => del(`/v1/transaction-links/${id}`),
  },

  // ════════════════════════════════════════════════════════════════════════
  // OBJECT GROUPS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'object_groups_list',
    description: 'List all object groups.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/object-groups', args),
  },
  {
    name: 'object_groups_get',
    description: 'Get a single object group.',
    inputSchema: schema({ id: str('Object group ID') }, ['id']),
    handler: ({ id }) => get(`/v1/object-groups/${id}`),
  },
  {
    name: 'object_groups_update',
    description: 'Update an object group.',
    inputSchema: schema({
      id:    str('Object group ID'),
      title: str('Title'),
      order: num('Sort order'),
    }, ['id', 'title']),
    handler: ({ id, ...body }) => put(`/v1/object-groups/${id}`, body),
  },
  {
    name: 'object_groups_delete',
    description: 'Delete an object group.',
    inputSchema: schema({ id: str('Object group ID') }, ['id']),
    handler: ({ id }) => del(`/v1/object-groups/${id}`),
  },
  {
    name: 'object_groups_bills',
    description: 'List bills in an object group.',
    inputSchema: schema({ id: str('Object group ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/object-groups/${id}/bills`, params),
  },
  {
    name: 'object_groups_piggy_banks',
    description: 'List piggy banks in an object group.',
    inputSchema: schema({ id: str('Object group ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/object-groups/${id}/piggy-banks`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // PIGGY BANKS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'piggy_banks_list',
    description: 'List all piggy banks.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/piggy-banks', args),
  },
  {
    name: 'piggy_banks_create',
    description: 'Create a new piggy bank (savings goal).',
    inputSchema: schema({
      name:               str('Piggy bank name'),
      account_id:         str('Asset account ID to attach to'),
      target_amount:      str('Target savings amount'),
      current_amount:     str('Current saved amount'),
      start_date:         str('Start date (YYYY-MM-DD)'),
      target_date:        str('Target date (YYYY-MM-DD)'),
      notes:              str('Notes'),
      object_group_id:    str('Object group ID'),
      object_group_title: str('Object group title'),
    }, ['name', 'account_id']),
    handler: (body) => post('/v1/piggy-banks', body),
  },
  {
    name: 'piggy_banks_get',
    description: 'Get a single piggy bank.',
    inputSchema: schema({ id: str('Piggy bank ID') }, ['id']),
    handler: ({ id }) => get(`/v1/piggy-banks/${id}`),
  },
  {
    name: 'piggy_banks_update',
    description: 'Update a piggy bank.',
    inputSchema: schema({
      id:             str('Piggy bank ID'),
      name:           str('Name'),
      account_id:     str('Asset account ID'),
      target_amount:  str('Target amount'),
      current_amount: str('Current amount'),
      start_date:     str('Start date'),
      target_date:    str('Target date'),
      notes:          str('Notes'),
    }, ['id', 'name', 'account_id']),
    handler: ({ id, ...body }) => put(`/v1/piggy-banks/${id}`, body),
  },
  {
    name: 'piggy_banks_delete',
    description: 'Delete a piggy bank.',
    inputSchema: schema({ id: str('Piggy bank ID') }, ['id']),
    handler: ({ id }) => del(`/v1/piggy-banks/${id}`),
  },
  {
    name: 'piggy_banks_events',
    description: 'List piggy bank events (money added/removed).',
    inputSchema: schema({ id: str('Piggy bank ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/piggy-banks/${id}/events`, params),
  },
  {
    name: 'piggy_banks_attachments',
    description: 'List attachments for a piggy bank.',
    inputSchema: schema({ id: str('Piggy bank ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/piggy-banks/${id}/attachments`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'preferences_list',
    description: 'List all user preferences.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/preferences', args),
  },
  {
    name: 'preferences_create',
    description: 'Create a user preference.',
    inputSchema: schema({
      name: str('Preference name'),
      data: str('Preference value (any JSON-serializable scalar)'),
    }, ['name', 'data']),
    handler: (body) => post('/v1/preferences', body),
  },
  {
    name: 'preferences_get',
    description: 'Get a single user preference by name.',
    inputSchema: schema({ name: str('Preference name') }, ['name']),
    handler: ({ name }) => get(`/v1/preferences/${name}`),
  },
  {
    name: 'preferences_update',
    description: 'Update a user preference.',
    inputSchema: schema({
      name: str('Preference name'),
      data: str('New value'),
    }, ['name', 'data']),
    handler: ({ name, data }) => put(`/v1/preferences/${name}`, { data }),
  },

  // ════════════════════════════════════════════════════════════════════════
  // RECURRENCES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'recurrences_list',
    description: 'List all recurring transactions.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/recurrences', args),
  },
  {
    name: 'recurrences_create',
    description: 'Create a new recurring transaction.',
    inputSchema: schema({
      type:               str('Transaction type: withdrawal, deposit, transfer'),
      title:              str('Title'),
      description:        str('Description'),
      first_date:         str('First occurrence date (YYYY-MM-DD)'),
      repeat_until:       str('Repeat until date (YYYY-MM-DD)'),
      nr_of_repetitions:  num('Number of repetitions (0 = infinite)'),
      apply_rules:        bool('Apply rules to generated transactions'),
      active:             bool('Is active'),
      notes:              str('Notes'),
      repetitions:        arr('Repetition rule objects', { type: 'object' }),
      transactions:       arr('Transaction template objects', { type: 'object' }),
    }, ['type', 'title', 'first_date', 'repetitions', 'transactions']),
    handler: (body) => post('/v1/recurrences', body),
  },
  {
    name: 'recurrences_get',
    description: 'Get a single recurring transaction.',
    inputSchema: schema({ id: str('Recurrence ID') }, ['id']),
    handler: ({ id }) => get(`/v1/recurrences/${id}`),
  },
  {
    name: 'recurrences_update',
    description: 'Update a recurring transaction.',
    inputSchema: schema({
      id:                 str('Recurrence ID'),
      type:               str('Transaction type'),
      title:              str('Title'),
      first_date:         str('First date (YYYY-MM-DD)'),
      repetitions:        arr('Repetition rules', { type: 'object' }),
      transactions:       arr('Transaction templates', { type: 'object' }),
      active:             bool('Is active'),
      apply_rules:        bool('Apply rules'),
      notes:              str('Notes'),
    }, ['id', 'type', 'title', 'first_date', 'repetitions', 'transactions']),
    handler: ({ id, ...body }) => put(`/v1/recurrences/${id}`, body),
  },
  {
    name: 'recurrences_delete',
    description: 'Delete a recurring transaction.',
    inputSchema: schema({ id: str('Recurrence ID') }, ['id']),
    handler: ({ id }) => del(`/v1/recurrences/${id}`),
  },
  {
    name: 'recurrences_transactions',
    description: 'List transactions generated by a recurrence.',
    inputSchema: schema({ id: str('Recurrence ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/recurrences/${id}/transactions`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // RULES
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'rules_list',
    description: 'List all rules.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/rules', args),
  },
  {
    name: 'rules_create',
    description: 'Create a new rule.',
    inputSchema: schema({
      title:            str('Rule title'),
      rule_group_id:    str('Rule group ID'),
      trigger:          str('When to apply: store-journal, update-journal'),
      active:           bool('Is active'),
      strict:           bool('Strict mode (ALL triggers must match)'),
      stop_processing:  bool('Stop processing other rules after this one matches'),
      description:      str('Description'),
      triggers:         arr('Trigger condition objects', { type: 'object' }),
      actions:          arr('Action objects', { type: 'object' }),
    }, ['title', 'rule_group_id', 'trigger', 'triggers', 'actions']),
    handler: (body) => post('/v1/rules', body),
  },
  {
    name: 'rules_get',
    description: 'Get a single rule.',
    inputSchema: schema({ id: str('Rule ID') }, ['id']),
    handler: ({ id }) => get(`/v1/rules/${id}`),
  },
  {
    name: 'rules_update',
    description: 'Update a rule.',
    inputSchema: schema({
      id:               str('Rule ID'),
      title:            str('Title'),
      rule_group_id:    str('Rule group ID'),
      trigger:          str('Trigger: store-journal or update-journal'),
      active:           bool('Is active'),
      strict:           bool('Strict mode'),
      stop_processing:  bool('Stop processing'),
      triggers:         arr('Triggers', { type: 'object' }),
      actions:          arr('Actions', { type: 'object' }),
    }, ['id', 'title', 'rule_group_id', 'trigger', 'triggers', 'actions']),
    handler: ({ id, ...body }) => put(`/v1/rules/${id}`, body),
  },
  {
    name: 'rules_delete',
    description: 'Delete a rule.',
    inputSchema: schema({ id: str('Rule ID') }, ['id']),
    handler: ({ id }) => del(`/v1/rules/${id}`),
  },
  {
    name: 'rules_test',
    description: 'Test a rule against transactions without applying changes (dry run).',
    inputSchema: schema({
      id:    str('Rule ID'),
      start: str('Start date'),
      end:   str('End date'),
      ...PAGE_PROPS,
    }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/rules/${id}/test`, params),
  },
  {
    name: 'rules_fire',
    description: 'Apply a rule to existing transactions.',
    inputSchema: schema({
      id:       str('Rule ID'),
      start:    str('Start date'),
      end:      str('End date'),
      accounts: str('Comma-separated account IDs to limit scope'),
    }, ['id']),
    handler: ({ id, ...params }) => post(`/v1/rules/${id}/trigger`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // RULE GROUPS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'rule_groups_list',
    description: 'List all rule groups.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/rule-groups', args),
  },
  {
    name: 'rule_groups_create',
    description: 'Create a new rule group.',
    inputSchema: schema({
      title:       str('Title'),
      description: str('Description'),
      active:      bool('Is active'),
      order:       num('Sort order'),
    }, ['title']),
    handler: (body) => post('/v1/rule-groups', body),
  },
  {
    name: 'rule_groups_get',
    description: 'Get a single rule group.',
    inputSchema: schema({ id: str('Rule group ID') }, ['id']),
    handler: ({ id }) => get(`/v1/rule-groups/${id}`),
  },
  {
    name: 'rule_groups_update',
    description: 'Update a rule group.',
    inputSchema: schema({
      id:          str('Rule group ID'),
      title:       str('Title'),
      description: str('Description'),
      active:      bool('Is active'),
      order:       num('Sort order'),
    }, ['id', 'title']),
    handler: ({ id, ...body }) => put(`/v1/rule-groups/${id}`, body),
  },
  {
    name: 'rule_groups_delete',
    description: 'Delete a rule group.',
    inputSchema: schema({ id: str('Rule group ID') }, ['id']),
    handler: ({ id }) => del(`/v1/rule-groups/${id}`),
  },
  {
    name: 'rule_groups_rules',
    description: 'List all rules in a rule group.',
    inputSchema: schema({ id: str('Rule group ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/rule-groups/${id}/rules`, params),
  },
  {
    name: 'rule_groups_test',
    description: 'Test all rules in a group (dry run).',
    inputSchema: schema({
      id:    str('Rule group ID'),
      start: str('Start date'),
      end:   str('End date'),
      ...PAGE_PROPS,
    }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/rule-groups/${id}/test`, params),
  },
  {
    name: 'rule_groups_fire',
    description: 'Apply all rules in a group to existing transactions.',
    inputSchema: schema({
      id:       str('Rule group ID'),
      start:    str('Start date'),
      end:      str('End date'),
      accounts: str('Comma-separated account IDs'),
    }, ['id']),
    handler: ({ id, ...params }) => post(`/v1/rule-groups/${id}/trigger`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'search_transactions',
    description: 'Search for transactions using Firefly III query syntax.',
    inputSchema: schema({
      query: str('Search query (supports field:value operators)'),
      type:  str('Transaction type filter'),
      op:    str('Operator for multiple terms: AND (default) or OR'),
      ...PAGE_PROPS,
    }, ['query']),
    handler: (args) => get('/v1/search/transactions', args),
  },
  {
    name: 'search_accounts',
    description: 'Search for accounts.',
    inputSchema: schema({
      query: str('Search query'),
      type:  str('Account type filter'),
      field: str('Field to search: all, name, iban, number, id'),
      ...PAGE_PROPS,
    }, ['query']),
    handler: (args) => get('/v1/search/accounts', args),
  },

  // ════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'summary_basic',
    description: 'Basic financial summary (net worth, income, expenses, balance) for a date range.',
    inputSchema: schema({
      start:         str('Start date (YYYY-MM-DD)'),
      end:           str('End date (YYYY-MM-DD)'),
      currency_code: str('Currency code for conversion'),
    }, ['start', 'end']),
    handler: (args) => get('/v1/summary/basic', args),
  },

  // ════════════════════════════════════════════════════════════════════════
  // TAGS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'tags_list',
    description: 'List all tags.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/tags', args),
  },
  {
    name: 'tags_create',
    description: 'Create a new tag.',
    inputSchema: schema({
      tag:         str('Tag name'),
      date:        str('Date (YYYY-MM-DD)'),
      description: str('Description'),
      latitude:    num('Latitude'),
      longitude:   num('Longitude'),
      zoom_level:  num('Map zoom level'),
    }, ['tag']),
    handler: (body) => post('/v1/tags', body),
  },
  {
    name: 'tags_get',
    description: 'Get a single tag.',
    inputSchema: schema({
      tag:   str('Tag name or ID'),
      start: str('Start date for statistics'),
      end:   str('End date for statistics'),
    }, ['tag']),
    handler: ({ tag, ...params }) => get(`/v1/tags/${tag}`, params),
  },
  {
    name: 'tags_update',
    description: 'Update a tag.',
    inputSchema: schema({
      tag:         str('Tag name or ID (current)'),
      new_tag:     str('New tag name'),
      date:        str('Date'),
      description: str('Description'),
    }, ['tag', 'new_tag']),
    handler: ({ tag, new_tag, ...rest }) => put(`/v1/tags/${tag}`, { tag: new_tag, ...rest }),
  },
  {
    name: 'tags_delete',
    description: 'Delete a tag.',
    inputSchema: schema({ tag: str('Tag name or ID') }, ['tag']),
    handler: ({ tag }) => del(`/v1/tags/${tag}`),
  },
  {
    name: 'tags_transactions',
    description: 'List transactions for a tag.',
    inputSchema: schema({
      tag:   str('Tag name or ID'),
      start: str('Start date'),
      end:   str('End date'),
      type:  str('Transaction type'),
      ...PAGE_PROPS,
    }, ['tag']),
    handler: ({ tag, ...params }) => get(`/v1/tags/${tag}/transactions`, params),
  },
  {
    name: 'tags_attachments',
    description: 'List attachments for a tag.',
    inputSchema: schema({ tag: str('Tag name or ID'), ...PAGE_PROPS }, ['tag']),
    handler: ({ tag, ...params }) => get(`/v1/tags/${tag}/attachments`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'transactions_list',
    description: 'List all transactions.',
    inputSchema: schema({
      start: str('Start date (YYYY-MM-DD)'),
      end:   str('End date (YYYY-MM-DD)'),
      type:  str('Type: all, withdrawal, deposit, transfer, opening_balance, reconciliation'),
      ...PAGE_PROPS,
    }),
    handler: (args) => get('/v1/transactions', args),
  },
  {
    name: 'transactions_create',
    description: 'Create a transaction (single or split). Pass an array of splits in "transactions".',
    inputSchema: schema({
      error_if_duplicate_hash: bool('Return error if a duplicate hash is found'),
      apply_rules:             bool('Apply rules to this transaction'),
      fire_webhooks:           bool('Fire webhooks for this transaction'),
      group_title:             str('Title for a split transaction group'),
      transactions: {
        type: 'array',
        description: 'One or more transaction split objects (required)',
        items: {
          type: 'object',
          properties: {
            type:                  { type: 'string', description: 'withdrawal, deposit, transfer, opening-balance, reconciliation' },
            date:                  { type: 'string', description: 'Date and time (ISO 8601)' },
            amount:                { type: 'string', description: 'Amount (required)' },
            description:           { type: 'string', description: 'Description (required)' },
            source_id:             { type: 'string' },
            source_name:           { type: 'string' },
            destination_id:        { type: 'string' },
            destination_name:      { type: 'string' },
            currency_id:           { type: 'string' },
            currency_code:         { type: 'string' },
            foreign_amount:        { type: 'string' },
            foreign_currency_id:   { type: 'string' },
            foreign_currency_code: { type: 'string' },
            budget_id:             { type: 'string' },
            category_id:           { type: 'string' },
            category_name:         { type: 'string' },
            bill_id:               { type: 'string' },
            bill_name:             { type: 'string' },
            tags:                  { type: 'array', items: { type: 'string' } },
            notes:                 { type: 'string' },
            order:                 { type: 'integer' },
            reconciled:            { type: 'boolean' },
            internal_reference:    { type: 'string' },
            external_id:           { type: 'string' },
            external_url:          { type: 'string' },
            process_date:          { type: 'string' },
            due_date:              { type: 'string' },
            payment_date:          { type: 'string' },
            invoice_date:          { type: 'string' },
            book_date:             { type: 'string' },
            interest_date:         { type: 'string' },
          },
        },
      },
    }, ['transactions']),
    handler: (body) => post('/v1/transactions', body),
  },
  {
    name: 'transactions_get',
    description: 'Get a single transaction group by ID.',
    inputSchema: schema({ id: str('Transaction group ID') }, ['id']),
    handler: ({ id }) => get(`/v1/transactions/${id}`),
  },
  {
    name: 'transactions_update',
    description: 'Update a transaction group.',
    inputSchema: schema({
      id:            str('Transaction group ID'),
      apply_rules:   bool('Apply rules'),
      fire_webhooks: bool('Fire webhooks'),
      group_title:   str('Group title'),
      transactions:  arr('Transaction splits', { type: 'object' }),
    }, ['id', 'transactions']),
    handler: ({ id, ...body }) => put(`/v1/transactions/${id}`, body),
  },
  {
    name: 'transactions_delete',
    description: 'Delete a transaction group and all its splits.',
    inputSchema: schema({ id: str('Transaction group ID') }, ['id']),
    handler: ({ id }) => del(`/v1/transactions/${id}`),
  },
  {
    name: 'transactions_attachments',
    description: 'List attachments for a transaction group.',
    inputSchema: schema({ id: str('Transaction group ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/transactions/${id}/attachments`, params),
  },
  {
    name: 'transaction_journal_get',
    description: 'Get a single transaction journal (individual split).',
    inputSchema: schema({ id: str('Transaction journal ID') }, ['id']),
    handler: ({ id }) => get(`/v1/transaction-journals/${id}`),
  },
  {
    name: 'transaction_journal_delete',
    description: 'Delete a single transaction journal (split) within a group.',
    inputSchema: schema({ id: str('Transaction journal ID') }, ['id']),
    handler: ({ id }) => del(`/v1/transaction-journals/${id}`),
  },
  {
    name: 'transaction_journal_links',
    description: 'List links for a transaction journal.',
    inputSchema: schema({ id: str('Transaction journal ID'), ...PAGE_PROPS }, ['id']),
    handler: ({ id, ...params }) => get(`/v1/transaction-journals/${id}/links`, params),
  },

  // ════════════════════════════════════════════════════════════════════════
  // USERS (admin only)
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'users_list',
    description: 'List all users. Requires admin role.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/users', args),
  },
  {
    name: 'users_create',
    description: 'Create a user. Requires admin role.',
    inputSchema: schema({
      email:        str('Email address'),
      password:     str('Password'),
      role:         str('Role: owner, demo'),
      blocked:      bool('Is blocked'),
      blocked_code: str('Block reason code'),
    }, ['email', 'password']),
    handler: (body) => post('/v1/users', body),
  },
  {
    name: 'users_get',
    description: 'Get a single user. Requires admin role.',
    inputSchema: schema({ id: str('User ID') }, ['id']),
    handler: ({ id }) => get(`/v1/users/${id}`),
  },
  {
    name: 'users_update',
    description: 'Update a user. Requires admin role.',
    inputSchema: schema({
      id:           str('User ID'),
      email:        str('Email'),
      blocked:      bool('Is blocked'),
      blocked_code: str('Block reason'),
      role:         str('Role: owner, demo'),
    }, ['id', 'email']),
    handler: ({ id, ...body }) => put(`/v1/users/${id}`, body),
  },
  {
    name: 'users_delete',
    description: 'Delete a user. Requires admin role.',
    inputSchema: schema({ id: str('User ID') }, ['id']),
    handler: ({ id }) => del(`/v1/users/${id}`),
  },

  // ════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ════════════════════════════════════════════════════════════════════════
  {
    name: 'webhooks_list',
    description: 'List all webhooks.',
    inputSchema: schema({ ...PAGE_PROPS }),
    handler: (args) => get('/v1/webhooks', args),
  },
  {
    name: 'webhooks_create',
    description: 'Create a new webhook.',
    inputSchema: schema({
      active:   bool('Is active'),
      title:    str('Title'),
      trigger:  str('Event trigger: STORE_TRANSACTION, UPDATE_TRANSACTION, DESTROY_TRANSACTION'),
      response: str('Response payload: TRANSACTIONS, ACCOUNTS, none'),
      delivery: str('Delivery format: JSON'),
      url:      str('Callback URL'),
    }, ['active', 'title', 'trigger', 'response', 'delivery', 'url']),
    handler: (body) => post('/v1/webhooks', body),
  },
  {
    name: 'webhooks_get',
    description: 'Get a single webhook.',
    inputSchema: schema({ id: str('Webhook ID') }, ['id']),
    handler: ({ id }) => get(`/v1/webhooks/${id}`),
  },
  {
    name: 'webhooks_update',
    description: 'Update a webhook.',
    inputSchema: schema({
      id:       str('Webhook ID'),
      active:   bool('Is active'),
      title:    str('Title'),
      trigger:  str('Event trigger'),
      response: str('Response payload'),
      delivery: str('Delivery format'),
      url:      str('Callback URL'),
    }, ['id', 'active', 'title', 'url']),
    handler: ({ id, ...body }) => put(`/v1/webhooks/${id}`, body),
  },
  {
    name: 'webhooks_delete',
    description: 'Delete a webhook.',
    inputSchema: schema({ id: str('Webhook ID') }, ['id']),
    handler: ({ id }) => del(`/v1/webhooks/${id}`),
  },
  {
    name: 'webhooks_trigger',
    description: 'Manually trigger a webhook (sends a test message).',
    inputSchema: schema({ id: str('Webhook ID') }, ['id']),
    handler: ({ id }) => post(`/v1/webhooks/${id}/trigger`, {}),
  },
  {
    name: 'webhooks_messages_list',
    description: 'List all messages queued for a webhook.',
    inputSchema: schema({ id: str('Webhook ID') }, ['id']),
    handler: ({ id }) => get(`/v1/webhooks/${id}/messages`),
  },
  {
    name: 'webhooks_messages_get',
    description: 'Get a single webhook message.',
    inputSchema: schema({ id: str('Webhook ID'), messageId: str('Message ID') }, ['id', 'messageId']),
    handler: ({ id, messageId }) => get(`/v1/webhooks/${id}/messages/${messageId}`),
  },
  {
    name: 'webhooks_messages_delete',
    description: 'Delete a webhook message.',
    inputSchema: schema({ id: str('Webhook ID'), messageId: str('Message ID') }, ['id', 'messageId']),
    handler: ({ id, messageId }) => del(`/v1/webhooks/${id}/messages/${messageId}`),
  },
  {
    name: 'webhooks_message_retry',
    description: 'Retry a failed webhook message.',
    inputSchema: schema({ id: str('Webhook ID'), messageId: str('Message ID') }, ['id', 'messageId']),
    handler: ({ id, messageId }) => post(`/v1/webhooks/${id}/messages/${messageId}/retry`, {}),
  },
  {
    name: 'webhooks_message_attempts',
    description: 'List delivery attempts for a webhook message.',
    inputSchema: schema({ id: str('Webhook ID'), messageId: str('Message ID') }, ['id', 'messageId']),
    handler: ({ id, messageId }) => get(`/v1/webhooks/${id}/messages/${messageId}/attempts`),
  },
  {
    name: 'webhooks_message_attempt_get',
    description: 'Get a single delivery attempt.',
    inputSchema: schema({
      id:        str('Webhook ID'),
      messageId: str('Message ID'),
      attemptId: str('Attempt ID'),
    }, ['id', 'messageId', 'attemptId']),
    handler: ({ id, messageId, attemptId }) => get(`/v1/webhooks/${id}/messages/${messageId}/attempts/${attemptId}`),
  },
  {
    name: 'webhooks_message_attempt_delete',
    description: 'Delete a delivery attempt.',
    inputSchema: schema({
      id:        str('Webhook ID'),
      messageId: str('Message ID'),
      attemptId: str('Attempt ID'),
    }, ['id', 'messageId', 'attemptId']),
    handler: ({ id, messageId, attemptId }) => del(`/v1/webhooks/${id}/messages/${messageId}/attempts/${attemptId}`),
  },

];

// O(1) dispatch map — built once at module load
export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.name, t.handler]));
