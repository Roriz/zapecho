exports.up = (knex) => Promise.all([
  knex.schema.createTable('users', (table) => {
    table.increments();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.string('identifier').notNullable();
    table.string('name').notNullable();
    table.timestamp('last_message_at', { precision: 6 });
    table.timestamp('last_user_interaction_at', { precision: 6 });
    table.string('last_sender_type');
    table.integer('unread_count').defaultTo(0);

    table.unique('identifier');
  }),

  knex.schema.createTable('clients', (table) => {
    table.increments();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.string('name').notNullable();
    table.bigInteger('first_workflow_id').notNullable();
    table.string('findable_message');
    table.text('assistant_instructions').notNullable();
    table.string('openai_assistant_id');

    table.foreign('first_workflow_id').references('workflows.id').deferrable('deferred');
  }),

  knex.schema.createTable('workflows', (table) => {
    table.increments();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.string('slug').notNullable();
    table.text('description');
    table.text('first_message').notNullable();

    table.unique('slug');
  }),

  knex.schema.createTable('workflow_users', (table) => {
    table.increments();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.bigInteger('user_id').notNullable();
    table.bigInteger('workflow_id').notNullable();
    table.bigInteger('client_id');
    table.string('status');
    table.timestamp('final_step_at', { precision: 6 });
    table.jsonb('answers_data').defaultTo('{}').notNullable();
    table.string('openai_thread_id');

    table.foreign('user_id').references('users.id').deferrable('deferred');
    table.foreign('workflow_id').references('workflows.id').deferrable('deferred');
    table.foreign('client_id').references('clients.id').deferrable('deferred');
  }),

  knex.schema.createTable('channels', (table) => {
    table.increments();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.enu('type', ['whatsapp', 'telegram']).notNullable();
    table.string('external_id').notNullable();
    table.bigInteger('client_id');

    table.foreign('client_id').references('clients.id').deferrable('deferred');

    table.unique(['type', 'external_id']);
  }),

  knex.schema.createTable('messages', (table) => {
    table.increments();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.bigInteger('user_id').notNullable();
    table.bigInteger('channel_id').notNullable();
    table.bigInteger('client_id');
    table.bigInteger('workflow_user_id');
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
    table.foreign('workflow_user_id').references('workflow_users.id').deferrable('deferred');
    table.foreign('channel_id').references('channels.id').deferrable('deferred');
  }),
]);

exports.down = (knex) => Promise.all([
  knex.raw('DROP TABLE IF EXISTS "users" CASCADE'),
  knex.raw('DROP TABLE IF EXISTS "workflows" CASCADE'),
  knex.raw('DROP TABLE IF EXISTS "workflow_users" CASCADE'),
  knex.raw('DROP TABLE IF EXISTS "clients" CASCADE'),
  knex.raw('DROP TABLE IF EXISTS "messages" CASCADE'),
  knex.raw('DROP TABLE IF EXISTS "channels" CASCADE'),
]);
