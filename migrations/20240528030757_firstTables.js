export const up = function knexUp(knex) {
  return Promise.all([
    knex.schema.createTable('users', (table) => {
      table.bigInteger('id').notNullable().primary();
      table.timestamp('created_at', { precision: 6 }).notNullable();
      table.timestamp('updated_at', { precision: 6 }).notNullable();
      table.string('identifier').notNullable();
      table.string('phone').notNullable();
      table.string('name').notNullable();
      table.timestamp('last_message_at', { precision: 6 });
      table.timestamp('last_user_interaction_at', { precision: 6 });
      table.string('last_sender_type');
      table.integer('unread_count').defaultTo(0);
    }),

    knex.schema.createTable('clients', (table) => {
      table.bigInteger('id').notNullable().primary();
      table.timestamp('created_at', { precision: 6 }).notNullable();
      table.timestamp('updated_at', { precision: 6 }).notNullable();
      table.string('name').notNullable();
      table.string('phone_number').notNullable();
    }),

    knex.schema.createTable('agents', (table) => {
      table.bigInteger('id').notNullable().primary();
      table.timestamp('created_at', { precision: 6 }).notNullable();
      table.timestamp('updated_at', { precision: 6 }).notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.text('first_message').notNullable();
      table.text('assistant_instructions').notNullable();
      table.string('openai_assistant_id');
    }),

    knex.schema.createTable('agent_users', (table) => {
      table.bigInteger('id').notNullable().primary();
      table.timestamp('created_at', { precision: 6 }).notNullable();
      table.timestamp('updated_at', { precision: 6 }).notNullable();
      table.bigInteger('user_id').notNullable();
      table.bigInteger('agent_id').notNullable();
      table.string('current_step');
      table.timestamp('final_step_at', { precision: 6 });
      table.jsonb('answers_data').defaultTo('{}').notNullable();
      table.string('openai_thread_id');

      table.foreign('user_id').references('users.id').deferrable('deferred');
      table.foreign('agent_id').references('agents.id').deferrable('deferred');
    }),

    knex.schema.createTable('messages', (table) => {
      table.bigInteger('id').notNullable().primary();
      table.timestamp('created_at', { precision: 6 }).notNullable();
      table.timestamp('updated_at', { precision: 6 }).notNullable();
      table.bigInteger('user_id').notNullable();
      table.bigInteger('client_id').notNullable();
      table.bigInteger('agent_user_id').notNullable();
      table.text('body');
      table.string('message_type').notNullable();
      table.string('template_name');
      table.string('template_locale');
      table.jsonb('template_payload');
      table.string('user_reaction');
      table.timestamp('user_reacted_at', { precision: 6 });
      table.timestamp('user_read_at', { precision: 6 });
      table.timestamp('client_read_at', { precision: 6 });
      table.string('whatsapp_id');
      table.timestamp('whatsapp_created_at', { precision: 6 });

      table.foreign('user_id').references('users.id').deferrable('deferred');
      table.foreign('client_id').references('clients.id').deferrable('deferred');
      table.foreign('agent_user_id').references('agent_users.id').deferrable('deferred');
    }),
  ]);
};

export const down = function knexDown(knex) {
  return Promise.all([
    knex.schema.dropTable('users'),
    knex.schema.dropTable('agents'),
    knex.schema.dropTable('agent_users'),
    knex.schema.dropTable('clients'),
    knex.schema.dropTable('messages'),
  ]);
};
